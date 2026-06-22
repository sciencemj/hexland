// test/ui/aiflow.test.ts
import { test, expect } from 'bun:test';
import { createGame } from '../../src/engine/state';
import { applyAction } from '../../src/engine/reduce';
import { getAgent } from '../../src/ai/registry';
import { aiActionFor } from '../../src/ai/runner';

test('aiActionFor returns an AI action during setup but null when the human is up', () => {
  const s: any = createGame({ numPlayers: 4, seed: 5, humanCount: 1 });
  const agents = s.players.map(() => getAgent('medium'));
  // setup order starts with player 0 (human) → null
  expect(aiActionFor(s, agents)).toBeNull();
  // force player 1 (AI) to be the placer
  s.setup.index = 1;
  const got = aiActionFor(s, agents);
  expect(got).not.toBeNull();
  expect(got!.actor).toBe(1);
  expect(() => applyAction(s, got!.actor, got!.action)).not.toThrow();
});
