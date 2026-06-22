import { test, expect } from 'bun:test';
import { COSTS, totalCards, canAfford, addRes, subRes, countVictoryPoints } from '../../src/engine/helpers';
import { emptyResources, type State } from '../../src/engine/types';

test('costs match the rulebook', () => {
  expect(COSTS.road).toEqual({ wood: 1, brick: 1, sheep: 0, wheat: 0, ore: 0 });
  expect(COSTS.settlement).toEqual({ wood: 1, brick: 1, sheep: 1, wheat: 1, ore: 0 });
  expect(COSTS.city).toEqual({ wood: 0, brick: 0, sheep: 0, wheat: 2, ore: 3 });
  expect(COSTS.devCard).toEqual({ wood: 0, brick: 0, sheep: 1, wheat: 1, ore: 1 });
});

test('totalCards / canAfford / addRes / subRes are pure', () => {
  const a = { wood: 2, brick: 1, sheep: 0, wheat: 0, ore: 0 };
  expect(totalCards(a)).toBe(3);
  expect(canAfford(a, COSTS.road)).toBe(true);
  expect(canAfford(a, COSTS.settlement)).toBe(false);
  const sum = addRes(a, { wood: 0, brick: 0, sheep: 1, wheat: 1, ore: 0 });
  expect(sum.sheep).toBe(1);
  expect(a.sheep).toBe(0); // unchanged
  const diff = subRes(a, COSTS.road);
  expect(diff).toEqual({ wood: 1, brick: 0, sheep: 0, wheat: 0, ore: 0 });
});

test('countVictoryPoints sums buildings, VP cards, and bonuses', () => {
  const base: Partial<State> = {
    players: [{
      id: 0, name: 'A', color: '#f00', isAI: false, aiDifficulty: null,
      resources: emptyResources(),
      devCards: [{ type: 'victory', boughtTurn: 1, played: false }],
      playedKnights: 3, piecesLeft: { roads: 13, settlements: 3, cities: 3 }, ports: [],
    }] as any,
    board: { nodes: [
      { building: { type: 'settlement', owner: 0 } },
      { building: { type: 'city', owner: 0 } },
    ] } as any,
    bonuses: { longestRoad: null, largestArmy: 0 },
  };
  // 1 settlement + 1 city(2) + 1 VP card + largestArmy(2) = 6
  expect(countVictoryPoints(base as State, 0)).toBe(6);
});
