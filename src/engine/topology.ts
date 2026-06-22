// src/engine/topology.ts
import type { HexId, NodeId, EdgeId } from './types';

export interface Topology {
  hexes: { id: HexId; q: number; r: number; nodeIds: NodeId[] }[];
  nodes: { id: NodeId; x: number; y: number; hexIds: HexId[]; edgeIds: EdgeId[]; neighborNodeIds: NodeId[] }[];
  edges: { id: EdgeId; nodeIds: [NodeId, NodeId]; hexIds: HexId[] }[];
  portSlots: EdgeId[];
  hexCenters: { x: number; y: number }[];
}

const SIZE = 1;
const SQRT3 = Math.sqrt(3);

function hexCenter(q: number, r: number) {
  return { x: SIZE * SQRT3 * (q + r / 2), y: SIZE * 1.5 * r };
}
function corner(cx: number, cy: number, i: number) {
  const a = (Math.PI / 180) * (60 * i - 30); // pointy-top
  return { x: cx + SIZE * Math.cos(a), y: cy + SIZE * Math.sin(a) };
}
const key = (p: { x: number; y: number }) => `${Math.round(p.x * 10000)}_${Math.round(p.y * 10000)}`;

export function buildTopology(): Topology {
  // 1. axial coords for a radius-2 hexagon (19 hexes)
  const axials: { q: number; r: number }[] = [];
  for (let q = -2; q <= 2; q++)
    for (let r = -2; r <= 2; r++)
      if (Math.abs(q + r) <= 2) axials.push({ q, r });

  const hexCenters = axials.map(a => hexCenter(a.q, a.r));

  // 2. dedupe corners → nodes
  const nodeKey = new Map<string, NodeId>();
  const nodePos: { x: number; y: number }[] = [];
  const hexNodeIds: NodeId[][] = axials.map(() => []);
  axials.forEach((_, hi) => {
    const c = hexCenters[hi]!;
    for (let i = 0; i < 6; i++) {
      const p = corner(c.x, c.y, i);
      const k = key(p);
      let id = nodeKey.get(k);
      if (id === undefined) { id = nodePos.length; nodeKey.set(k, id); nodePos.push(p); }
      hexNodeIds[hi]!.push(id);
    }
  });

  // 3. dedupe edges from consecutive hex corners
  const edgeKey = new Map<string, EdgeId>();
  const edges: { id: EdgeId; nodeIds: [NodeId, NodeId]; hexIds: HexId[] }[] = [];
  const nodeHexIds: Set<HexId>[] = nodePos.map(() => new Set());
  axials.forEach((_, hi) => {
    const ring = hexNodeIds[hi]!;
    for (let i = 0; i < 6; i++) {
      const a = ring[i]!, b = ring[(i + 1) % 6]!;
      nodeHexIds[a]!.add(hi); nodeHexIds[b]!.add(hi);
      const ek = a < b ? `${a}_${b}` : `${b}_${a}`;
      let id = edgeKey.get(ek);
      if (id === undefined) {
        id = edges.length; edgeKey.set(ek, id);
        edges.push({ id, nodeIds: [a, b], hexIds: [hi] });
      } else if (!edges[id]!.hexIds.includes(hi)) {
        edges[id]!.hexIds.push(hi);
      }
    }
  });

  // 4. node back-references
  const nodeEdgeIds: EdgeId[][] = nodePos.map(() => []);
  const nodeNeighbors: Set<NodeId>[] = nodePos.map(() => new Set());
  for (const e of edges) {
    const [a, b] = e.nodeIds;
    nodeEdgeIds[a]!.push(e.id); nodeEdgeIds[b]!.push(e.id);
    nodeNeighbors[a]!.add(b); nodeNeighbors[b]!.add(a);
  }

  const nodes = nodePos.map((p, id) => ({
    id, x: p.x, y: p.y,
    hexIds: [...nodeHexIds[id]!].sort((x, y) => x - y),
    edgeIds: nodeEdgeIds[id]!.slice(),
    neighborNodeIds: [...nodeNeighbors[id]!].sort((x, y) => x - y),
  }));

  const hexes = axials.map((a, id) => ({ id, q: a.q, r: a.r, nodeIds: hexNodeIds[id]!.slice() }));

  // 5. coastal edges (1 adjacent hex), ordered clockwise by midpoint angle, pick 9 spread slots
  const coastal = edges.filter(e => e.hexIds.length === 1);
  const ang = (e: { nodeIds: [NodeId, NodeId] }) => {
    const a = nodes[e.nodeIds[0]]!, b = nodes[e.nodeIds[1]]!;
    return Math.atan2((a.y + b.y) / 2, (a.x + b.x) / 2);
  };
  coastal.sort((e1, e2) => ang(e1) - ang(e2));
  // 30 coastal edges → 9 ports spread with 2–3 edge gaps (deterministic, evenly distributed)
  const PORT_INDICES = [0, 3, 6, 10, 13, 16, 20, 23, 26];
  const portSlots = PORT_INDICES.map(i => coastal[i % coastal.length]!.id);

  return { hexes, nodes, edges, portSlots, hexCenters };
}
