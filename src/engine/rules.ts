// src/engine/rules.ts
import type { State, NodeId, EdgeId, PlayerId, PortType } from './types';

export function pushLog(state: State, playerId: PlayerId, text: string): void {
  state.log.push({ turn: state.turn.turnNumber, player: playerId, text });
}

// A node is open for a settlement if empty and all neighbor nodes are empty (distance rule).
export function distanceOk(state: State, node: NodeId): boolean {
  const n = state.board.nodes[node]!;
  if (n.building) return false;
  return n.neighborNodeIds.every(m => state.board.nodes[m]!.building === null);
}

export function setupSettlementSpots(state: State): NodeId[] {
  return state.board.nodes.filter(n => distanceOk(state, n.id)).map(n => n.id);
}

export function roadSpotsFromNode(state: State, node: NodeId): EdgeId[] {
  return state.board.nodes[node]!.edgeIds.filter(e => state.board.edges[e]!.road === null);
}

export function updatePorts(state: State, playerId: PlayerId): void {
  const set = new Set<PortType>();
  for (const n of state.board.nodes)
    if (n.building?.owner === playerId && n.port !== null) set.add(n.port);
  state.players[playerId]!.ports = [...set];
}
