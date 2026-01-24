// Base Agent Interface and Abstract Implementation

import type { AgentInput, AgentOutput, AgentType } from '@/types/workflow';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export interface IAgent {
  type: AgentType;
  execute(input: AgentInput): Promise<AgentOutput>;
}

export abstract class BaseAgent implements IAgent {
  abstract type: AgentType;
  abstract execute(input: AgentInput): Promise<AgentOutput>;

  protected async logMessage(
    workflowId: string,
    stepId: string | null,
    messageType: string,
    content: Record<string, unknown>
  ): Promise<void> {
    await supabase.from('agent_messages').insert({
      workflow_id: workflowId,
      step_id: stepId,
      agent_type: this.type,
      message_type: messageType,
      content: content as Json,
    });
  }

  protected async updateStepStatus(
    stepId: string,
    status: 'running' | 'completed' | 'failed' | 'retrying',
    output?: Record<string, unknown>,
    errorMessage?: string
  ): Promise<void> {
    const updateData: Record<string, unknown> = { status };
    
    if (status === 'running') {
      updateData.started_at = new Date().toISOString();
    }
    
    if (status === 'completed' || status === 'failed') {
      updateData.completed_at = new Date().toISOString();
    }
    
    if (output) {
      updateData.output = output as Json;
    }
    
    if (errorMessage) {
      updateData.error_message = errorMessage;
    }

    await supabase.from('workflow_steps').update(updateData).eq('id', stepId);
  }

  protected async getMemory(workflowId: string, key: string): Promise<Record<string, unknown> | null> {
    const { data } = await supabase
      .from('workflow_memory')
      .select('value')
      .eq('workflow_id', workflowId)
      .eq('key', key)
      .single();
    
    return data?.value as Record<string, unknown> | null;
  }

  protected async setMemory(workflowId: string, key: string, value: Record<string, unknown>): Promise<void> {
    await supabase.from('workflow_memory').upsert({
      workflow_id: workflowId,
      key,
      value: value as Json,
    }, { onConflict: 'workflow_id,key' });
  }
}
