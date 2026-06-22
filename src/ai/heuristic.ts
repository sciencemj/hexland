// src/ai/heuristic.ts
import type { State, Action, PlayerId, NodeId, Resource } from '../engine/types';
import { TERRAIN_RESOURCE, RESOURCES } from '../engine/types';
import { countVictoryPoints } from '../engine/helpers';
import type { Agent } from './agent';
import { makeDiscard } from './agent';

const PIP: Record<number, number> = { 2:1, 3:2, 4:3, 5:4, 6:5, 8:5, 9:4, 10:3, 11:2, 12:1 };
const RES_WEIGHT: Record<Resource, number> = { ore: 1.1, wheat: 1.1, wood: 1, brick: 1, sheep: 0.9 };

function nodeValue(state: State, node: NodeId): number {
  let v = 0;
  const seen = new Set<Resource>();
  for (const hid of state.board.nodes[node]!.hexIds) {
    const hex = state.board.hexes[hid]!;
    const res = TERRAIN_RESOURCE[hex.terrain];
    if (!res || hex.token === null) continue;
    v += (PIP[hex.token] ?? 0) * RES_WEIGHT[res];
    seen.add(res);
  }
  v += seen.size * 0.5;                                   // diversity bonus
  if (state.board.nodes[node]!.port) v += 0.4;           // port bonus
  return v;
}

function leader(state: State, exclude: PlayerId): PlayerId | null {
  let best: PlayerId | null = null, bestVp = -1;
  for (const p of state.players) {
    if (p.id === exclude) continue;
    const vp = countVictoryPoints(state, p.id);
    if (vp > bestVp) { bestVp = vp; best = p.id; }
  }
  return best;
}

function bestRobberAction(state: State, legal: Action[], playerId: PlayerId): Action {
  const lead = leader(state, playerId);
  const moves = legal.filter(a => a.type === 'moveRobber' || a.type === 'playKnight') as any[];
  let best = moves[0], bestScore = -Infinity;
  for (const m of moves) {
    const hex = state.board.hexes[m.hex]!;
    let score = (hex.token ? (PIP[hex.token] ?? 0) : 0);
    if (m.stealFrom === lead) score += 10;               // hit the leader
    else if (m.stealFrom !== null) score += 2;
    if (best === undefined || score > bestScore) { best = m; bestScore = score; }
  }
  return best;
}

export const heuristicAgent: Agent = {
  decide(state: State, legal: Action[], playerId: PlayerId): Action {
    // 1) discard on a 7
    if (legal.some(a => a.type === 'discard')) return { type: 'discard', resources: makeDiscard(state, playerId) };

    // 2) robber (rolled 7 or knight) — pick the hardest-hitting move
    if (state.pending?.kind === 'robber') return bestRobberAction(state, legal, playerId);

    // 3) respond to a trade offer: accept only if it doesn't worsen our card count
    const respond = legal.filter(a => a.type === 'tradeRespond');
    if (respond.length && state.pending?.kind === 'tradeOffer') {
      const give = state.pending.want, get = state.pending.give; // from the responder's view
      const gain = RESOURCES.reduce((s, r) => s + get[r] - give[r], 0);
      return { type: 'tradeRespond', accept: gain >= 0 };
    }

    // 4) setup placement
    if (state.phase === 'setup') {
      const settlements = legal.filter(a => a.type === 'setupSettlement') as any[];
      if (settlements.length)
        return settlements.reduce((b, a) => (nodeValue(state, a.node) > nodeValue(state, b.node) ? a : b));
      const roads = legal.filter(a => a.type === 'setupRoad');
      return roads[0]!;
    }

    // 5) must roll first
    const roll = legal.find(a => a.type === 'rollDice');
    if (roll) return roll;

    // 6) main phase greedy priority
    const cities = legal.filter(a => a.type === 'buildCity') as any[];
    if (cities.length)
      return cities.reduce((b, a) => (nodeValue(state, a.node) > nodeValue(state, b.node) ? a : b));

    const settlements = legal.filter(a => a.type === 'buildSettlement') as any[];
    if (settlements.length)
      return settlements.reduce((b, a) => (nodeValue(state, a.node) > nodeValue(state, b.node) ? a : b));

    // play a knight if it would take/keep Largest Army
    const knights = legal.filter(a => a.type === 'playKnight');
    if (knights.length) {
      const mine = state.players[playerId]!.playedKnights + 1;
      const maxOther = Math.max(0, ...state.players.filter(p => p.id !== playerId).map(p => p.playedKnights));
      if (mine >= 3 && mine > maxOther) return bestRobberAction(state, knights, playerId);
    }

    // buy a dev card if we have spare ore/wheat/sheep and can't build something better
    if (legal.some(a => a.type === 'buyDevCard')) return { type: 'buyDevCard' };

    // extend roads (helps reach new spots / longest road), preferring to actually progress
    const roads = legal.filter(a => a.type === 'buildRoad');
    if (roads.length) return roads[0]!;

    // bank-trade toward a city (ore/wheat) if we have a 4+ stack of something else
    const trade = legal.find(a => a.type === 'tradeBank' && (a.receive === 'ore' || a.receive === 'wheat'));
    if (trade) return trade;

    return { type: 'endTurn' };
  },
};
