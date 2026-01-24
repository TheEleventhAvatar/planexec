import { supabase } from '@/integrations/supabase/client';
import { createAgent } from '@/agents';
import type { Workflow, WorkflowStep, ExecutionPlan, PlannedStep, AgentType, AgentInput } from '@/types/workflow';
import { toWorkflow } from '@/types/workflow';
import type { Json } from '@/integrations/supabase/types';

export class WorkflowOrchestrator {
  private abortController: AbortController | null = null;

  async startWorkflow(goal: string): Promise<string> {
    const { data: workflow, error } = await supabase.from('workflows').insert({ goal, status: 'running', started_at: new Date().toISOString() }).select().single();
    if (error || !workflow) throw new Error(`Failed to create workflow: ${error?.message}`);

    await supabase.from('workflow_steps').insert({ workflow_id: workflow.id, step_number: 0, agent_type: 'planner' as AgentType, name: 'Create Execution Plan', description: 'Breaking down the goal into actionable steps' });
    this.executeWorkflow(workflow.id, goal).catch(console.error);
    return workflow.id;
  }

  private async executeWorkflow(workflowId: string, goal: string): Promise<void> {
    this.abortController = new AbortController();
    try {
      const planResult = await this.runPlannerStep(workflowId, goal);
      if (!planResult.success || !planResult.plan) { await this.failWorkflow(workflowId, 'Failed to create execution plan'); return; }

      await supabase.from('workflows').update({ execution_plan: planResult.plan as unknown as Json }).eq('id', workflowId);
      await this.createStepsFromPlan(workflowId, planResult.plan);

      const { data: steps } = await supabase.from('workflow_steps').select('*').eq('workflow_id', workflowId).gt('step_number', 0).order('step_number');
      if (!steps?.length) { await this.failWorkflow(workflowId, 'No steps to execute'); return; }

      const previousOutputs: Record<string, unknown>[] = [];
      for (const step of steps) {
        if (this.abortController?.signal.aborted) { await supabase.from('workflows').update({ status: 'paused' }).eq('id', workflowId); return; }
        const result = await this.executeStep(step as unknown as WorkflowStep, goal, previousOutputs);
        if (!result.success) {
          if (step.retry_count < (step.max_retries || 3)) { await this.retryStep(step as unknown as WorkflowStep, goal, previousOutputs); }
          else { await this.failWorkflow(workflowId, `Step "${step.name}" failed`); return; }
        } else if (result.output) previousOutputs.push(result.output);
      }
      await supabase.from('workflows').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', workflowId);
    } catch (e) { await this.failWorkflow(workflowId, e instanceof Error ? e.message : 'Unknown error'); }
  }

  private async runPlannerStep(workflowId: string, goal: string): Promise<{ success: boolean; plan?: ExecutionPlan }> {
    const { data: step } = await supabase.from('workflow_steps').select('*').eq('workflow_id', workflowId).eq('step_number', 0).single();
    if (!step) return { success: false };
    const agent = createAgent('planner');
    const result = await agent.execute({ workflow_id: workflowId, step_id: step.id, goal, context: {}, previous_outputs: [] });
    return { success: result.success, plan: result.data?.plan as ExecutionPlan | undefined };
  }

  private async createStepsFromPlan(workflowId: string, plan: ExecutionPlan): Promise<void> {
    const steps = plan.steps.map((s: PlannedStep) => ({ workflow_id: workflowId, step_number: s.step_number, agent_type: s.agent_type, name: s.name, description: s.description, input: { expected_output: s.expected_output } as Json }));
    await supabase.from('workflow_steps').insert(steps);
  }

  private async executeStep(step: WorkflowStep, goal: string, previousOutputs: Record<string, unknown>[]): Promise<{ success: boolean; output?: Record<string, unknown> }> {
    const agent = createAgent(step.agent_type);
    const result = await agent.execute({ workflow_id: step.workflow_id, step_id: step.id, goal, context: { step_name: step.name, step_description: step.description }, previous_outputs: previousOutputs });
    return { success: result.success, output: result.data };
  }

  private async retryStep(step: WorkflowStep, goal: string, previousOutputs: Record<string, unknown>[]): Promise<void> {
    await supabase.from('workflow_steps').update({ status: 'retrying', retry_count: step.retry_count + 1 }).eq('id', step.id);
    await new Promise(r => setTimeout(r, Math.min(1000 * Math.pow(2, step.retry_count), 10000)));
    await this.executeStep(step, goal, previousOutputs);
  }

  private async failWorkflow(workflowId: string, errorMessage: string): Promise<void> {
    await supabase.from('workflows').update({ status: 'failed', error_message: errorMessage, completed_at: new Date().toISOString() }).eq('id', workflowId);
  }

  abort(): void { this.abortController?.abort(); }
}

export function createOrchestrator(): WorkflowOrchestrator { return new WorkflowOrchestrator(); }
