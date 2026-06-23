// test/ai/lookahead.test.ts
import { test, expect } from 'bun:test';
import { createGame } from '../../src/engine/state';
import { getLegalActions } from '../../src/engine/legal';
import { applyAction } from '../../src/engine/reduce';
import { runToCompletion } from '../../src/ai/runner';
import { makeLookaheadAgent } from '../../src/ai/lookahead';
import { evaluate, relEval } from '../../src/ai/evaluate';
import { countVictoryPoints } from '../../src/engine/helpers';

const agent = makeLookaheadAgent();

test('lookahead returns a legal action throughout setup', () => {
  let g: any = createGame({ numPlayers: 4, seed: 5 });
  for (let i = 0; i < 100 && g.phase === 'setup'; i++) {
    const p = g.setup.order[g.setup.index];
    const legal = getLegalActions(g, p);
    const a = agent.decide(g, legal, p);
    expect(legal.some((x: any) => JSON.stringify(x) === JSON.stringify(a)) || a.type === 'discard').toBe(true);
    g = applyAction(g, p, a);
  }
  expect(g.phase).toBe('play');
});

test('four lookahead agents finish a full game', () => {
  const s = createGame({ numPlayers: 4, seed: 2, humanCount: 0 });
  const final = runToCompletion(s, s.players.map(() => agent), 80000);
  expect(final.winner).not.toBeNull();
  expect(countVictoryPoints(final, final.winner!)).toBeGreaterThanOrEqual(10);
});

test('evaluate rewards more victory points; relEval nets out opponents', () => {
  const s: any = createGame({ numPlayers: 4, seed: 5 });
  const before = evaluate(s, 0);
  s.board.nodes[s.board.hexes[0].nodeIds[0]].building = { type: 'city', owner: 0 };
  expect(evaluate(s, 0)).toBeGreaterThan(before);
  // an opponent city lowers our relative score
  const relBefore = relEval(s, 0);
  s.board.nodes[s.board.hexes[2].nodeIds[0]].building = { type: 'city', owner: 1 };
  expect(relEval(s, 0)).toBeLessThan(relBefore);
});
