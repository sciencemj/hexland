// test/engine/bonuses.test.ts
import { test, expect } from 'bun:test';
import { recomputeArmy } from '../../src/engine/scoring';

function armyState(knights: number[], holder: number | null) {
  return {
    players: knights.map((k, id) => ({ id, playedKnights: k })),
    bonuses: { longestRoad: null, largestArmy: holder },
  } as any;
}

test('Largest Army requires 3 knights', () => {
  const s = armyState([2, 2, 0, 0], null);
  recomputeArmy(s);
  expect(s.bonuses.largestArmy).toBeNull();
});

test('first to 3 knights takes Largest Army', () => {
  const s = armyState([3, 1, 0, 0], null);
  recomputeArmy(s);
  expect(s.bonuses.largestArmy).toBe(0);
});

test('Largest Army transfers only on strictly more knights', () => {
  const tie = armyState([3, 3, 0, 0], 0);
  recomputeArmy(tie);
  expect(tie.bonuses.largestArmy).toBe(0); // tie keeps holder
  const beat = armyState([3, 4, 0, 0], 0);
  recomputeArmy(beat);
  expect(beat.bonuses.largestArmy).toBe(1); // strictly more takes it
});
