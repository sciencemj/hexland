// src/ai/mcts.ts
// Monte-Carlo Tree Search agent. The engine is action-granular and stochastic
// (dice/deck/steal live in state.rng), so each rollout re-seeds the rng to
// sample a different future (determinization). Candidate actions are first
// pruned to the top-K by a 1-ply evaluation, then UCT distributes rollouts
// among them with the fast heuristic as the rollout policy.
import type { State, Action, PlayerId } from '../engine/types';
import { applyAction } from '../engine/reduce';
import { getLegalActions, nextActor } from '../engine/legal';
import { clone } from '../engine/helpers';
import { makeRng } from '../engine/rng';
import { relEval } from './evaluate';
import type { Agent } from './agent';
import { makeDiscard } from './agent';
import { heuristicAgent } from './heuristic';

function tryApply(state: State, pid: PlayerId, a: Action): State | null {
  try { return applyAction(state, pid, a); } catch { return null; }
}

let seedCounter = 1;
function determinize(state: State): State {
  const s = clone(state);
  seedCounter = (seedCounter + 1) | 0;
  s.rng = makeRng(((Math.random() * 2 ** 31) | 0) ^ seedCounter);
  return s;
}

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x / 400));

// Play out the rest of the game with the heuristic policy (depth-capped),
// then score the result for `pid`.
function rollout(state: State, pid: PlayerId, depthCap: number): number {
  let s = state;
  for (let d = 0; d < depthCap && s.winner === null; d++) {
    const actor = nextActor(s);
    if (actor === null) break;
    const legal = getLegalActions(s, actor);
    if (legal.length === 0) break;
    const action = heuristicAgent.decide(s, legal, actor) as Action;
    const next = tryApply(s, actor, action);
    if (!next) break;
    s = next;
  }
  if (s.winner === pid) return 1;
  if (s.winner !== null) return 0;
  return sigmoid(relEval(s, pid));
}

export function makeMctsAgent(iterations = 120, opts: { topK?: number; depthCap?: number } = {}): Agent {
  const K = opts.topK ?? 8;
  const depthCap = opts.depthCap ?? 60;
  const C = 1.4;

  function search(state: State, pid: PlayerId, candidates: Action[]): Action {
    // prune to the top-K by a quick 1-ply evaluation
    const scored = candidates
      .map(a => { const n = tryApply(state, pid, a); return { a, s: n ? relEval(n, pid) : -Infinity }; })
      .filter(x => x.s > -Infinity)
      .sort((x, y) => y.s - x.s)
      .slice(0, K);
    if (scored.length === 0) return candidates[0]!;
    if (scored.length === 1) return scored[0]!.a;

    const arms = scored.map(x => ({ action: x.a, n: 0, w: 0 }));
    for (let it = 0; it < iterations; it++) {
      // UCT selection (unvisited first)
      let pick = arms[0]!;
      const unseen = arms.find(a => a.n === 0);
      if (unseen) pick = unseen;
      else {
        let best = -Infinity;
        for (const a of arms) {
          const u = a.w / a.n + C * Math.sqrt(Math.log(it + 1) / a.n);
          if (u > best) { best = u; pick = a; }
        }
      }
      const next = tryApply(determinize(state), pid, pick.action);
      const r = next ? rollout(next, pid, depthCap) : 0;
      pick.n += 1; pick.w += r;
    }
    // choose the most-visited arm (robust), tie-break by mean
    let best = arms[0]!;
    for (const a of arms) {
      if (a.n > best.n || (a.n === best.n && a.w / a.n > best.w / best.n)) best = a;
    }
    return best.action;
  }

  return {
    decide(state: State, legal: Action[], playerId: PlayerId): Action {
      if (legal.some(a => a.type === 'discard')) return { type: 'discard', resources: makeDiscard(state, playerId) };

      const roll = legal.find(a => a.type === 'rollDice');
      if (roll && legal.length === 1) return roll;

      // trade-offer response: quick accept/reject by relEval
      if (state.pending?.kind === 'tradeOffer') {
        const acc = legal.find(a => a.type === 'tradeRespond' && (a as { accept: boolean }).accept === true);
        if (!acc) return { type: 'tradeRespond', accept: false };
        const after = tryApply(state, playerId, acc);
        const rej = tryApply(state, playerId, { type: 'tradeRespond', accept: false });
        const aS = after ? relEval(after, playerId) : -Infinity;
        const rS = rej ? relEval(rej, playerId) : -Infinity;
        return { type: 'tradeRespond', accept: aS > rS };
      }

      // robber / setup / main: search over the meaningful candidates
      const candidates = state.pending?.kind === 'robber'
        ? legal.filter(a => a.type === 'moveRobber' || a.type === 'playKnight')
        : legal;
      if (candidates.length <= 1) return candidates[0] ?? legal[0]!;
      return search(state, playerId, candidates);
    },
  };
}
