// src/engine/legal.ts
import type { State, PlayerId, Action } from './types';
import { emptyResources } from './types';
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

function playActions(state: State, playerId: PlayerId): Action[] {
  const pending = state.pending;
  if (pending) {
    if (pending.kind === 'discard')
      return pending.remaining.includes(playerId) ? [{ type: 'discard', resources: emptyResources() }] : [];
    if (pending.kind === 'robber')
      return playerId === pending.mover ? robberActions(state) : [];
    if (pending.kind === 'tradeOffer')
      return playerId === pending.to
        ? [{ type: 'tradeRespond', accept: true }, { type: 'tradeRespond', accept: false }]
        : [];
  }
  if (playerId !== state.currentPlayer) return [];
  if (!state.turn.hasRolled) return [{ type: 'rollDice' }, ...devCardActions(state, playerId)];
  return mainActions(state, playerId);
}

// builder stubs — implemented by later tasks:
function robberActions(_state: State): Action[] { return []; }           // Task 10
function devCardActions(_state: State, _playerId: PlayerId): Action[] { return []; } // Task 12
function mainActions(_state: State, _playerId: PlayerId): Action[] { return []; }    // Tasks 11,12,15,16
