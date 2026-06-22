// src/engine/scoring.ts
import type { State } from './types';
import { longestRoadLength } from './roads';

export function recomputeLongestRoad(state: State): void {
  const lengths = state.players.map(p => longestRoadLength(state, p.id));
  const maxLen = Math.max(...lengths);
  const holder = state.bonuses.longestRoad;
  if (maxLen < 5) { state.bonuses.longestRoad = null; return; }
  if (holder !== null && lengths[holder]! === maxLen) return; // holder leads or ties → keeps it
  const leaders = lengths.map((l, i) => ({ l, i })).filter(x => x.l === maxLen).map(x => x.i);
  if (leaders.length === 1) state.bonuses.longestRoad = leaders[0]!;
  else state.bonuses.longestRoad = (holder !== null && lengths[holder]! >= 5) ? holder : null;
}

export function recomputeArmy(state: State): void {
  const counts = state.players.map(p => p.playedKnights);
  const maxA = Math.max(...counts);
  const holder = state.bonuses.largestArmy;
  if (maxA < 3) { state.bonuses.largestArmy = null; return; }
  if (holder !== null && counts[holder]! === maxA) return;
  const leaders = counts.map((c, i) => ({ c, i })).filter(x => x.c === maxA).map(x => x.i);
  if (leaders.length === 1) state.bonuses.largestArmy = leaders[0]!;
  else state.bonuses.largestArmy = (holder !== null && counts[holder]! >= 3) ? holder : null;
}

export function recomputeBonuses(state: State): void {
  recomputeLongestRoad(state);
  recomputeArmy(state);
}
