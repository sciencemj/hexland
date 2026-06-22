import { RESOURCES, emptyResources, type ResourceMap, type State, type PlayerId } from './types';

export const COSTS: Record<'road' | 'settlement' | 'city' | 'devCard', ResourceMap> = {
  road: { wood: 1, brick: 1, sheep: 0, wheat: 0, ore: 0 },
  settlement: { wood: 1, brick: 1, sheep: 1, wheat: 1, ore: 0 },
  city: { wood: 0, brick: 0, sheep: 0, wheat: 2, ore: 3 },
  devCard: { wood: 0, brick: 0, sheep: 1, wheat: 1, ore: 1 },
};

export const totalCards = (r: ResourceMap): number => RESOURCES.reduce((s, k) => s + r[k], 0);
export const canAfford = (r: ResourceMap, cost: ResourceMap): boolean => RESOURCES.every(k => r[k] >= cost[k]);

export function addRes(a: ResourceMap, b: ResourceMap): ResourceMap {
  const out = emptyResources();
  for (const k of RESOURCES) out[k] = a[k] + b[k];
  return out;
}
export function subRes(a: ResourceMap, b: ResourceMap): ResourceMap {
  const out = emptyResources();
  for (const k of RESOURCES) out[k] = a[k] - b[k];
  return out;
}

export function countVictoryPoints(state: State, playerId: PlayerId): number {
  let vp = 0;
  for (const n of state.board.nodes) {
    if (n.building?.owner === playerId) vp += n.building.type === 'city' ? 2 : 1;
  }
  const p = state.players[playerId]!;
  vp += p.devCards.filter(c => c.type === 'victory').length;
  if (state.bonuses.longestRoad === playerId) vp += 2;
  if (state.bonuses.largestArmy === playerId) vp += 2;
  return vp;
}

export const clone = <T>(x: T): T => structuredClone(x);
