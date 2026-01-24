-- Create enum for workflow status
CREATE TYPE public.workflow_status AS ENUM ('pending', 'running', 'completed', 'failed', 'paused');

-- Create enum for step status
CREATE TYPE public.step_status AS ENUM ('pending', 'running', 'completed', 'failed', 'retrying');

-- Create enum for agent types
CREATE TYPE public.agent_type AS ENUM ('planner', 'research', 'execution', 'critic', 'memory');

-- Create workflows table
CREATE TABLE public.workflows (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    goal TEXT NOT NULL,
    status workflow_status NOT NULL DEFAULT 'pending',
    execution_plan JSONB,
    result JSONB,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create workflow_steps table
CREATE TABLE public.workflow_steps (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    agent_type agent_type NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    status step_status NOT NULL DEFAULT 'pending',
    input JSONB,
    output JSONB,
    error_message TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create agent_messages table for inter-agent communication
CREATE TABLE public.agent_messages (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
    step_id UUID REFERENCES public.workflow_steps(id) ON DELETE SET NULL,
    agent_type agent_type NOT NULL,
    message_type TEXT NOT NULL,
    content JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create workflow_memory table for persistent context
CREATE TABLE public.workflow_memory (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(workflow_id, key)
);

-- Create indexes for better query performance
CREATE INDEX idx_workflow_steps_workflow_id ON public.workflow_steps(workflow_id);
CREATE INDEX idx_workflow_steps_status ON public.workflow_steps(status);
CREATE INDEX idx_agent_messages_workflow_id ON public.agent_messages(workflow_id);
CREATE INDEX idx_agent_messages_step_id ON public.agent_messages(step_id);
CREATE INDEX idx_workflow_memory_workflow_id ON public.workflow_memory(workflow_id);
CREATE INDEX idx_workflows_status ON public.workflows(status);
CREATE INDEX idx_workflows_created_at ON public.workflows(created_at DESC);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_workflows_updated_at
    BEFORE UPDATE ON public.workflows
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workflow_memory_updated_at
    BEFORE UPDATE ON public.workflow_memory
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.workflows;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workflow_steps;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_messages;

-- Note: No RLS policies as auth is deferred (single-user for now)
-- These tables are public for MVP, will add RLS when auth is implemented