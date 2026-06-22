// test/engine/robber.test.ts
import { test, expect } from 'bun:test';
import { createGame } from '../../src/engine/state';
import { applyAction } from '../../src/engine/reduce';
import { getLegalActions } from '../../src/engine/legal';
import { requiredDiscardCount } from '../../src/engine/rules';
import { totalCards } from '../../src/engine/helpers';

function freshPlay() {
  let g: any = createGame({ numPlayers: 4, seed: 5 });
  for (let i = 0; i < 100 && g.phase === 'setup'; i++) {
    const p = g.setup.order[g.setup.index];
    g = applyAction(g, p, getLegalActions(g, p)[0]);
  }
  return g;
}

test('requiredDiscardCount: >7 discards half rounded down; ≤7 discards nothing', () => {
  const s: any = freshPlay();
  s.players[1].resources = { wood: 8, brick: 0, sheep: 0, wheat: 0, ore: 0 };
  expect(requiredDiscardCount(s, 1)).toBe(4);
  s.players[1].resources.wood = 9; expect(requiredDiscardCount(s, 1)).toBe(4);
  s.players[1].resources.wood = 7; expect(requiredDiscardCount(s, 1)).toBe(0);
});

test('on a 7, over-limit players must discard before the robber moves', () => {
  const s: any = freshPlay();
  const roller = s.currentPlayer;
  s.players[roller].resources = { wood: 8, brick: 0, sheep: 0, wheat: 0, ore: 0 };
  // force a 7 by stubbing rng path is hard; instead simulate startSeven via pending
  s.turn.hasRolled = true; s.turn.dice = [3, 4];
  s.pending = { kind: 'discard', remaining: [roller] };
  const legal = getLegalActions(s, roller);
  expect(legal[0]!.type).toBe('discard');
  const after = applyAction(s, roller, { type: 'discard', resources: { wood: 4, brick: 0, sheep: 0, wheat: 0, ore: 0 } });
  expect(totalCards(after.players[roller].resources)).toBe(4);
  expect(after.pending.kind).toBe('robber');
  expect(after.pending.mover).toBe(roller);
});

test('discarding the wrong count throws', () => {
  const s: any = freshPlay();
  const roller = s.currentPlayer;
  s.players[roller].resources = { wood: 8, brick: 0, sheep: 0, wheat: 0, ore: 0 };
  s.pending = { kind: 'discard', remaining: [roller] };
  expect(() => applyAction(s, roller, { type: 'discard', resources: { wood: 2, brick: 0, sheep: 0, wheat: 0, ore: 0 } })).toThrow();
});

test('robber must move to a different hex and steals from an adjacent opponent', () => {
  const s: any = freshPlay();
  const roller = s.currentPlayer;
  // give an opponent a building on some hex and a card; put robber elsewhere
  const targetHex = s.board.hexes.find((h: any) => h.id !== s.board.robberHex)!;
  const opp = (roller + 1) % 4;
  s.board.nodes[targetHex.nodeIds[0]].building = { type: 'settlement', owner: opp };
  s.players[opp].resources = { wood: 1, brick: 0, sheep: 0, wheat: 0, ore: 0 };
  s.pending = { kind: 'robber', mover: roller, viaKnight: false };
  s.turn.hasRolled = true;

  const legal = getLegalActions(s, roller).filter(a => (a as any).hex === targetHex.id);
  expect(legal.some(a => (a as any).stealFrom === opp)).toBe(true);

  const after = applyAction(s, roller, { type: 'moveRobber', hex: targetHex.id, stealFrom: opp });
  expect(after.board.robberHex).toBe(targetHex.id);
  expect(after.players[roller].resources.wood).toBe(1); // stole the wood
  expect(after.players[opp].resources.wood).toBe(0);
  expect(after.pending).toBeNull();
});

test('cannot leave the robber on its current hex', () => {
  const s: any = freshPlay();
  const roller = s.currentPlayer;
  s.pending = { kind: 'robber', mover: roller, viaKnight: false };
  s.turn.hasRolled = true;
  const legal = getLegalActions(s, roller);
  expect(legal.every(a => (a as any).hex !== s.board.robberHex)).toBe(true);
  expect(() => applyAction(s, roller, { type: 'moveRobber', hex: s.board.robberHex, stealFrom: null })).toThrow();
});
