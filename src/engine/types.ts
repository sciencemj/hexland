// src/engine/types.ts
import type { Rng } from './rng';

export type HexId = number;
export type NodeId = number;
export type EdgeId = number;
export type PlayerId = number;

export type Resource = 'wood' | 'brick' | 'sheep' | 'wheat' | 'ore';
export const RESOURCES: Resource[] = ['wood', 'brick', 'sheep', 'wheat', 'ore'];

export type Terrain = 'forest' | 'hills' | 'pasture' | 'fields' | 'mountains' | 'desert';
export const TERRAIN_RESOURCE: Record<Terrain, Resource | null> = {
  forest: 'wood', hills: 'brick', pasture: 'sheep', fields: 'wheat', mountains: 'ore', desert: null,
};

export type ResourceMap = Record<Resource, number>;
export const emptyResources = (): ResourceMap => ({ wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 });

export type PortType = Resource | 'any'; // 'any' = generic 3:1

export type DevCardType = 'knight' | 'victory' | 'roadBuilding' | 'yearOfPlenty' | 'monopoly';

export interface Hex { id: HexId; terrain: Terrain; token: number | null; nodeIds: NodeId[]; }
export interface Node {
  id: NodeId; hexIds: HexId[]; edgeIds: EdgeId[]; neighborNodeIds: NodeId[];
  port: PortType | null;
  building: { type: 'settlement' | 'city'; owner: PlayerId } | null;
}
export interface Edge { id: EdgeId; nodeIds: [NodeId, NodeId]; hexIds: HexId[]; road: { owner: PlayerId } | null; }

export interface Board { hexes: Hex[]; nodes: Node[]; edges: Edge[]; robberHex: HexId; portSlots: EdgeId[]; }

export interface DevCard { type: DevCardType; boughtTurn: number; played: boolean; }

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Player {
  id: PlayerId; name: string; color: string; isAI: boolean; aiDifficulty: Difficulty | null;
  resources: ResourceMap;
  devCards: DevCard[];
  playedKnights: number;
  piecesLeft: { roads: number; settlements: number; cities: number };
  ports: PortType[];
}

export type Phase = 'setup' | 'play' | 'ended';

export interface SetupState { order: PlayerId[]; index: number; needRoadFrom: NodeId | null; }

export interface TurnState {
  hasRolled: boolean;
  dice: [number, number] | null;
  devCardPlayedThisTurn: boolean;
  turnNumber: number;
  freeRoads: number; // remaining free roads from a Road Building card
}

export type Pending =
  | { kind: 'discard'; remaining: PlayerId[] }
  | { kind: 'robber'; mover: PlayerId; viaKnight: boolean }
  | { kind: 'tradeOffer'; from: PlayerId; to: PlayerId; give: ResourceMap; want: ResourceMap };

export interface LogEntry { turn: number; player: PlayerId; text: string; }

export interface State {
  config: { numPlayers: number; layoutMode: 'random' };
  rng: Rng;
  phase: Phase;
  setup: SetupState | null;
  board: Board;
  players: Player[];
  bank: { resources: ResourceMap; devDeck: DevCardType[] };
  bonuses: { longestRoad: PlayerId | null; largestArmy: PlayerId | null };
  currentPlayer: PlayerId;
  turn: TurnState;
  pending: Pending | null;
  log: LogEntry[];
  winner: PlayerId | null;
}

export interface GameConfig {
  numPlayers: number;           // 2..4 (1 human + 1..3 AI)
  humanCount?: number;          // default 1
  seed: number;
  names?: string[];
  layoutMode?: 'random';
  difficulty?: Difficulty;      // AI strength (default 'medium')
}

export type Action =
  | { type: 'setupSettlement'; node: NodeId }
  | { type: 'setupRoad'; edge: EdgeId }
  | { type: 'rollDice' }
  | { type: 'buildRoad'; edge: EdgeId }
  | { type: 'buildSettlement'; node: NodeId }
  | { type: 'buildCity'; node: NodeId }
  | { type: 'buyDevCard' }
  | { type: 'playKnight'; hex: HexId; stealFrom: PlayerId | null }
  | { type: 'playRoadBuilding' }
  | { type: 'playYearOfPlenty'; resources: [Resource, Resource] }
  | { type: 'playMonopoly'; resource: Resource }
  | { type: 'tradeBank'; give: Resource; receive: Resource }
  | { type: 'tradeOffer'; to: PlayerId; give: ResourceMap; want: ResourceMap }
  | { type: 'tradeRespond'; accept: boolean }
  | { type: 'discard'; resources: ResourceMap }
  | { type: 'moveRobber'; hex: HexId; stealFrom: PlayerId | null }
  | { type: 'endTurn' };
