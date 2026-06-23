// test/ui/insights.test.ts
import { test, expect } from 'bun:test';
import { createGame } from '../../src/engine/state';
import { productionProfile, publicVictoryPoints, contextualTips } from '../../src/ui/insights';
import { translate } from '../../src/ui/i18n';

// English t() for assertions on string content.
const t = (k: string, p?: Record<string, string | number>) => translate('en', k, p);

test('productionProfile reflects a player\'s buildings on the visible board', () => {
  const s: any = createGame({ numPlayers: 4, seed: 5 });
  const hex = s.board.hexes.find((h: any) => h.token !== null && h.terrain !== 'desert')!;
  const res = ({ forest: 'wood', hills: 'brick', pasture: 'sheep', fields: 'wheat', mountains: 'ore' } as any)[hex.terrain];
  s.board.nodes[hex.nodeIds[0]].building = { type: 'settlement', owner: 0 };
  const prof = productionProfile(s, 0);
  const entry = prof.find(e => e.resource === res)!;
  expect(entry).toBeTruthy();
  expect(entry.numbers).toContain(hex.token);
  expect(entry.pips).toBeGreaterThan(0);
  // a city doubles the pips
  s.board.nodes[hex.nodeIds[0]].building = { type: 'city', owner: 0 };
  expect(productionProfile(s, 0).find(e => e.resource === res)!.pips).toBe(entry.pips * 2);
});

test('publicVictoryPoints excludes hidden Victory Point cards', () => {
  const s: any = createGame({ numPlayers: 4, seed: 5 });
  s.board.nodes[s.board.hexes[0].nodeIds[0]].building = { type: 'city', owner: 1 };
  s.players[1].devCards.push({ type: 'victory', boughtTurn: 1, played: false });
  s.bonuses.largestArmy = 1;
  // city(2) + largestArmy(2) = 4, VP card NOT counted
  expect(publicVictoryPoints(s, 1)).toBe(4);
});

test('contextualTips warns about the 7 discard threshold', () => {
  const s: any = createGame({ numPlayers: 4, seed: 5 });
  // force play phase
  s.phase = 'play'; s.setup = null;
  s.players[0].resources = { wood: 8, brick: 0, sheep: 0, wheat: 0, ore: 0 };
  const tips = contextualTips(s, 0, t);
  expect(tips.some(tip => tip.includes('discard'))).toBe(true);
});

test('contextualTips gives setup advice during setup', () => {
  const s: any = createGame({ numPlayers: 4, seed: 5 });
  const tips = contextualTips(s, 0, t);
  expect(tips.length).toBeGreaterThan(0);
  expect(tips.join(' ').toLowerCase()).toContain('settlement');
});
