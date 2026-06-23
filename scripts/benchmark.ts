// scripts/benchmark.ts — self-play AI tournament.
// Usage: bun run scripts/benchmark.ts [games]
import { createGame } from '../src/engine/state';
import { runToCompletion } from '../src/ai/runner';
import { heuristicAgent } from '../src/ai/heuristic';
import { randomAgent } from '../src/ai/agent';
import { makeLookaheadAgent } from '../src/ai/lookahead';
import { makeMctsAgent } from '../src/ai/mcts';
import { DEFAULT_WEIGHTS } from '../src/ai/evaluate';
import type { Agent } from '../src/ai/agent';

const GAMES = Number(process.argv[2] ?? 16);
const MCTS_ITERS = Number(process.argv[3] ?? 80);

const lookA = makeLookaheadAgent(DEFAULT_WEIGHTS);
const mcts = makeMctsAgent(MCTS_ITERS, { depthCap: 50 });

const NAMES = [`mcts(${MCTS_ITERS})`, 'lookahead', 'medium', 'random'];
const AGENTS: Agent[] = [mcts, lookA, heuristicAgent, randomAgent];
const N = 4;

console.log(`Running ${GAMES} four-player games, seat-rotated. Candidates: ${NAMES.join(', ')}`);
const t0 = Date.now();
const wins = [0, 0, 0, 0];
let completed = 0, capped = 0;

for (let g = 0; g < GAMES; g++) {
  const rot = g % N; // rotate which candidate sits in which seat to cancel position bias
  const seatToCand: number[] = [];
  const seatAgent: Agent[] = [];
  for (let seat = 0; seat < N; seat++) {
    const cand = (seat + rot) % N;
    seatToCand[seat] = cand;
    seatAgent[seat] = AGENTS[cand]!;
  }
  const s = createGame({ numPlayers: N, seed: 1000 + g, humanCount: 0 });
  const final = runToCompletion(s, seatAgent, 80000);
  if (final.winner === null) { capped++; continue; }
  completed++;
  wins[seatToCand[final.winner]!]!++;
}

const secs = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`\nDone in ${secs}s — completed ${completed}, capped ${capped}\n`);
const ranked = NAMES.map((n, i) => ({ n, w: wins[i]! })).sort((a, b) => b.w - a.w);
for (const r of ranked) {
  const pct = completed ? (100 * r.w / completed).toFixed(1) : '0.0';
  const bar = '█'.repeat(Math.round((r.w / Math.max(1, completed)) * 30));
  console.log(`${r.n.padEnd(8)} ${String(r.w).padStart(3)} wins  ${pct.padStart(5)}%  ${bar}`);
}
console.log(`\n(expected ~25% each if all equal; >25% = stronger)`);
