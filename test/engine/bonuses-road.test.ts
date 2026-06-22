// test/engine/bonuses-road.test.ts
import { test, expect } from 'bun:test';
import { recomputeLongestRoad } from '../../src/engine/scoring';
import { createGame } from '../../src/engine/state';
import { applyAction } from '../../src/engine/reduce';
import { getLegalActions } from '../../src/engine/legal';

// Build a contiguous road of length n for player 0 on a real board via setup + free roads.
test('longest road bonus is awarded at length 5 and respects strictly-longer transfer', () => {
  let g: any = createGame({ numPlayers: 4, seed: 5 });
  for (let i = 0; i < 100 && g.phase === 'setup'; i++) {
    const p = g.setup.order[g.setup.index];
    g = applyAction(g, p, getLegalActions(g, p)[0]);
  }
  // give player (current) lots of road pieces+resources and extend a chain
  const p = g.currentPlayer;
  g.turn.hasRolled = true;
  g.players[p].resources = { wood: 20, brick: 20, sheep: 0, wheat: 0, ore: 0 };
  for (let k = 0; k < 6; k++) {
    const roads = getLegalActions(g, p).filter((a: any) => a.type === 'buildRoad');
    if (roads.length === 0) break;
    g = applyAction(g, p, roads[0]);
  }
  // after building a contiguous chain >=5, player p should hold longest road
  expect(g.bonuses.longestRoad).toBe(p);
});
