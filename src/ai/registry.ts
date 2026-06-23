// src/ai/registry.ts
// Separated from agent.ts to avoid the agent ↔ heuristic import cycle.
import type { Agent } from './agent';
import { randomAgent } from './agent';
import { heuristicAgent } from './heuristic';
import { makeLookaheadAgent } from './lookahead';
import type { Difficulty } from '../engine/types';

export const registry: Record<Difficulty, Agent> = {
  easy: randomAgent,            // baseline: first legal / random discard
  medium: heuristicAgent,       // greedy heuristic
  hard: makeLookaheadAgent(),   // 1-ply lookahead over a board evaluation
};

export const getAgent = (difficulty: Difficulty): Agent => registry[difficulty] ?? registry.medium;
