// src/engine/legal.ts
import type { State, PlayerId, Action } from './types';
import { setupSettlementSpots, roadSpotsFromNode } from './rules';

export function getLegalActions(state: State, playerId: PlayerId): Action[] {
  if (state.winner !== null) return [];
  if (state.phase === 'setup') return setupActions(state, playerId);
  if (state.phase === 'play') return playActions(state, playerId); // extended in later tasks
  return [];
}

function setupActions(state: State, playerId: PlayerId): Action[] {
  const setup = state.setup!;
  const placer = setup.order[setup.index]!;
  if (playerId !== placer) return [];
  if (setup.needRoadFrom === null)
    return setupSettlementSpots(state).map(node => ({ type: 'setupSettlement', node }));
  return roadSpotsFromNode(state, setup.needRoadFrom).map(edge => ({ type: 'setupRoad', edge }));
}

// Placeholder; Tasks 9–16 replace this body.
function playActions(_state: State, _playerId: PlayerId): Action[] {
  return [];
}
