import { test, expect } from 'bun:test';
import { makeRng } from '../../src/engine/rng';
import { generateBoard } from '../../src/engine/board';
import type { Terrain } from '../../src/engine/types';

function terrainCounts(t: Terrain[]) {
  const c: Record<string, number> = {};
  for (const x of t) c[x] = (c[x] ?? 0) + 1;
  return c;
}

test('terrain multiset is exactly the base game set', () => {
  const { board } = generateBoard(makeRng(1));
  const c = terrainCounts(board.hexes.map(h => h.terrain));
  expect(c).toEqual({ forest: 4, fields: 4, pasture: 4, hills: 3, mountains: 3, desert: 1 });
});

test('desert has no token; all others have a token; token multiset correct', () => {
  const { board } = generateBoard(makeRng(2));
  const tokens: number[] = [];
  for (const h of board.hexes) {
    if (h.terrain === 'desert') expect(h.token).toBeNull();
    else { expect(h.token).not.toBeNull(); tokens.push(h.token!); }
  }
  const c: Record<number, number> = {};
  for (const n of tokens) c[n] = (c[n] ?? 0) + 1;
  expect(c).toEqual({ 2:1, 3:2, 4:2, 5:2, 6:2, 8:2, 9:2, 10:2, 11:2, 12:1 });
});

test('robber starts on the desert', () => {
  const { board } = generateBoard(makeRng(3));
  expect(board.hexes[board.robberHex]!.terrain).toBe('desert');
});

test('no two red number tokens (6 or 8) are adjacent', () => {
  for (let seed = 0; seed < 25; seed++) {
    const { board } = generateBoard(makeRng(seed));
    for (const e of board.edges) {
      if (e.hexIds.length === 2) {
        const [a, b] = e.hexIds;
        const ta = board.hexes[a!]!.token, tb = board.hexes[b!]!.token;
        const red = (x: number | null) => x === 6 || x === 8;
        expect(red(ta) && red(tb)).toBe(false);
      }
    }
  }
});

test('exactly 9 ports: 4 generic + one of each resource; ports attached to node pairs', () => {
  const { board } = generateBoard(makeRng(4));
  const portNodes = board.nodes.filter(n => n.port !== null);
  const counts: Record<string, number> = {};
  for (const slot of board.portSlots) {
    const e = board.edges[slot]!;
    const type = board.nodes[e.nodeIds[0]]!.port;
    expect(board.nodes[e.nodeIds[1]]!.port).toBe(type); // both endpoints share the port
    counts[type as string] = (counts[type as string] ?? 0) + 1;
  }
  expect(counts).toEqual({ any: 4, wood: 1, brick: 1, sheep: 1, wheat: 1, ore: 1 });
  expect(portNodes.length).toBe(18); // 9 slots × 2 endpoints
});

test('generation is deterministic for a seed', () => {
  const a = generateBoard(makeRng(99)).board.hexes.map(h => [h.terrain, h.token]);
  const b = generateBoard(makeRng(99)).board.hexes.map(h => [h.terrain, h.token]);
  expect(a).toEqual(b);
});
