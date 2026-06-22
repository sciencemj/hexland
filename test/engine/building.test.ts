// test/engine/building.test.ts
import { test, expect } from 'bun:test';
import { createGame } from '../../src/engine/state';
import { applyAction } from '../../src/engine/reduce';
import { getLegalActions } from '../../src/engine/legal';
import { roadPlacements, settlementPlacements, cityPlacements } from '../../src/engine/rules';

function freshPlay() {
  let g: any = createGame({ numPlayers: 4, seed: 5 });
  for (let i = 0; i < 100 && g.phase === 'setup'; i++) {
    const p = g.setup.order[g.setup.index];
    g = applyAction(g, p, getLegalActions(g, p)[0]);
  }
  g.turn.hasRolled = true; // skip the roll for build tests
  return g;
}

test('building a road costs wood+brick, connects to your network, decrements pieces', () => {
  const s: any = freshPlay();
  const p = s.currentPlayer;
  s.players[p].resources = { wood: 1, brick: 1, sheep: 0, wheat: 0, ore: 0 };
  const edge = roadPlacements(s, p)[0];
  const after = applyAction(s, p, { type: 'buildRoad', edge });
  expect(after.board.edges[edge].road).toEqual({ owner: p });
  expect(after.players[p].resources).toEqual({ wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 });
  expect(after.players[p].piecesLeft.roads).toBe(12); // setup placed 2 roads → 15-2=13, then -1 = 12
});

test('cannot build a road with insufficient resources', () => {
  const s: any = freshPlay();
  const p = s.currentPlayer;
  s.players[p].resources = { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 };
  const edge = roadPlacements(s, p)[0];
  expect(() => applyAction(s, p, { type: 'buildRoad', edge })).toThrow();
});

test('settlement requires distance + your road; costs the 4-resource bundle', () => {
  const s: any = freshPlay();
  const p = s.currentPlayer;
  // extend roads to create a fresh, distance-legal node touching the new road (5 roads + 1 settlement)
  s.players[p].resources = { wood: 9, brick: 9, sheep: 5, wheat: 5, ore: 0 };
  let g = s;
  // build roads outward to reach an open node (greedy first-pick setup clusters players; needs 5 roads to escape)
  for (let k = 0; k < 5; k++) {
    const e = roadPlacements(g, p)[0];
    g = applyAction(g, p, { type: 'buildRoad', edge: e });
  }
  const spots = settlementPlacements(g, p);
  expect(spots.length).toBeGreaterThan(0);
  const before = g.players[p].resources;
  const g2 = applyAction(g, p, { type: 'buildSettlement', node: spots[0] });
  expect(g2.board.nodes[spots[0]].building).toEqual({ type: 'settlement', owner: p });
  expect(g2.players[p].resources.wheat).toBe(before.wheat - 1);
  expect(g2.players[p].piecesLeft.settlements).toBe(g.players[p].piecesLeft.settlements - 1);
});

test('city upgrades your own settlement: costs 3 ore + 2 wheat, returns a settlement piece', () => {
  const s: any = freshPlay();
  const p = s.currentPlayer;
  const myNode = cityPlacements(s, p)[0]; // a setup settlement
  s.players[p].resources = { wood: 0, brick: 0, sheep: 0, wheat: 2, ore: 3 };
  const before = s.players[p].piecesLeft;
  const after = applyAction(s, p, { type: 'buildCity', node: myNode });
  expect(after.board.nodes[myNode].building).toEqual({ type: 'city', owner: p });
  expect(after.players[p].resources).toEqual({ wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 });
  expect(after.players[p].piecesLeft.cities).toBe(before.cities - 1);
  expect(after.players[p].piecesLeft.settlements).toBe(before.settlements + 1);
});

test('free roads from Road Building do not cost resources', () => {
  const s: any = freshPlay();
  const p = s.currentPlayer;
  s.players[p].resources = { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 };
  s.turn.freeRoads = 2;
  const edge = roadPlacements(s, p)[0];
  const after = applyAction(s, p, { type: 'buildRoad', edge });
  expect(after.players[p].resources).toEqual({ wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 });
  expect(after.turn.freeRoads).toBe(1);
});
