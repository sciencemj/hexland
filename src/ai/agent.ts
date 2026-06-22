import type { State, Action, PlayerId, ResourceMap } from '../engine/types';
import { RESOURCES, emptyResources } from '../engine/types';
import { requiredDiscardCount } from '../engine/rules';

export interface Agent {
  decide(state: State, legal: Action[], playerId: PlayerId): Action | Promise<Action>;
}

export function makeDiscard(state: State, playerId: PlayerId): ResourceMap {
  let need = requiredDiscardCount(state, playerId);
  const have = { ...state.players[playerId]!.resources };
  const out = emptyResources();
  // shed from the most-abundant resource downward (deterministic by RESOURCES order on ties)
  while (need > 0) {
    let pick: typeof RESOURCES[number] | null = null;
    let max = 0;
    for (const r of RESOURCES) if (have[r] - out[r] > max) { max = have[r] - out[r]; pick = r; }
    if (!pick) break;
    out[pick] += 1; need -= 1;
  }
  return out;
}

export const randomAgent: Agent = {
  decide(state, legal, playerId) {
    const disc = legal.find(a => a.type === 'discard');
    if (disc) return { type: 'discard', resources: makeDiscard(state, playerId) };
    return legal[0]!;
  },
};

// registry and getAgent live in registry.ts to avoid the agent ↔ heuristic import cycle
