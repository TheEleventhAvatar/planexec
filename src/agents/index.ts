// Agent Registry - Factory for creating agent instances

import type { AgentType } from '@/types/workflow';
import type { IAgent } from './base-agent';
import { PlannerAgent } from './planner-agent';
import { ResearchAgent } from './research-agent';
import { ExecutionAgent } from './execution-agent';
import { CriticAgent } from './critic-agent';
import { MemoryAgent } from './memory-agent';

const agentRegistry: Record<AgentType, new () => IAgent> = {
  planner: PlannerAgent,
  research: ResearchAgent,
  execution: ExecutionAgent,
  critic: CriticAgent,
  memory: MemoryAgent,
};

export function createAgent(type: AgentType): IAgent {
  const AgentClass = agentRegistry[type];
  if (!AgentClass) {
    throw new Error(`Unknown agent type: ${type}`);
  }
  return new AgentClass();
}

export { PlannerAgent, ResearchAgent, ExecutionAgent, CriticAgent, MemoryAgent };
export type { IAgent } from './base-agent';
