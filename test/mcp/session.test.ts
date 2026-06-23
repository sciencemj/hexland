// test/mcp/session.test.ts
import { test, expect } from 'bun:test';
import { createSession, newGame, act, view } from '../../src/mcp/session';

test('new_game starts in setup with Claude (seat 0) to place', () => {
  const s = createSession();
  const v: any = newGame(s, { aiOpponents: 3, difficulty: 'medium', seed: 5 });
  expect(v.phase).toBe('setup');
  expect(v.yourTurn).toBe(true);
  expect(v.opponents.length).toBe(3);
  expect(v.legalActions.length).toBeGreaterThan(0);
  expect(v.legalActions.every((a: any) => a.type === 'setupSettlement')).toBe(true);
  // board exposed for reasoning
  expect(v.board.hexes.length).toBe(19);
  expect(v.board.ports.length).toBe(9);
});

test('act advances Claude + AI through setup into play', () => {
  const s = createSession();
  newGame(s, { aiOpponents: 3, difficulty: 'medium', seed: 5 });
  let v: any = view(s);
  for (let i = 0; i < 40 && v.phase === 'setup'; i++) {
    expect(v.yourTurn).toBe(true); // AI seats are auto-advanced, so it's always our turn when control returns
    v = act(s, v.legalActions[0]);
  }
  expect(v.phase).toBe('play');
  expect(v.yourTurn).toBe(true); // seat 0 takes the first turn
  expect(v.legalActions.some((a: any) => a.type === 'rollDice')).toBe(true);
});

test('illegal action returns an error plus legalActions', () => {
  const s = createSession();
  newGame(s, { aiOpponents: 3, difficulty: 'medium', seed: 5 });
  const v: any = act(s, { type: 'rollDice' } as any); // cannot roll during setup
  expect(v.error).toBeTruthy();
  expect(v.legalActions.length).toBeGreaterThan(0);
});
