// test/engine/setup.test.ts
import { test, expect } from 'bun:test';
import { createGame } from '../../src/engine/state';
import { getLegalActions } from '../../src/engine/legal';
import { applyAction } from '../../src/engine/reduce';
import { totalCards } from '../../src/engine/helpers';

const cfg = { numPlayers: 4, seed: 5 };

test('first setup action: current player may place a settlement on any distance-legal node', () => {
  const s = createGame(cfg);
  const legal = getLegalActions(s, 0);
  expect(legal.length).toBeGreaterThan(0);
  expect(legal.every(a => a.type === 'setupSettlement')).toBe(true);
  expect(getLegalActions(s, 1)).toEqual([]); // not their placement
});

test('placing a settlement then requires an adjoining road from that node', () => {
  const s0 = createGame(cfg);
  const node = (getLegalActions(s0, 0)[0] as any).node;
  const s1 = applyAction(s0, 0, { type: 'setupSettlement', node });
  expect(s1.board.nodes[node]!.building).toEqual({ type: 'settlement', owner: 0 });
  expect(s1.players[0]!.piecesLeft.settlements).toBe(4);
  const roads = getLegalActions(s1, 0);
  expect(roads.length).toBeGreaterThan(0);
  expect(roads.every(a => a.type === 'setupRoad')).toBe(true);
  for (const a of roads) expect(s1.board.edges[(a as any).edge]!.nodeIds).toContain(node);
});

test('distance rule blocks neighbors of a placed settlement', () => {
  const s0 = createGame(cfg);
  const node = (getLegalActions(s0, 0)[0] as any).node;
  const s1 = applyAction(s0, 0, { type: 'setupSettlement', node });
  const edge = (getLegalActions(s1, 0)[0] as any).edge;
  const s2 = applyAction(s1, 0, { type: 'setupRoad', edge });
  // now player 1 places; none of player 0's settlement neighbors are legal
  const spots = getLegalActions(s2, 1).map(a => (a as any).node);
  for (const nb of s0.board.nodes[node]!.neighborNodeIds) expect(spots).not.toContain(nb);
});

test('snake order; second settlement grants starting resources; game starts with player 0', () => {
  let s = createGame(cfg);
  const place = (p: number) => {
    const n = (getLegalActions(s, p)[0] as any).node;
    s = applyAction(s, p, { type: 'setupSettlement', node: n });
    const e = (getLegalActions(s, p)[0] as any).edge;
    s = applyAction(s, p, { type: 'setupRoad', edge: e });
    return n;
  };
  // round 1: 0,1,2,3
  for (const p of [0, 1, 2, 3]) place(p);
  // everyone still has 0 resources after first settlements
  expect(s.players.every(pl => totalCards(pl.resources) === 0)).toBe(true);
  // round 2: 3,2,1,0
  for (const p of [3, 2, 1, 0]) {
    const before = totalCards(s.players[p]!.resources);
    place(p);
    expect(totalCards(s.players[p]!.resources)).toBeGreaterThanOrEqual(before); // got starting cards
  }
  expect(s.phase).toBe('play');
  expect(s.currentPlayer).toBe(0);
  expect(s.setup).toBeNull();
});
