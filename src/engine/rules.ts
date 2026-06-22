// src/engine/rules.ts
import type { State, NodeId, EdgeId, PlayerId, PortType, HexId, DevCardType, Resource } from './types';
import { RESOURCES } from './types';
import { totalCards } from './helpers';

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

export function requiredDiscardCount(state: State, playerId: PlayerId): number {
  const total = totalCards(state.players[playerId]!.resources);
  return total > 7 ? Math.floor(total / 2) : 0;
}

export function adjacentStealTargets(state: State, hexId: HexId, mover: PlayerId): PlayerId[] {
  const owners = new Set<PlayerId>();
  for (const nid of state.board.hexes[hexId]!.nodeIds) {
    const b = state.board.nodes[nid]!.building;
    if (b && b.owner !== mover && totalCards(state.players[b.owner]!.resources) > 0) owners.add(b.owner);
  }
  return [...owners];
}

function nodeIsConnectionPoint(state: State, node: NodeId, playerId: PlayerId): boolean {
  const b = state.board.nodes[node]!.building;
  if (b && b.owner !== playerId) return false; // blocked: cannot extend through an opponent building
  if (b && b.owner === playerId) return true;
  return state.board.nodes[node]!.edgeIds.some(e => state.board.edges[e]!.road?.owner === playerId);
}

export function canBuildRoad(state: State, edge: EdgeId, playerId: PlayerId): boolean {
  const e = state.board.edges[edge]!;
  if (e.road !== null) return false;
  return nodeIsConnectionPoint(state, e.nodeIds[0], playerId) || nodeIsConnectionPoint(state, e.nodeIds[1], playerId);
}
export function roadPlacements(state: State, playerId: PlayerId): EdgeId[] {
  return state.board.edges.filter(e => canBuildRoad(state, e.id, playerId)).map(e => e.id);
}

function nodeTouchesPlayerRoad(state: State, node: NodeId, playerId: PlayerId): boolean {
  return state.board.nodes[node]!.edgeIds.some(e => state.board.edges[e]!.road?.owner === playerId);
}
export function settlementPlacements(state: State, playerId: PlayerId): NodeId[] {
  return state.board.nodes
    .filter(n => distanceOk(state, n.id) && nodeTouchesPlayerRoad(state, n.id, playerId))
    .map(n => n.id);
}
export function cityPlacements(state: State, playerId: PlayerId): NodeId[] {
  return state.board.nodes
    .filter(n => n.building?.type === 'settlement' && n.building.owner === playerId)
    .map(n => n.id);
}

export function hasPlayableDev(state: State, playerId: PlayerId, type: DevCardType): boolean {
  if (state.turn.devCardPlayedThisTurn) return false;
  const p = state.players[playerId]!;
  return p.devCards.some(c => c.type === type && !c.played && c.boughtTurn < state.turn.turnNumber);
}

export function bankRatioFor(state: State, playerId: PlayerId, give: Resource): number {
  const ports = state.players[playerId]!.ports;
  if (ports.includes(give)) return 2;
  if (ports.includes('any')) return 3;
  return 4;
}
