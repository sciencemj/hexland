// test/ai/smoke.test.ts
import { test, expect } from 'bun:test';
import { createGame } from '../../src/engine/state';
import { getAgent } from '../../src/ai/registry';
import { runToCompletion } from '../../src/ai/runner';
import { countVictoryPoints } from '../../src/engine/helpers';

test.each([1, 2, 3])('four heuristic AIs finish a full game (seed %i)', (seed) => {
  const s = createGame({ numPlayers: 4, seed, humanCount: 0 });
  const agents = s.players.map(() => getAgent('medium'));
  const final = runToCompletion(s, agents, 50000);
  expect(final.winner).not.toBeNull();
  expect(countVictoryPoints(final, final.winner!)).toBeGreaterThanOrEqual(10);
});
