// test/engine/topology.test.ts
import { test, expect } from 'bun:test';
import { buildTopology } from '../../src/engine/topology';

test('board has 19 hexes, 54 nodes, 72 edges', () => {
  const t = buildTopology();
  expect(t.hexes.length).toBe(19);
  expect(t.nodes.length).toBe(54);
  expect(t.edges.length).toBe(72);
});

test('each hex references exactly 6 corner nodes', () => {
  const t = buildTopology();
  for (const h of t.hexes) expect(h.nodeIds.length).toBe(6);
});

test('node-neighbor adjacency is symmetric', () => {
  const t = buildTopology();
  for (const n of t.nodes)
    for (const m of n.neighborNodeIds)
      expect(t.nodes[m]!.neighborNodeIds).toContain(n.id);
});

test('every node touches 1–3 hexes; every edge has 2 endpoints', () => {
  // 19-hex radius-2 board: coastal "tip" nodes touch exactly 1 land hex
  // (18 such nodes by Euler's formula); interior nodes touch 2 or 3.
  const t = buildTopology();
  for (const n of t.nodes) {
    expect(n.hexIds.length).toBeGreaterThanOrEqual(1);
    expect(n.hexIds.length).toBeLessThanOrEqual(3);
  }
  for (const e of t.edges) expect(e.nodeIds.length).toBe(2);
});

test('there are exactly 9 distinct coastal port slots', () => {
  const t = buildTopology();
  expect(t.portSlots.length).toBe(9);
  expect(new Set(t.portSlots).size).toBe(9);
  // every port slot is a coastal edge (touches exactly 1 hex)
  for (const e of t.portSlots) expect(t.edges[e]!.hexIds.length).toBe(1);
});

test('edge/node back-references are consistent', () => {
  const t = buildTopology();
  for (const e of t.edges)
    for (const nid of e.nodeIds)
      expect(t.nodes[nid]!.edgeIds).toContain(e.id);
});
