// test/engine/roads.test.ts
import { test, expect } from 'bun:test';
import { longestRoadLength } from '../../src/engine/roads';

// Minimal board fixture: a line of nodes 0..5 with edges between consecutive nodes.
function lineState(roadOwners: (number | null)[], buildings: Record<number, { owner: number }>) {
  const nodeCount = roadOwners.length + 1;
  const nodes = Array.from({ length: nodeCount }, (_, id) => ({
    id, hexIds: [], edgeIds: [] as number[], neighborNodeIds: [] as number[], port: null,
    building: buildings[id] ? { type: 'settlement', owner: buildings[id]!.owner } : null,
  }));
  const edges = roadOwners.map((owner, i) => ({
    id: i, nodeIds: [i, i + 1] as [number, number], hexIds: [],
    road: owner === null ? null : { owner },
  }));
  for (const e of edges) { nodes[e.nodeIds[0]]!.edgeIds.push(e.id); nodes[e.nodeIds[1]]!.edgeIds.push(e.id); }
  return { board: { nodes, edges } } as any;
}

test('a straight line of 5 roads has length 5', () => {
  const s = lineState([0, 0, 0, 0, 0], {});
  expect(longestRoadLength(s, 0)).toBe(5);
});

test('no roads → length 0', () => {
  expect(longestRoadLength(lineState([null, null], {}), 0)).toBe(0);
});

test("opponent settlement in the middle breaks the road", () => {
  // roads 0-1-2-3-4-5 owned by player 0, opponent (1) settles on node 2
  const s = lineState([0, 0, 0, 0, 0], { 2: { owner: 1 } });
  // left piece (0-1-2) = 2 ending at the blocked node; right piece (2-3-4-5) = 3 starting at it
  expect(longestRoadLength(s, 0)).toBe(3);
});

test('own settlement in the middle does NOT break the road', () => {
  const s = lineState([0, 0, 0, 0, 0], { 2: { owner: 0 } });
  expect(longestRoadLength(s, 0)).toBe(5);
});

test('a branch does not add to the trail length', () => {
  // path 0-1-2-3 plus a branch edge 1-4: longest trail is 3, not 4
  const nodes = Array.from({ length: 5 }, (_, id) => ({
    id, hexIds: [], edgeIds: [] as number[], neighborNodeIds: [], port: null, building: null,
  }));
  const edges = [
    { id: 0, nodeIds: [0, 1] as [number, number], hexIds: [], road: { owner: 0 } },
    { id: 1, nodeIds: [1, 2] as [number, number], hexIds: [], road: { owner: 0 } },
    { id: 2, nodeIds: [2, 3] as [number, number], hexIds: [], road: { owner: 0 } },
    { id: 3, nodeIds: [1, 4] as [number, number], hexIds: [], road: { owner: 0 } },
  ];
  for (const e of edges) { nodes[e.nodeIds[0]]!.edgeIds.push(e.id); nodes[e.nodeIds[1]]!.edgeIds.push(e.id); }
  const s = { board: { nodes, edges } } as any;
  expect(longestRoadLength(s, 0)).toBe(3);
});
