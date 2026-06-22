// src/ai/registry.ts
// Separated from agent.ts to avoid the agent ↔ heuristic import cycle.
// Both agent.ts and heuristic.ts are fully initialized before this module runs.
import type { Agent } from './agent';
import { heuristicAgent } from './heuristic';

export const registry: Record<'medium', Agent> = { medium: heuristicAgent };
export const getAgent = (difficulty: 'medium'): Agent => registry[difficulty];
