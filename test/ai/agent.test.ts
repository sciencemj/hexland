import { test, expect } from 'bun:test';
import { createGame } from '../../src/engine/state';
import { getLegalActions } from '../../src/engine/legal';
import { applyAction } from '../../src/engine/reduce';
import { randomAgent, makeDiscard } from '../../src/ai/agent';
import { totalCards } from '../../src/engine/helpers';
import { requiredDiscardCount } from '../../src/engine/rules';

test('makeDiscard drops exactly the required number, most-abundant first', () => {
  const s: any = createGame({ numPlayers: 4, seed: 5 });
  s.players[0].resources = { wood: 5, brick: 3, sheep: 0, wheat: 0, ore: 0 }; // 8 → discard 4
  const d = makeDiscard(s, 0);
  expect(totalCards(d)).toBe(requiredDiscardCount(s, 0));
  expect(d.wood).toBeGreaterThanOrEqual(d.brick); // sheds the most-abundant first
});

test('randomAgent returns a legal action during setup', async () => {
  const s: any = createGame({ numPlayers: 4, seed: 5 });
  const p = s.setup.order[s.setup.index];
  const legal = getLegalActions(s, p);
  const a = await randomAgent.decide(s, legal, p);
  expect(() => applyAction(s, p, a)).not.toThrow();
});
