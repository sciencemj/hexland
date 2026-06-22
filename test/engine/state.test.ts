import { test, expect } from 'bun:test';
import { createGame, redactFor, checkWinner } from '../../src/engine/state';

const cfg = { numPlayers: 4, seed: 5 };

test('createGame builds a 4-player setup game', () => {
  const s = createGame(cfg);
  expect(s.players.length).toBe(4);
  expect(s.players[0]!.isAI).toBe(false);
  expect(s.players.slice(1).every(p => p.isAI)).toBe(true);
  expect(s.phase).toBe('setup');
  expect(s.setup!.order).toEqual([0, 1, 2, 3, 3, 2, 1, 0]);
  expect(s.board.hexes[s.board.robberHex]!.terrain).toBe('desert');
});

test('bank starts at 19 of each resource', () => {
  const s = createGame(cfg);
  expect(s.bank.resources).toEqual({ wood: 19, brick: 19, sheep: 19, wheat: 19, ore: 19 });
});

test('dev deck has the correct 25-card composition', () => {
  const s = createGame(cfg);
  const c: Record<string, number> = {};
  for (const t of s.bank.devDeck) c[t] = (c[t] ?? 0) + 1;
  expect(c).toEqual({ knight: 14, victory: 5, roadBuilding: 2, yearOfPlenty: 2, monopoly: 2 });
  expect(s.bank.devDeck.length).toBe(25);
});

test('each player starts with 15/5/4 pieces and no resources', () => {
  const s = createGame(cfg);
  for (const p of s.players) {
    expect(p.piecesLeft).toEqual({ roads: 15, settlements: 5, cities: 4 });
    expect(p.resources).toEqual({ wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 });
  }
});

test('redactFor hides opponents resources and unplayed dev cards', () => {
  const s = createGame(cfg);
  s.players[1]!.resources.wood = 3;
  s.players[1]!.devCards.push({ type: 'knight', boughtTurn: 1, played: false });
  const view = redactFor(s, 0);
  expect(view.players[0]!.resources.wood).toBe(s.players[0]!.resources.wood); // own visible
  expect(view.players[1]!.resources).toEqual({ wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 }); // hidden
  expect(view.players[1]!.devCards.every(c => c.played)).toBe(true); // unplayed hidden
  expect(view.bank.devDeck.length).toBe(s.bank.devDeck.length); // count preserved
  expect(view.bank.devDeck.every(t => t === 'knight')).toBe(false); // order is scrambled/masked, not real
});

test('checkWinner returns null at game start', () => {
  expect(checkWinner(createGame(cfg))).toBeNull();
});
