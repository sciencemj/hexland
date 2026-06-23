// test/engine/devcards.test.ts
import { test, expect } from 'bun:test';
import { createGame } from '../../src/engine/state';
import { applyAction } from '../../src/engine/reduce';
import { getLegalActions } from '../../src/engine/legal';

function freshPlay() {
  let g: any = createGame({ numPlayers: 4, seed: 5 });
  for (let i = 0; i < 100 && g.phase === 'setup'; i++) {
    const p = g.setup.order[g.setup.index];
    g = applyAction(g, p, getLegalActions(g, p)[0]);
  }
  g.turn.hasRolled = true;
  return g;
}

test('buying a dev card costs ore+sheep+wheat and draws from the deck', () => {
  const s: any = freshPlay();
  const p = s.currentPlayer;
  s.players[p].resources = { wood: 0, brick: 0, sheep: 1, wheat: 1, ore: 1 };
  const before = s.bank.devDeck.length;
  const after = applyAction(s, p, { type: 'buyDevCard' });
  expect(after.players[p].devCards.length).toBe(1);
  expect(after.players[p].devCards[0].boughtTurn).toBe(after.turn.turnNumber);
  expect(after.bank.devDeck.length).toBe(before - 1);
  expect(after.players[p].resources).toEqual({ wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 });
});

test('a dev card cannot be played the turn it was bought', () => {
  const s: any = freshPlay();
  const p = s.currentPlayer;
  s.players[p].devCards.push({ type: 'monopoly', boughtTurn: s.turn.turnNumber, played: false });
  const legal = getLegalActions(s, p);
  expect(legal.some(a => a.type === 'playMonopoly')).toBe(false);
});

test('only one dev card may be played per turn', () => {
  const s: any = freshPlay();
  const p = s.currentPlayer;
  s.players[p].devCards.push({ type: 'monopoly', boughtTurn: s.turn.turnNumber - 1, played: false });
  s.players[p].devCards.push({ type: 'yearOfPlenty', boughtTurn: s.turn.turnNumber - 1, played: false });
  const g = applyAction(s, p, { type: 'playMonopoly', resource: 'wood' });
  expect(g.turn.devCardPlayedThisTurn).toBe(true);
  expect(getLegalActions(g, p).some(a => a.type === 'playYearOfPlenty')).toBe(false);
});

test('Monopoly takes all of a resource from every other player', () => {
  const s: any = freshPlay();
  const p = s.currentPlayer;
  s.players[p].devCards.push({ type: 'monopoly', boughtTurn: s.turn.turnNumber - 1, played: false });
  for (const q of s.players) if (q.id !== p) q.resources.wood = 2;
  const before = s.players[p].resources.wood;
  const g = applyAction(s, p, { type: 'playMonopoly', resource: 'wood' });
  expect(g.players[p].resources.wood).toBe(before + 2 * 3);
  for (const q of g.players) if (q.id !== p) expect(q.resources.wood).toBe(0);
});

test('Year of Plenty draws 2 from the bank', () => {
  const s: any = freshPlay();
  const p = s.currentPlayer;
  s.players[p].resources = { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 }; // zero out to isolate assertion
  s.players[p].devCards.push({ type: 'yearOfPlenty', boughtTurn: s.turn.turnNumber - 1, played: false });
  const g = applyAction(s, p, { type: 'playYearOfPlenty', resources: ['ore', 'wheat'] });
  expect(g.players[p].resources.ore).toBe(1);
  expect(g.players[p].resources.wheat).toBe(1);
});

test('Year of Plenty with doubled resource throws when bank has only 1', () => {
  const s: any = freshPlay();
  const p = s.currentPlayer;
  s.players[p].devCards.push({ type: 'yearOfPlenty', boughtTurn: s.turn.turnNumber - 1, played: false });
  s.bank.resources.ore = 1; // only 1 ore — cannot give 2
  expect(() => applyAction(s, p, { type: 'playYearOfPlenty', resources: ['ore', 'ore'] })).toThrow('bank lacks that resource');
});

test('Year of Plenty with doubled resource grants 2 ore when bank has >= 2', () => {
  const s: any = freshPlay();
  const p = s.currentPlayer;
  s.players[p].devCards.push({ type: 'yearOfPlenty', boughtTurn: s.turn.turnNumber - 1, played: false });
  s.players[p].resources = { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 };
  s.bank.resources.ore = 2;
  const g = applyAction(s, p, { type: 'playYearOfPlenty', resources: ['ore', 'ore'] });
  expect(g.players[p].resources.ore).toBe(2);
  expect(g.bank.resources.ore).toBe(0);
});

test('Road Building grants 2 free roads', () => {
  const s: any = freshPlay();
  const p = s.currentPlayer;
  s.players[p].devCards.push({ type: 'roadBuilding', boughtTurn: s.turn.turnNumber - 1, played: false });
  const g = applyAction(s, p, { type: 'playRoadBuilding' });
  expect(g.turn.freeRoads).toBe(2);
  expect(g.turn.devCardPlayedThisTurn).toBe(true);
});

test('Knight moves the robber, steals, increments played knights, and may be played before rolling', () => {
  const s: any = freshPlay();
  s.turn.hasRolled = false; // knight before the roll
  const p = s.currentPlayer;
  s.players[p].devCards.push({ type: 'knight', boughtTurn: s.turn.turnNumber - 1, played: false });
  const targetHex = s.board.hexes.find((h: any) => h.id !== s.board.robberHex)!;
  const opp = (p + 1) % 4;
  s.board.nodes[targetHex.nodeIds[0]].building = { type: 'settlement', owner: opp };
  s.players[opp].resources = { wood: 1, brick: 0, sheep: 0, wheat: 0, ore: 0 };
  const g = applyAction(s, p, { type: 'playKnight', hex: targetHex.id, stealFrom: opp });
  expect(g.players[p].playedKnights).toBe(1);
  expect(g.board.robberHex).toBe(targetHex.id);
  expect(g.players[p].resources.wood).toBe(1);
  expect(g.turn.devCardPlayedThisTurn).toBe(true);
  // the knight steal must be visible in the log (not silent)
  expect(g.log[g.log.length - 1].text).toContain('Knight');
  expect(g.log[g.log.length - 1].text).toContain('stole from');
});
