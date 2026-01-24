// Workflow and Agent Types for the Agentic Workflow Platform

export type WorkflowStatus = 'pending' | 'running' | 'completed' | 'failed' | 'paused';
export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'retrying';
export type AgentType = 'planner' | 'research' | 'execution' | 'critic' | 'memory';

export interface Workflow {
  id: string;
  goal: string;
  status: WorkflowStatus;
  execution_plan: ExecutionPlan | null;
  result: Record<string, unknown> | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface WorkflowStep {
  id: string;
  workflow_id: string;
  step_number: number;
  agent_type: AgentType;
  name: string;
  description: string | null;
  status: StepStatus;
  input: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  error_message: string | null;
  retry_count: number;
  max_retries: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface AgentMessage {
  id: string;
  workflow_id: string;
  step_id: string | null;
  agent_type: AgentType;
  message_type: string;
  content: Record<string, unknown>;
  created_at: string;
}

export interface WorkflowMemory {
  id: string;
  workflow_id: string;
  key: string;
  value: Record<string, unknown>;
  updated_at: string;
}

export interface ExecutionPlan {
  goal: string;
  summary: string;
  steps: PlannedStep[];
  estimated_duration: string;
}

export interface PlannedStep {
  step_number: number;
  agent_type: AgentType;
  name: string;
  description: string;
  dependencies: number[];
  expected_output: string;
}

export interface AgentInput {
  workflow_id: string;
  step_id: string;
  goal: string;
  context: Record<string, unknown>;
  previous_outputs: Record<string, unknown>[];
}

export interface AgentOutput {
  success: boolean;
  data: Record<string, unknown>;
  message: string;
  error?: string;
}

export interface AgentConfig {
  type: AgentType;
  name: string;
  description: string;
  icon: string;
  color: string;
  usesAI: boolean;
}

export const AGENT_CONFIGS: Record<AgentType, AgentConfig> = {
  planner: { type: 'planner', name: 'Planner', description: 'Creates execution plans from goals', icon: 'Brain', color: 'text-purple-500', usesAI: true },
  research: { type: 'research', name: 'Research', description: 'Gathers relevant information', icon: 'Search', color: 'text-blue-500', usesAI: false },
  execution: { type: 'execution', name: 'Execution', description: 'Performs concrete actions', icon: 'Zap', color: 'text-amber-500', usesAI: false },
  critic: { type: 'critic', name: 'Critic', description: 'Validates outputs for quality', icon: 'CheckCircle', color: 'text-green-500', usesAI: true },
  memory: { type: 'memory', name: 'Memory', description: 'Stores context and results', icon: 'Database', color: 'text-slate-500', usesAI: false },
};

// Helper to convert DB row to typed Workflow
export function toWorkflow(row: Record<string, unknown>): Workflow {
  return row as unknown as Workflow;
}

export function toWorkflowStep(row: Record<string, unknown>): WorkflowStep {
  return row as unknown as WorkflowStep;
}

export function toAgentMessage(row: Record<string, unknown>): AgentMessage {
  return row as unknown as AgentMessage;
}
