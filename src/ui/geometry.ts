import { buildTopology } from '../engine/topology';

export const TOPO = buildTopology();
const R = 56;          // hex radius in pixels
const PAD = R * 0.9;

const xs = TOPO.nodes.map(n => n.x);
const ys = TOPO.nodes.map(n => n.y);
const minX = Math.min(...xs), minY = Math.min(...ys);
const px = (x: number) => (x - minX) * R + PAD;
const py = (y: number) => (y - minY) * R + PAD;

export const VIEW = {
  width: (Math.max(...xs) - minX) * R + PAD * 2,
  height: (Math.max(...ys) - minY) * R + PAD * 2,
};

export const nodePoint = (id: number) => ({ x: px(TOPO.nodes[id]!.x), y: py(TOPO.nodes[id]!.y) });
export const hexCenterPx = (id: number) => ({ x: px(TOPO.hexCenters[id]!.x), y: py(TOPO.hexCenters[id]!.y) });
export const hexPolygon = (id: number) =>
  TOPO.hexes[id]!.nodeIds.map(nid => { const p = nodePoint(nid); return `${p.x},${p.y}`; }).join(' ');
export function edgeSegment(id: number) {
  const e = TOPO.edges[id]!;
  const a = nodePoint(e.nodeIds[0]), b = nodePoint(e.nodeIds[1]);
  return { x1: a.x, y1: a.y, x2: b.x, y2: b.y, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
}
