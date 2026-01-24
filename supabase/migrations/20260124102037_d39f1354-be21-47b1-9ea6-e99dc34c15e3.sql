-- Enable RLS on all tables
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_memory ENABLE ROW LEVEL SECURITY;

-- For MVP (auth deferred), allow all access - will be tightened when auth is added
-- These policies allow anyone to read/write since we don't have user context yet

CREATE POLICY "Allow all access to workflows" ON public.workflows
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all access to workflow_steps" ON public.workflow_steps
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all access to agent_messages" ON public.agent_messages
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all access to workflow_memory" ON public.workflow_memory
    FOR ALL USING (true) WITH CHECK (true);

-- Fix the function search path issue
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;