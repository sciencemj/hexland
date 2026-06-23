// src/ui/insights.ts
// Pure, UI-layer derivations for the info panel. All inputs come from the
// engine State; nothing here mutates. Opponent values exposed here are PUBLIC
// information only (card counts, played knights, bonuses, and the production
// profile that anyone can read off the visible board) — never hidden hands.
import type { State, PlayerId, Resource } from '../engine/types';
import { RESOURCES, TERRAIN_RESOURCE } from '../engine/types';
import { COSTS, canAfford, totalCards } from '../engine/helpers';
import { longestRoadLength } from '../engine/roads';
import { tRes, type TFn } from './i18n';

// Number of dice combinations that roll each token (probability proxy).
const PIP: Record<number, number> = { 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1 };

export interface ProdEntry { resource: Resource; pips: number; numbers: number[]; }

// What a player produces, derived from their settlements (1x) and cities (2x)
// on the visible board. `pips` = summed dice-combo weight (higher = more likely).
export function productionProfile(state: State, playerId: PlayerId): ProdEntry[] {
  const pips: Record<Resource, number> = { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 };
  const nums: Record<Resource, Set<number>> = {
    wood: new Set(), brick: new Set(), sheep: new Set(), wheat: new Set(), ore: new Set(),
  };
  for (const node of state.board.nodes) {
    if (node.building?.owner !== playerId) continue;
    const mult = node.building.type === 'city' ? 2 : 1;
    for (const hid of node.hexIds) {
      const hex = state.board.hexes[hid]!;
      const res = TERRAIN_RESOURCE[hex.terrain];
      if (!res || hex.token === null) continue;
      pips[res] += (PIP[hex.token] ?? 0) * mult;
      nums[res].add(hex.token);
    }
  }
  return RESOURCES
    .map(r => ({ resource: r, pips: pips[r], numbers: [...nums[r]].sort((a, b) => a - b) }))
    .filter(e => e.pips > 0);
}

// Victory points that are PUBLIC: buildings + bonuses, excluding hidden VP cards.
export function publicVictoryPoints(state: State, playerId: PlayerId): number {
  let vp = 0;
  for (const n of state.board.nodes) {
    if (n.building?.owner === playerId) vp += n.building.type === 'city' ? 2 : 1;
  }
  if (state.bonuses.longestRoad === playerId) vp += 2;
  if (state.bonuses.largestArmy === playerId) vp += 2;
  return vp;
}

// Situational advice based on the human's current state, returned already
// translated via the supplied t(). Tip text lives in the i18n dictionary.
export function contextualTips(state: State, playerId: PlayerId, t: TFn): string[] {
  const tips: string[] = [];
  if (state.phase === 'setup') {
    tips.push(t('tip.setup1'));
    tips.push(t('tip.setup2'));
    return tips;
  }
  const p = state.players[playerId]!;
  const cards = totalCards(p.resources);

  if (cards > 7) tips.push(t('tip.discard', { cards, n: Math.floor(cards / 2) }));

  if (canAfford(p.resources, COSTS.city)) tips.push(t('tip.canCity'));
  else if (canAfford(p.resources, COSTS.settlement)) tips.push(t('tip.canSettlement'));
  if (canAfford(p.resources, COSTS.devCard)) tips.push(t('tip.canDev'));

  if (state.bonuses.largestArmy !== playerId && p.playedKnights >= 2)
    tips.push(t(state.bonuses.largestArmy === null ? 'tip.knightClaim' : 'tip.knightSeize'));

  if (state.bonuses.longestRoad !== playerId && longestRoadLength(state, playerId) === 4)
    tips.push(t('tip.longestRoad'));

  const produced = new Set(productionProfile(state, playerId).map(e => e.resource));
  const missing = RESOURCES.filter(r => !produced.has(r));
  if (missing.length) tips.push(t('tip.missing', { list: missing.map(r => tRes(t, r)).join('/') }));

  if (tips.length === 0) tips.push(t('tip.default'));
  return tips;
}
