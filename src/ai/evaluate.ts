// src/ai/evaluate.ts
// Static evaluation of a game state from one player's perspective, plus a
// relative score that nets out the strongest opponent. Used by the lookahead
// agents to pick the move that maximizes their position.
import type { State, PlayerId, Resource } from '../engine/types';
import { RESOURCES } from '../engine/types';
import { TERRAIN_RESOURCE } from '../engine/types';
import { countVictoryPoints, totalCards } from '../engine/helpers';
import { longestRoadLength } from '../engine/roads';

const PIP: Record<number, number> = { 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1 };

export interface Weights {
  vp: number; production: number; diversity: number; road: number;
  army: number; port: number; hand: number; discardRisk: number; dev: number;
  ore: number; wheat: number; // resource emphasis for production scoring
}

export const DEFAULT_WEIGHTS: Weights = {
  vp: 100, production: 1, diversity: 6, road: 4, army: 7, port: 3,
  hand: 1.2, discardRisk: 3, dev: 4, ore: 1.15, wheat: 1.15,
};

function resWeight(w: Weights, r: Resource): number {
  if (r === 'ore') return w.ore;
  if (r === 'wheat') return w.wheat;
  return 1;
}

// Expected per-roll income value from a player's buildings.
function productionScore(state: State, playerId: PlayerId, w: Weights): number {
  let s = 0;
  for (const hex of state.board.hexes) {
    if (hex.token === null) continue;
    const res = TERRAIN_RESOURCE[hex.terrain];
    if (!res) continue;
    const pip = (PIP[hex.token] ?? 0) * (state.board.robberHex === hex.id ? 0.25 : 1);
    for (const nid of hex.nodeIds) {
      const b = state.board.nodes[nid]!.building;
      if (b?.owner === playerId) s += pip * (b.type === 'city' ? 2 : 1) * resWeight(w, res);
    }
  }
  return s;
}

export function evaluate(state: State, playerId: PlayerId, w: Weights = DEFAULT_WEIGHTS): number {
  if (state.winner === playerId) return 1e7;
  if (state.winner !== null) return -1e7;
  const p = state.players[playerId]!;
  let score = countVictoryPoints(state, playerId) * w.vp;
  score += productionScore(state, playerId, w) * w.production;

  // resource diversity — how many distinct resources the player produces
  const producing = new Set<Resource>();
  for (const hex of state.board.hexes) {
    if (hex.token === null) continue;
    const res = TERRAIN_RESOURCE[hex.terrain];
    if (!res) continue;
    for (const nid of hex.nodeIds) if (state.board.nodes[nid]!.building?.owner === playerId) producing.add(res);
  }
  score += producing.size * w.diversity;

  score += longestRoadLength(state, playerId) * w.road;
  score += p.playedKnights * w.army;
  score += p.ports.length * w.port;
  score += p.devCards.filter(c => !c.played).length * w.dev;

  const cards = totalCards(p.resources);
  score += Math.min(cards, 7) * w.hand - Math.max(0, cards - 7) * w.discardRisk;

  return score;
}

// Net position vs the strongest opponent — drives blocking/robber decisions.
export function relEval(state: State, playerId: PlayerId, w: Weights = DEFAULT_WEIGHTS): number {
  const mine = evaluate(state, playerId, w);
  let bestOpp = -Infinity;
  for (const o of state.players) if (o.id !== playerId) bestOpp = Math.max(bestOpp, evaluate(state, o.id, w));
  return mine - 0.7 * (bestOpp === -Infinity ? 0 : bestOpp);
}

export { RESOURCES };
