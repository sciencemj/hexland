// test/ai/mcts.test.ts
import { test, expect } from 'bun:test';
import { createGame } from '../../src/engine/state';
import { getLegalActions } from '../../src/engine/legal';
import { applyAction } from '../../src/engine/reduce';
import { makeMctsAgent } from '../../src/ai/mcts';

// small iteration count keeps the test fast
const agent = makeMctsAgent(12, { depthCap: 25 });

function freshPlay() {
  let g: any = createGame({ numPlayers: 4, seed: 5, humanCount: 0 });
  for (let i = 0; i < 100 && g.phase === 'setup'; i++) {
    const p = g.setup.order[g.setup.index];
    g = applyAction(g, p, getLegalActions(g, p)[0]);
  }
  return g;
}

test('mcts returns a legal, applicable action in the main phase', () => {
  let g: any = freshPlay();
  const p = g.currentPlayer;
  g = applyAction(g, p, { type: 'rollDice' });
  // resolve any pending (e.g. a 7) so we are in a normal decision state
  while (g.pending) {
    const actor = g.pending.kind === 'discard' ? g.pending.remaining[0] : g.pending.mover;
    g = applyAction(g, actor, makeMctsAgent(8).decide(g, getLegalActions(g, actor), actor));
  }
  const legal = getLegalActions(g, g.currentPlayer);
  const a = agent.decide(g, legal, g.currentPlayer);
  expect(() => applyAction(g, g.currentPlayer, a)).not.toThrow();
});

test('mcts builds a real settlement spot during setup', () => {
  const g: any = createGame({ numPlayers: 4, seed: 7, humanCount: 0 });
  const p = g.setup.order[g.setup.index];
  const legal = getLegalActions(g, p);
  const a: any = agent.decide(g, legal, p);
  expect(a.type).toBe('setupSettlement');
  expect(legal.some((x: any) => x.node === a.node)).toBe(true);
});
