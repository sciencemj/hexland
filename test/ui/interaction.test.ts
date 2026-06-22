// test/ui/interaction.test.ts
import { test, expect } from 'bun:test';
import { createGame } from '../../src/engine/state';
import { getLegalActions } from '../../src/engine/legal';
import { applyAction } from '../../src/engine/reduce';
import { highlightsFor, actionForNode, robberOptionsForHex } from '../../src/ui/interaction';

test('during setup, highlights come from legal regardless of mode', () => {
  const s: any = createGame({ numPlayers: 4, seed: 5 });
  const legal = getLegalActions(s, 0);
  const hl = highlightsFor(s, legal, 'idle');
  expect(hl.nodes.length).toBe(legal.length); // all setupSettlement nodes
  // clicking one maps to a setupSettlement action
  const a = actionForNode(s, legal, 'idle', hl.nodes[0]!);
  expect(a).toEqual({ type: 'setupSettlement', node: hl.nodes[0] });
});

test('robber-pending highlights candidate hexes', () => {
  const s: any = createGame({ numPlayers: 4, seed: 5 });
  s.phase = 'play'; s.setup = null;
  s.pending = { kind: 'robber', mover: 0, viaKnight: false };
  s.turn.hasRolled = true;
  const legal = getLegalActions(s, 0);
  const hl = highlightsFor(s, legal, 'robber');
  expect(hl.hexes.length).toBeGreaterThan(0);
  const opts = robberOptionsForHex(s, legal, hl.hexes[0]!);
  expect(opts.every(a => (a as any).hex === hl.hexes[0])).toBe(true);
});
