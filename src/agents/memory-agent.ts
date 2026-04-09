// Memory Agent - Manages workflow context and stores final results

import { BaseAgent } from './base-agent';
import type { AgentInput, AgentOutput, AgentType } from '@/types/workflow';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export class MemoryAgent extends BaseAgent {
  type: AgentType = 'memory';

  async execute(input: AgentInput): Promise<AgentOutput> {
    await this.updateStepStatus(input.step_id, 'running');
    await this.logMessage(input.workflow_id, input.step_id, 'started', {
      message: 'Consolidating workflow results and storing in memory',
    });

    try {
      // Simulate brief processing
      await new Promise(resolve => setTimeout(resolve, 500));

      // Gather all outputs from previous steps
      const { data: allSteps } = await supabase
        .from('workflow_steps')
        .select('step_number, agent_type, name, output')
        .eq('workflow_id', input.workflow_id)
        .not('output', 'is', null)
        .order('step_number');

      // Retrieve key memory items
      const { data: memoryItems } = await supabase
        .from('workflow_memory')
        .select('key, value')
        .eq('workflow_id', input.workflow_id);

      // Consolidate final result
      const outputs: Record<string, Json> = {};
      allSteps?.forEach(step => {
        outputs[`step_${step.step_number}_${step.agent_type}`] = {
          name: step.name,
          output: step.output,
        } as Json;
      });

      const memory: Record<string, Json> = {};
      memoryItems?.forEach(item => {
        memory[item.key] = item.value;
      });

      const consolidatedResult = {
        goal: input.goal,
        completed_at: new Date().toISOString(),
        steps_completed: allSteps?.length || 0,
        outputs,
        memory,
      };

      // Store the consolidated result
      await this.setMemory(input.workflow_id, 'final_result', consolidatedResult);

      // Also update the workflow record with the result
      await supabase
        .from('workflows')
        .update({ result: consolidatedResult as Json })
        .eq('id', input.workflow_id);

      await this.logMessage(input.workflow_id, input.step_id, 'completed', {
        message: 'All results consolidated and stored',
        steps_stored: allSteps?.length || 0,
        memory_keys: memoryItems?.map(m => m.key) || [],
      });

      await this.updateStepStatus(input.step_id, 'completed', { 
        consolidated: true,
        steps_processed: allSteps?.length || 0,
      });

      return {
        success: true,
        data: { result: consolidatedResult },
        message: `Memory consolidated: ${allSteps?.length || 0} step outputs stored`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Memory consolidation failed';
      
      await this.logMessage(input.workflow_id, input.step_id, 'error', { error: errorMessage });
      await this.updateStepStatus(input.step_id, 'failed', undefined, errorMessage);

      return {
        success: false,
        data: {},
        message: 'Failed to build memory',
        error: errorMessage,
      };
    }
  }
}
