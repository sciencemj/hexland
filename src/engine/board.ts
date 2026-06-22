import { buildTopology } from './topology';
import { shuffle, type Rng } from './rng';
import type { Board, Hex, Node, Edge, Terrain, PortType } from './types';

const TERRAINS: Terrain[] = [
  ...Array(4).fill('forest'), ...Array(4).fill('fields'), ...Array(4).fill('pasture'),
  ...Array(3).fill('hills'), ...Array(3).fill('mountains'), 'desert',
] as Terrain[];

const TOKENS = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12]; // 18, no 7
const PORTS: PortType[] = ['any', 'any', 'any', 'any', 'wood', 'brick', 'sheep', 'wheat', 'ore'];

const isRed = (t: number | null) => t === 6 || t === 8;

export function generateBoard(rng: Rng): { board: Board; rng: Rng } {
  const topo = buildTopology();
  let cur = rng;

  // terrain
  const shT = shuffle(cur, TERRAINS); cur = shT.rng;
  const terrains = shT.value;
  const desertIndex = terrains.indexOf('desert');

  // tokens: retry shuffles until no two reds adjacent (board is small; converges fast)
  let tokenForHex: (number | null)[] = [];
  for (let attempt = 0; attempt < 1000; attempt++) {
    const shTok = shuffle(cur, TOKENS); cur = shTok.rng;
    const order = shTok.value;
    const assign: (number | null)[] = [];
    let oi = 0;
    for (let h = 0; h < terrains.length; h++) assign.push(h === desertIndex ? null : order[oi++]!);
    const ok = topo.edges.every(e => {
      if (e.hexIds.length !== 2) return true;
      const [a, b] = e.hexIds;
      return !(isRed(assign[a!]!) && isRed(assign[b!]!));
    });
    if (ok) { tokenForHex = assign; break; }
  }

  // ports
  const shP = shuffle(cur, PORTS); cur = shP.rng;
  const portTypes = shP.value;

  const hexes: Hex[] = topo.hexes.map((h, i) => ({
    id: h.id, terrain: terrains[i]!, token: tokenForHex[i]!, nodeIds: h.nodeIds,
  }));
  const nodes: Node[] = topo.nodes.map(n => ({
    id: n.id, hexIds: n.hexIds, edgeIds: n.edgeIds, neighborNodeIds: n.neighborNodeIds,
    port: null, building: null,
  }));
  const edges: Edge[] = topo.edges.map(e => ({ id: e.id, nodeIds: e.nodeIds, hexIds: e.hexIds, road: null }));

  topo.portSlots.forEach((slot, i) => {
    const e = edges[slot]!;
    nodes[e.nodeIds[0]]!.port = portTypes[i]!;
    nodes[e.nodeIds[1]]!.port = portTypes[i]!;
  });

  const board: Board = { hexes, nodes, edges, robberHex: desertIndex, portSlots: topo.portSlots };
  return { board, rng: cur };
}
