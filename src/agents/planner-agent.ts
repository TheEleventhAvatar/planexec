// Planner Agent - Uses AI to break down goals into execution plans

import { BaseAgent } from './base-agent';
import type { AgentInput, AgentOutput, AgentType } from '@/types/workflow';
import { supabase } from '@/integrations/supabase/client';

export class PlannerAgent extends BaseAgent {
  type: AgentType = 'planner';

  async execute(input: AgentInput): Promise<AgentOutput> {
    await this.updateStepStatus(input.step_id, 'running');
    await this.logMessage(input.workflow_id, input.step_id, 'started', {
      message: `Starting to plan workflow for goal: "${input.goal}"`,
    });

    try {
      // Call the edge function for AI planning
      const { data, error } = await supabase.functions.invoke('agent-planner', {
        body: { goal: input.goal, context: input.context },
      });

      if (error) {
        throw new Error(error.message || 'Failed to generate plan');
      }

      const plan = data?.plan;
      
      if (!plan || !plan.steps || plan.steps.length === 0) {
        throw new Error('AI returned an invalid or empty plan');
      }

      await this.logMessage(input.workflow_id, input.step_id, 'completed', {
        message: `Generated execution plan with ${plan.steps.length} steps`,
        plan,
      });

      await this.updateStepStatus(input.step_id, 'completed', { plan });

      return {
        success: true,
        data: { plan },
        message: `Successfully created execution plan with ${plan.steps.length} steps`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      await this.logMessage(input.workflow_id, input.step_id, 'error', {
        error: errorMessage,
      });
      
      await this.updateStepStatus(input.step_id, 'failed', undefined, errorMessage);

      return {
        success: false,
        data: {},
        message: 'Failed to create execution plan',
        error: errorMessage,
      };
    }
  }
}
