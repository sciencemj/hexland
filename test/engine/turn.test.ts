// test/engine/turn.test.ts
import { test, expect } from 'bun:test';
import { createGame } from '../../src/engine/state';
import { applyAction } from '../../src/engine/reduce';
import { getLegalActions } from '../../src/engine/legal';

function freshPlay() {
  let g: any = createGame({ numPlayers: 4, seed: 5 });
  for (let i = 0; i < 100 && g.phase === 'setup'; i++) {
    const p = g.setup.order[g.setup.index];
    g = applyAction(g, p, getLegalActions(g, p)[0]);
  }
  return g;
}

test('cannot end turn before rolling', () => {
  const g: any = freshPlay();
  expect(getLegalActions(g, g.currentPlayer).some(a => a.type === 'endTurn')).toBe(false);
  expect(() => applyAction(g, g.currentPlayer, { type: 'endTurn' })).toThrow();
});

test('end turn advances clockwise and resets turn state', () => {
  let g: any = freshPlay();
  const p0 = g.currentPlayer;
  g = applyAction(g, p0, { type: 'rollDice' });
  // resolve any pending (e.g. a 7) so we can end the turn
  while (g.pending) {
    const actor = g.pending.kind === 'discard' ? g.pending.remaining[0] : g.pending.mover;
    const a = getLegalActions(g, actor)[0];
    g = applyAction(g, actor, a);
  }
  const before = g.turn.turnNumber;
  g = applyAction(g, p0, { type: 'endTurn' });
  expect(g.currentPlayer).toBe((p0 + 1) % 4);
  expect(g.turn.hasRolled).toBe(false);
  expect(g.turn.dice).toBeNull();
  expect(g.turn.devCardPlayedThisTurn).toBe(false);
  expect(g.turn.freeRoads).toBe(0);
  expect(g.turn.turnNumber).toBe(before + 1);
});

test('engine barrel re-exports the public API', async () => {
  const api = await import('../../src/engine/index');
  expect(typeof api.createGame).toBe('function');
  expect(typeof api.getLegalActions).toBe('function');
  expect(typeof api.applyAction).toBe('function');
  expect(typeof api.redactFor).toBe('function');
  expect(typeof api.checkWinner).toBe('function');
});

test('rollDice detects win for player already at >=10 VP at turn start', () => {
  const g: any = freshPlay();
  const p = g.currentPlayer;
  // Grant 10 victory-point dev cards — ensures >=10 VP regardless of what is rolled
  for (let i = 0; i < 10; i++)
    g.players[p].devCards.push({ type: 'victory', boughtTurn: 0, played: false });
  const after = applyAction(g, p, { type: 'rollDice' });
  expect(after.winner).toBe(p);
});

test('determinism: same seed + same actions → identical state', () => {
  const run = () => {
    let g: any = createGame({ numPlayers: 4, seed: 11 });
    for (let i = 0; i < 100 && g.phase === 'setup'; i++) {
      const p = g.setup.order[g.setup.index];
      g = applyAction(g, p, getLegalActions(g, p)[0]);
    }
    g = applyAction(g, g.currentPlayer, { type: 'rollDice' });
    return g;
  };
  expect(JSON.stringify(run())).toBe(JSON.stringify(run()));
});
