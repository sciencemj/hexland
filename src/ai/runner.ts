// src/ai/runner.ts
import type { State } from '../engine/types';
import { getLegalActions, nextActor } from '../engine/legal';
import { applyAction } from '../engine/reduce';
import type { Agent } from './agent';

export function runToCompletion(state: State, agents: Agent[], maxSteps = 50000): State {
  let s = state;
  for (let step = 0; step < maxSteps; step++) {
    const actor = nextActor(s);
    if (actor === null) break;
    const legal = getLegalActions(s, actor);
    if (legal.length === 0) throw new Error(`no legal actions for actor ${actor} in phase ${s.phase}`);
    const action = agents[actor]!.decide(s, legal, actor);
    if (action instanceof Promise) throw new Error('runToCompletion expects synchronous agents');
    s = applyAction(s, actor, action);
  }
  return s;
}
