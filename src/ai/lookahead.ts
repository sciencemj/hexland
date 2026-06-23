// src/ai/lookahead.ts
// A 1-ply lookahead agent: it simulates each legal action and keeps the one
// that maximizes its relative evaluation, with a shallow trade→build booster.
import type { State, Action, PlayerId, Resource, ResourceMap } from '../engine/types';
import { RESOURCES, emptyResources } from '../engine/types';
import { applyAction } from '../engine/reduce';
import { getLegalActions } from '../engine/legal';
import { requiredDiscardCount } from '../engine/rules';
import { relEval, type Weights, DEFAULT_WEIGHTS } from './evaluate';
import type { Agent } from './agent';

function tryApply(state: State, pid: PlayerId, action: Action): State | null {
  try { return applyAction(state, pid, action); } catch { return null; }
}

function bestByEval(state: State, pid: PlayerId, actions: Action[], w: Weights): { action: Action; score: number } | null {
  let best: Action | null = null, bestScore = -Infinity;
  for (const a of actions) {
    const next = tryApply(state, pid, a);
    if (!next) continue;
    const sc = relEval(next, pid, w);
    if (sc > bestScore) { bestScore = sc; best = a; }
  }
  return best ? { action: best, score: bestScore } : null;
}

const KEEP: Record<Resource, number> = { ore: 2, wheat: 2, sheep: 0, wood: 0, brick: 0 };
function smartDiscard(state: State, pid: PlayerId): ResourceMap {
  let need = requiredDiscardCount(state, pid);
  const have = { ...state.players[pid]!.resources };
  const out = emptyResources();
  while (need > 0) {
    let pick: Resource | null = null, max = -Infinity;
    for (const r of RESOURCES) {
      const avail = have[r] - out[r];
      if (avail <= 0) continue;
      const v = avail - KEEP[r]; // prefer dropping abundant, keep ore/wheat
      if (v > max) { max = v; pick = r; }
    }
    if (!pick) break;
    out[pick] += 1; need -= 1;
  }
  return out;
}

export function makeLookaheadAgent(w: Weights = DEFAULT_WEIGHTS): Agent {
  return {
    decide(state: State, legal: Action[], playerId: PlayerId): Action {
      if (legal.some(a => a.type === 'discard')) return { type: 'discard', resources: smartDiscard(state, playerId) };

      if (state.pending?.kind === 'robber') {
        const moves = legal.filter(a => a.type === 'moveRobber' || a.type === 'playKnight');
        return bestByEval(state, playerId, moves, w)?.action ?? moves[0]!;
      }

      const respond = legal.filter(a => a.type === 'tradeRespond');
      if (respond.length && state.pending?.kind === 'tradeOffer') {
        const acc = legal.find(a => a.type === 'tradeRespond' && (a as { accept: boolean }).accept === true);
        if (!acc) return { type: 'tradeRespond', accept: false };
        const after = tryApply(state, playerId, acc);
        const reject = tryApply(state, playerId, { type: 'tradeRespond', accept: false });
        const accScore = after ? relEval(after, playerId, w) : -Infinity;
        const rejScore = reject ? relEval(reject, playerId, w) : -Infinity;
        return { type: 'tradeRespond', accept: accScore > rejScore };
      }

      if (state.phase === 'setup') {
        const settlements = legal.filter(a => a.type === 'setupSettlement');
        if (settlements.length) return bestByEval(state, playerId, settlements, w)?.action ?? settlements[0]!;
        const roads = legal.filter(a => a.type === 'setupRoad');
        return bestByEval(state, playerId, roads, w)?.action ?? roads[0]!;
      }

      const roll = legal.find(a => a.type === 'rollDice');
      if (roll) return roll;

      // main phase
      const endTurn: Action = { type: 'endTurn' };
      const candidates = legal.filter(a =>
        a.type === 'buildRoad' || a.type === 'buildSettlement' || a.type === 'buildCity' ||
        a.type === 'buyDevCard' || a.type === 'playKnight' || a.type === 'playRoadBuilding' ||
        a.type === 'playYearOfPlenty' || a.type === 'playMonopoly' || a.type === 'tradeBank' || a.type === 'endTurn');
      const top = bestByEval(state, playerId, candidates, w);
      if (!top) return endTurn;
      const endScore = tryApply(state, playerId, endTurn) ? relEval(tryApply(state, playerId, endTurn)!, playerId, w) : -Infinity;

      // trade→build booster: if ending is best, see if one bank trade unlocks a better build (2-ply)
      if (top.action.type === 'endTurn' || top.score <= endScore) {
        let bestTrade: Action | null = null, bestTradeScore = endScore;
        for (const tr of legal.filter(a => a.type === 'tradeBank')) {
          const afterTrade = tryApply(state, playerId, tr);
          if (!afterTrade) continue;
          const builds = getLegalActions(afterTrade, playerId).filter(a =>
            a.type === 'buildRoad' || a.type === 'buildSettlement' || a.type === 'buildCity' || a.type === 'buyDevCard');
          const bb = bestByEval(afterTrade, playerId, builds, w);
          if (bb && bb.score > bestTradeScore) { bestTradeScore = bb.score; bestTrade = tr; }
        }
        if (bestTrade) return bestTrade;
        return endTurn;
      }
      return top.action;
    },
  };
}
