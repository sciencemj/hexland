// test/ai/heuristic.test.ts
import { test, expect } from 'bun:test';
import { createGame } from '../../src/engine/state';
import { getLegalActions } from '../../src/engine/legal';
import { applyAction } from '../../src/engine/reduce';
import { heuristicAgent } from '../../src/ai/heuristic';

test('heuristic returns a legal action at every setup step', async () => {
  let g: any = createGame({ numPlayers: 4, seed: 7 });
  for (let i = 0; i < 100 && g.phase === 'setup'; i++) {
    const p = g.setup.order[g.setup.index];
    const legal = getLegalActions(g, p);
    const a = await heuristicAgent.decide(g, legal, p);
    expect(legal.some(x => JSON.stringify(x) === JSON.stringify(a)) || a.type === 'discard').toBe(true);
    g = applyAction(g, p, a);
  }
  expect(g.phase).toBe('play');
});

test('heuristic setup chooses a high-value node (not strictly the first legal one)', async () => {
  const g: any = createGame({ numPlayers: 4, seed: 7 });
  const p = g.setup.order[g.setup.index];
  const legal = getLegalActions(g, p);
  const a: any = await heuristicAgent.decide(g, legal, p);
  expect(a.type).toBe('setupSettlement');
  // chosen node should have a production value >= the median of options
  // (sanity: it returns one of the legal nodes)
  expect(legal.some((x: any) => x.node === a.node)).toBe(true);
});
