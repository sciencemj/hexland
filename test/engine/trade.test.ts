// test/engine/trade.test.ts
import { test, expect } from 'bun:test';
import { createGame } from '../../src/engine/state';
import { applyAction } from '../../src/engine/reduce';
import { getLegalActions } from '../../src/engine/legal';
import { bankRatioFor } from '../../src/engine/rules';

function freshPlay() {
  let g: any = createGame({ numPlayers: 4, seed: 5 });
  for (let i = 0; i < 100 && g.phase === 'setup'; i++) {
    const p = g.setup.order[g.setup.index];
    g = applyAction(g, p, getLegalActions(g, p)[0]);
  }
  g.turn.hasRolled = true;
  return g;
}

test('default bank ratio is 4:1; 3:1 with a generic port; 2:1 with a matching port', () => {
  const s: any = freshPlay();
  const p = s.currentPlayer;
  expect(bankRatioFor(s, p, 'wood')).toBe(4);
  s.players[p].ports = ['any'];
  expect(bankRatioFor(s, p, 'wood')).toBe(3);
  s.players[p].ports = ['any', 'wood'];
  expect(bankRatioFor(s, p, 'wood')).toBe(2);
  expect(bankRatioFor(s, p, 'brick')).toBe(3); // 2:1 only applies to wood
});

test('bank trade 4:1 pays 4 and receives 1', () => {
  const s: any = freshPlay();
  const p = s.currentPlayer;
  s.players[p].resources = { wood: 4, brick: 0, sheep: 0, wheat: 0, ore: 0 };
  const after = applyAction(s, p, { type: 'tradeBank', give: 'wood', receive: 'brick' });
  expect(after.players[p].resources).toEqual({ wood: 0, brick: 1, sheep: 0, wheat: 0, ore: 0 });
});

test('bank trade with too few cards throws', () => {
  const s: any = freshPlay();
  const p = s.currentPlayer;
  s.players[p].resources = { wood: 3, brick: 0, sheep: 0, wheat: 0, ore: 0 };
  expect(() => applyAction(s, p, { type: 'tradeBank', give: 'wood', receive: 'brick' })).toThrow();
});

test('player trade: offer then accept swaps resources', () => {
  const s: any = freshPlay();
  const p = s.currentPlayer;
  const opp = (p + 1) % 4;
  s.players[p].resources = { wood: 2, brick: 0, sheep: 0, wheat: 0, ore: 0 };
  s.players[opp].resources = { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 1 };
  const offered = applyAction(s, p, {
    type: 'tradeOffer', to: opp,
    give: { wood: 2, brick: 0, sheep: 0, wheat: 0, ore: 0 },
    want: { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 1 },
  });
  expect(offered.pending.kind).toBe('tradeOffer');
  const respondLegal = getLegalActions(offered, opp);
  expect(respondLegal.some(a => a.type === 'tradeRespond')).toBe(true);
  const done = applyAction(offered, opp, { type: 'tradeRespond', accept: true });
  expect(done.players[p].resources.ore).toBe(1);
  expect(done.players[opp].resources.wood).toBe(2);
  expect(done.pending).toBeNull();
});

test('player trade: reject clears the offer with no change', () => {
  const s: any = freshPlay();
  const p = s.currentPlayer;
  const opp = (p + 1) % 4;
  s.players[p].resources = { wood: 2, brick: 0, sheep: 0, wheat: 0, ore: 0 };
  s.players[opp].resources = { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 1 };
  const offered = applyAction(s, p, {
    type: 'tradeOffer', to: opp,
    give: { wood: 2, brick: 0, sheep: 0, wheat: 0, ore: 0 },
    want: { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 1 },
  });
  const done = applyAction(offered, opp, { type: 'tradeRespond', accept: false });
  expect(done.players[p].resources.wood).toBe(2);
  expect(done.players[opp].resources.ore).toBe(1);
  expect(done.pending).toBeNull();
});

test('tradeOffer from non-active player throws', () => {
  const s: any = freshPlay();
  const p = s.currentPlayer;
  const opp = (p + 1) % 4;
  s.players[opp].resources = { wood: 2, brick: 0, sheep: 0, wheat: 0, ore: 0 };
  expect(() => applyAction(s, opp, {
    type: 'tradeOffer', to: p,
    give: { wood: 2, brick: 0, sheep: 0, wheat: 0, ore: 0 },
    want: { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 1 },
  })).toThrow('only the active player may offer');
});

test('one-sided offer (give non-empty, want empty) throws', () => {
  const s: any = freshPlay();
  const p = s.currentPlayer;
  const opp = (p + 1) % 4;
  s.players[p].resources = { wood: 2, brick: 0, sheep: 0, wheat: 0, ore: 0 };
  expect(() => applyAction(s, p, {
    type: 'tradeOffer', to: opp,
    give: { wood: 2, brick: 0, sheep: 0, wheat: 0, ore: 0 },
    want: { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 },
  })).toThrow('a trade must give AND take (no free gifts)');
});

test('tradeRespond accept throws when offerer no longer holds the offered cards', () => {
  const s: any = freshPlay();
  const p = s.currentPlayer;
  const opp = (p + 1) % 4;
  // Give offerer exactly 2 wood (enough to offer but will be zeroed out)
  // Give opponent 1 ore to accept with
  s.players[p].resources = { wood: 2, brick: 0, sheep: 0, wheat: 0, ore: 0 };
  s.players[opp].resources = { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 1 };
  const offered = applyAction(s, p, {
    type: 'tradeOffer', to: opp,
    give: { wood: 2, brick: 0, sheep: 0, wheat: 0, ore: 0 },
    want: { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 1 },
  });
  // Simulate offerer spending their wood after the offer was made
  offered.players[p].resources.wood = 0;
  // Now acceptance should throw because offerer can no longer cover the offer
  expect(() => applyAction(offered, opp, { type: 'tradeRespond', accept: true }))
    .toThrow('offerer no longer holds the offered cards');
});

test('getLegalActions offers accept only when the responder can pay the requested cards', () => {
  const s: any = freshPlay();
  const p = s.currentPlayer;
  const opp = (p + 1) % 4;
  s.players[p].resources = { wood: 2, brick: 0, sheep: 0, wheat: 0, ore: 0 };
  s.players[opp].resources = { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 }; // opp has no ore
  const offered = applyAction(s, p, {
    type: 'tradeOffer', to: opp,
    give: { wood: 2, brick: 0, sheep: 0, wheat: 0, ore: 0 },
    want: { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 1 }, // asks for 1 ore the opp lacks
  });
  const legal = getLegalActions(offered, opp);
  // accept must NOT be offered (the engine would throw on it); only reject
  expect(legal.some((a) => a.type === 'tradeRespond' && a.accept === true)).toBe(false);
  expect(legal.some((a) => a.type === 'tradeRespond' && a.accept === false)).toBe(true);
  // rejecting is safe and clears the offer
  const after = applyAction(offered, opp, { type: 'tradeRespond', accept: false });
  expect(after.pending).toBeNull();
});
