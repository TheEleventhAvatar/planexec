// Critic Agent - Validates outputs using AI

import { BaseAgent } from './base-agent';
import type { AgentInput, AgentOutput, AgentType } from '@/types/workflow';
import { supabase } from '@/integrations/supabase/client';

export class CriticAgent extends BaseAgent {
  type: AgentType = 'critic';

  async execute(input: AgentInput): Promise<AgentOutput> {
    await this.updateStepStatus(input.step_id, 'running');
    await this.logMessage(input.workflow_id, input.step_id, 'started', {
      message: 'Starting validation phase',
    });

    try {
      // Gather all previous outputs for validation
      const previousOutputs = input.previous_outputs || [];
      
      // Call the edge function for AI validation
      const { data, error } = await supabase.functions.invoke('agent-critic', {
        body: {
          goal: input.goal,
          outputs: previousOutputs,
          context: input.context,
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to validate outputs');
      }

      const validation = data?.validation;
      
      if (!validation) {
        throw new Error('AI returned an invalid validation response');
      }

      await this.logMessage(input.workflow_id, input.step_id, 'validation', {
        message: `Validation complete: ${validation.passed ? 'PASSED' : 'NEEDS REVIEW'}`,
        validation,
      });

      // Store validation result in memory
      await this.setMemory(input.workflow_id, 'validation_result', validation);

      await this.updateStepStatus(input.step_id, 'completed', { validation });

      return {
        success: true,
        data: { validation },
        message: validation.passed 
          ? `Validation passed with score ${validation.score}/100`
          : `Validation flagged issues: ${validation.issues?.length || 0} items`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Validation failed';
      
      await this.logMessage(input.workflow_id, input.step_id, 'error', { error: errorMessage });
      await this.updateStepStatus(input.step_id, 'failed', undefined, errorMessage);

      return {
        success: false,
        data: {},
        message: 'Validation phase failed',
        error: errorMessage,
      };
    }
  }
}
