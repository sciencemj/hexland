// test/engine/production.test.ts
import { test, expect } from 'bun:test';
import { createGame } from '../../src/engine/state';
import { produceResources, applyAction } from '../../src/engine/reduce';
import { getLegalActions } from '../../src/engine/legal';
import { totalCards } from '../../src/engine/helpers';

// Helper: put a building on the first node of a hex with a given token.
function place(s: any, hexId: number, type: 'settlement' | 'city', owner: number) {
  const node = s.board.hexes[hexId].nodeIds[0];
  s.board.nodes[node].building = { type, owner };
}

test('production pays settlements 1 and cities 2 to adjacent owners', () => {
  const s = createGame({ numPlayers: 4, seed: 5 });
  const hex = s.board.hexes.find((h: any) => h.token !== null && h.terrain !== 'desert')!;
  const res = ({ forest: 'wood', hills: 'brick', pasture: 'sheep', fields: 'wheat', mountains: 'ore' } as any)[hex.terrain];
  place(s, hex.id, 'settlement', 0);
  produceResources(s, hex.token);
  expect(s.players[0].resources[res]).toBe(1);

  const s2 = createGame({ numPlayers: 4, seed: 5 });
  place(s2, hex.id, 'city', 1);
  produceResources(s2, hex.token);
  expect(s2.players[1].resources[res]).toBe(2);
});

test('robber blocks production on its hex', () => {
  const s = createGame({ numPlayers: 4, seed: 5 });
  const hex = s.board.hexes.find((h: any) => h.token !== null)!;
  place(s, hex.id, 'settlement', 0);
  s.board.robberHex = hex.id;
  produceResources(s, hex.token);
  expect(totalCards(s.players[0].resources)).toBe(0);
});

test('bank shortage: multiple claimants and not enough → nobody gets it', () => {
  const s = createGame({ numPlayers: 4, seed: 5 });
  const hex = s.board.hexes.find((h: any) => h.token !== null && h.terrain !== 'desert')!;
  const res = ({ forest: 'wood', hills: 'brick', pasture: 'sheep', fields: 'wheat', mountains: 'ore' } as any)[hex.terrain];
  // two different players each adjacent (use two different corner nodes)
  s.board.nodes[hex.nodeIds[0]].building = { type: 'city', owner: 0 };
  s.board.nodes[hex.nodeIds[2]].building = { type: 'city', owner: 1 };
  s.bank.resources[res] = 3; // demand is 4, > 3, two players → nobody
  produceResources(s, hex.token);
  expect(s.players[0].resources[res]).toBe(0);
  expect(s.players[1].resources[res]).toBe(0);
  expect(s.bank.resources[res]).toBe(3);
});

test('bank shortage: a sole claimant takes the remainder', () => {
  const s = createGame({ numPlayers: 4, seed: 5 });
  const hex = s.board.hexes.find((h: any) => h.token !== null && h.terrain !== 'desert')!;
  const res = ({ forest: 'wood', hills: 'brick', pasture: 'sheep', fields: 'wheat', mountains: 'ore' } as any)[hex.terrain];
  s.board.nodes[hex.nodeIds[0]].building = { type: 'city', owner: 0 };
  s.bank.resources[res] = 1; // demand 2, only player 0 → gets 1
  produceResources(s, hex.token);
  expect(s.players[0].resources[res]).toBe(1);
  expect(s.bank.resources[res]).toBe(0);
});

test('rollDice sets dice + hasRolled and is the only pre-roll action', () => {
  const s = createGame({ numPlayers: 4, seed: 5 });
  // fast-forward through setup
  let g = s;
  const run = () => {
    for (let guard = 0; guard < 100 && g.phase === 'setup'; guard++) {
      const p = g.setup.order[g.setup.index];
      const a = getLegalActions(g, p)[0];
      g = applyAction(g, p, a);
    }
  };
  run();
  expect(g.phase).toBe('play');
  const pre = getLegalActions(g, g.currentPlayer);
  expect(pre.some(a => a.type === 'rollDice')).toBe(true);
  const after = applyAction(g, g.currentPlayer, { type: 'rollDice' });
  expect(after.turn.hasRolled).toBe(true);
  expect(after.turn.dice).not.toBeNull();
});
