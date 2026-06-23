// src/engine/legal.ts
import type { State, PlayerId, Action } from './types';
import { emptyResources, RESOURCES } from './types';
import { setupSettlementSpots, roadSpotsFromNode, adjacentStealTargets, roadPlacements, settlementPlacements, cityPlacements, hasPlayableDev, bankRatioFor } from './rules';
import { COSTS, canAfford } from './helpers';

export function nextActor(state: State): PlayerId | null {
  if (state.winner !== null) return null;
  const pend = state.pending;
  if (pend) {
    if (pend.kind === 'discard') return pend.remaining[0] ?? null;
    if (pend.kind === 'robber') return pend.mover;
    if (pend.kind === 'tradeOffer') return pend.to;
  }
  if (state.phase === 'setup') return state.setup!.order[state.setup!.index] ?? null;
  if (state.phase === 'play') return state.currentPlayer;
  return null;
}

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
    if (pending.kind === 'tradeOffer') {
      if (playerId !== pending.to) return [];
      // only offer "accept" when the responder can actually pay the requested cards
      const canAccept = RESOURCES.every(r => state.players[playerId]!.resources[r] >= pending.want[r]);
      return canAccept
        ? [{ type: 'tradeRespond', accept: true }, { type: 'tradeRespond', accept: false }]
        : [{ type: 'tradeRespond', accept: false }];
    }
    return [];
  }
  if (playerId !== state.currentPlayer) return [];
  if (!state.turn.hasRolled) return [{ type: 'rollDice' }, ...devCardActions(state, playerId)];
  return mainActions(state, playerId);
}

// builder stubs — implemented by later tasks:
function robberActions(state: State): Action[] {
  const mover = (state.pending as { kind: 'robber'; mover: PlayerId }).mover;
  const out: Action[] = [];
  for (const hex of state.board.hexes) {
    if (hex.id === state.board.robberHex) continue;
    const targets = adjacentStealTargets(state, hex.id, mover);
    if (targets.length === 0) out.push({ type: 'moveRobber', hex: hex.id, stealFrom: null });
    else for (const t of targets) out.push({ type: 'moveRobber', hex: hex.id, stealFrom: t });
  }
  return out;
}           // Task 10
function devCardActions(state: State, playerId: PlayerId): Action[] {
  if (playerId !== state.currentPlayer || state.pending) return [];
  const p = state.players[playerId]!;
  const out: Action[] = [];

  // buy (only after the roll, in the build phase)
  if (state.turn.hasRolled && state.bank.devDeck.length > 0 && canAfford(p.resources, COSTS.devCard))
    out.push({ type: 'buyDevCard' });

  // play (≤1 per turn)
  if (hasPlayableDev(state, playerId, 'knight')) {
    for (const hex of state.board.hexes) {
      if (hex.id === state.board.robberHex) continue;
      const targets = adjacentStealTargets(state, hex.id, playerId);
      if (targets.length === 0) out.push({ type: 'playKnight', hex: hex.id, stealFrom: null });
      else for (const t of targets) out.push({ type: 'playKnight', hex: hex.id, stealFrom: t });
    }
  }
  if (hasPlayableDev(state, playerId, 'roadBuilding')) out.push({ type: 'playRoadBuilding' });
  if (hasPlayableDev(state, playerId, 'yearOfPlenty'))
    for (const a of RESOURCES) for (const b of RESOURCES)
      if (a <= b) {
        const bankOk = a === b
          ? state.bank.resources[a] >= 2
          : state.bank.resources[a] >= 1 && state.bank.resources[b] >= 1;
        if (bankOk) out.push({ type: 'playYearOfPlenty', resources: [a, b] });
      }
  if (hasPlayableDev(state, playerId, 'monopoly'))
    for (const r of RESOURCES) out.push({ type: 'playMonopoly', resource: r });

  return out;
} // Task 12

function buildActions(state: State, playerId: PlayerId): Action[] {
  const p = state.players[playerId]!;
  const out: Action[] = [];
  if (p.piecesLeft.roads > 0 && (state.turn.freeRoads > 0 || canAfford(p.resources, COSTS.road)))
    for (const e of roadPlacements(state, playerId)) out.push({ type: 'buildRoad', edge: e });
  if (p.piecesLeft.settlements > 0 && canAfford(p.resources, COSTS.settlement))
    for (const n of settlementPlacements(state, playerId)) out.push({ type: 'buildSettlement', node: n });
  if (p.piecesLeft.cities > 0 && canAfford(p.resources, COSTS.city))
    for (const n of cityPlacements(state, playerId)) out.push({ type: 'buildCity', node: n });
  return out;
}

function tradeActions(state: State, playerId: PlayerId): Action[] {
  if (!state.turn.hasRolled) return [];
  const p = state.players[playerId]!;
  const out: Action[] = [];
  for (const give of RESOURCES) {
    const ratio = bankRatioFor(state, playerId, give);
    if (p.resources[give] < ratio) continue;
    for (const receive of RESOURCES) {
      if (receive === give) continue;
      if (state.bank.resources[receive] > 0) out.push({ type: 'tradeBank', give, receive });
    }
  }
  return out;
}   // Task 15
function endTurnActions(state: State, playerId: PlayerId): Action[] {
  if (playerId !== state.currentPlayer || !state.turn.hasRolled || state.pending) return [];
  return [{ type: 'endTurn' }];
}

function mainActions(state: State, playerId: PlayerId): Action[] {
  return [
    ...buildActions(state, playerId),
    ...devCardActions(state, playerId),
    ...tradeActions(state, playerId),
    ...endTurnActions(state, playerId),
  ];
}
