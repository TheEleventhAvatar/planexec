import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { createOrchestrator } from '@/lib/orchestrator';
import type { Workflow, WorkflowStep, AgentMessage } from '@/types/workflow';
import { toWorkflow, toWorkflowStep, toAgentMessage } from '@/types/workflow';

export function useWorkflow(workflowId: string | null) {
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!workflowId) { setWorkflow(null); setSteps([]); setMessages([]); setLoading(false); return; }

    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: wf } = await supabase.from('workflows').select('*').eq('id', workflowId).single();
        if (wf) setWorkflow(toWorkflow(wf));
        const { data: st } = await supabase.from('workflow_steps').select('*').eq('workflow_id', workflowId).order('step_number');
        setSteps((st || []).map(toWorkflowStep));
        const { data: msg } = await supabase.from('agent_messages').select('*').eq('workflow_id', workflowId).order('created_at');
        setMessages((msg || []).map(toAgentMessage));
      } catch (err) { setError(err instanceof Error ? err.message : 'Failed to fetch'); }
      setLoading(false);
    };
    fetchData();
  }, [workflowId]);

  useEffect(() => {
    if (!workflowId) return;
    const channel = supabase.channel(`workflow-${workflowId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workflows', filter: `id=eq.${workflowId}` }, (p) => { if (p.eventType === 'UPDATE') setWorkflow(toWorkflow(p.new)); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workflow_steps', filter: `workflow_id=eq.${workflowId}` }, (p) => {
        if (p.eventType === 'INSERT') setSteps(prev => [...prev, toWorkflowStep(p.new)].sort((a, b) => a.step_number - b.step_number));
        else if (p.eventType === 'UPDATE') setSteps(prev => prev.map(s => s.id === p.new.id ? toWorkflowStep(p.new) : s));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'agent_messages', filter: `workflow_id=eq.${workflowId}` }, (p) => { setMessages(prev => [...prev, toAgentMessage(p.new)]); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [workflowId]);

  return { workflow, steps, messages, loading, error };
}

export function useWorkflows() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('workflows').select('*').order('created_at', { ascending: false }).limit(50).then(({ data }) => { setWorkflows((data || []).map(toWorkflow)); setLoading(false); });
    const channel = supabase.channel('all-workflows')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workflows' }, (p) => {
        if (p.eventType === 'INSERT') setWorkflows(prev => [toWorkflow(p.new), ...prev]);
        else if (p.eventType === 'UPDATE') setWorkflows(prev => prev.map(w => w.id === p.new.id ? toWorkflow(p.new) : w));
        else if (p.eventType === 'DELETE') setWorkflows(prev => prev.filter(w => w.id !== p.old.id));
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const startWorkflow = useCallback(async (goal: string) => createOrchestrator().startWorkflow(goal), []);
  const deleteWorkflow = useCallback(async (id: string) => { await supabase.from('workflows').delete().eq('id', id); }, []);

  return { workflows, loading, startWorkflow, deleteWorkflow };
}
