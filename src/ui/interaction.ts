// src/ui/interaction.ts
import type { State, Action, NodeId, EdgeId, HexId } from '../engine/types';

export type Mode = 'idle' | 'road' | 'settlement' | 'city' | 'robber' | 'knight';

const uniq = <T,>(xs: T[]) => [...new Set(xs)];

export function highlightsFor(state: State, legal: Action[], mode: Mode) {
  const empty = { nodes: [] as NodeId[], edges: [] as EdgeId[], hexes: [] as HexId[] };
  if (state.pending?.kind === 'robber')
    return { ...empty, hexes: uniq(legal.filter(a => a.type === 'moveRobber' || a.type === 'playKnight').map(a => (a as any).hex)) };
  if (state.phase === 'setup') {
    if (legal[0]?.type === 'setupSettlement') return { ...empty, nodes: legal.map(a => (a as any).node) };
    return { ...empty, edges: legal.map(a => (a as any).edge) };
  }
  if (mode === 'road') return { ...empty, edges: legal.filter(a => a.type === 'buildRoad').map(a => (a as any).edge) };
  if (mode === 'settlement') return { ...empty, nodes: legal.filter(a => a.type === 'buildSettlement').map(a => (a as any).node) };
  if (mode === 'city') return { ...empty, nodes: legal.filter(a => a.type === 'buildCity').map(a => (a as any).node) };
  if (mode === 'knight') return { ...empty, hexes: uniq(legal.filter(a => a.type === 'playKnight').map(a => (a as any).hex)) };
  return empty;
}

export function actionForNode(state: State, legal: Action[], mode: Mode, id: NodeId): Action | null {
  const want =
    state.phase === 'setup' ? 'setupSettlement' :
    mode === 'city' ? 'buildCity' : 'buildSettlement';
  return legal.find(a => a.type === want && (a as any).node === id) ?? null;
}

export function actionForEdge(state: State, legal: Action[], _mode: Mode, id: EdgeId): Action | null {
  const want = state.phase === 'setup' ? 'setupRoad' : 'buildRoad';
  return legal.find(a => a.type === want && (a as any).edge === id) ?? null;
}

export function robberOptionsForHex(_state: State, legal: Action[], id: HexId): Action[] {
  return legal.filter(a => (a.type === 'moveRobber' || a.type === 'playKnight') && (a as any).hex === id);
}
