import { test, expect } from 'bun:test';
import { VIEW, nodePoint, hexPolygon, edgeSegment, TOPO } from '../../src/ui/geometry';

test('viewport is positive and finite', () => {
  expect(VIEW.width).toBeGreaterThan(0);
  expect(VIEW.height).toBeGreaterThan(0);
});

test('every node maps to a point inside the viewport', () => {
  for (const n of TOPO.nodes) {
    const p = nodePoint(n.id);
    expect(p.x).toBeGreaterThanOrEqual(0); expect(p.x).toBeLessThanOrEqual(VIEW.width);
    expect(p.y).toBeGreaterThanOrEqual(0); expect(p.y).toBeLessThanOrEqual(VIEW.height);
  }
});

test('hexPolygon yields 6 coordinate pairs', () => {
  expect(hexPolygon(0).trim().split(/\s+/).length).toBe(6);
});

test('edgeSegment endpoints equal its node points', () => {
  const e = TOPO.edges[0]!;
  const seg = edgeSegment(0);
  const a = nodePoint(e.nodeIds[0]), b = nodePoint(e.nodeIds[1]);
  expect([seg.x1, seg.y1]).toEqual([a.x, a.y]);
  expect([seg.x2, seg.y2]).toEqual([b.x, b.y]);
});
