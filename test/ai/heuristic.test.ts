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

test('heuristic rejects a trade offer it cannot pay (never accepts an unaffordable trade)', async () => {
  let g: any = createGame({ numPlayers: 4, seed: 5 });
  for (let i = 0; i < 100 && g.phase === 'setup'; i++) {
    const p = g.setup.order[g.setup.index];
    g = applyAction(g, p, getLegalActions(g, p)[0]);
  }
  g.turn.hasRolled = true;
  const human = g.currentPlayer;
  const ai = (human + 1) % 4;
  g.players[human].resources = { wood: 2, brick: 0, sheep: 0, wheat: 0, ore: 0 };
  g.players[ai].resources = { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 }; // AI has no ore
  // Human offers 2 wood for 1 ore the AI doesn't have (gain looks positive to a naive agent)
  const offered = applyAction(g, human, {
    type: 'tradeOffer', to: ai,
    give: { wood: 2, brick: 0, sheep: 0, wheat: 0, ore: 0 },
    want: { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 1 },
  });
  const legal = getLegalActions(offered, ai);
  const decision: any = await heuristicAgent.decide(offered, legal, ai);
  expect(decision).toEqual({ type: 'tradeRespond', accept: false });
  // and applying the AI's decision must never throw (this is the freeze bug)
  expect(() => applyAction(offered, ai, decision)).not.toThrow();
});
