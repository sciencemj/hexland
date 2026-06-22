// src/engine/reduce.ts
import type { State, PlayerId, Action, NodeId, EdgeId, ResourceMap, HexId } from './types';
import { TERRAIN_RESOURCE, RESOURCES, type Resource, type DevCardType } from './types';
import { clone, totalCards, COSTS, canAfford, subRes, addRes, countVictoryPoints } from './helpers';
import { pushLog, updatePorts, distanceOk, roadSpotsFromNode, requiredDiscardCount, adjacentStealTargets, canBuildRoad, settlementPlacements, cityPlacements, hasPlayableDev, bankRatioFor } from './rules';
import { randInt } from './rng';
import { recomputeLongestRoad, recomputeArmy } from './scoring';

export function applyAction(state: State, playerId: PlayerId, action: Action): State {
  const s = clone(state);
  switch (action.type) {
    case 'setupSettlement': return setupSettlement(s, playerId, action.node);
    case 'setupRoad': return setupRoad(s, playerId, action.edge);
    case 'rollDice': return rollDice(s, playerId);
    case 'discard': return discard(s, playerId, action.resources);
    case 'moveRobber': return moveRobber(s, playerId, action.hex, action.stealFrom);
    case 'buildRoad': return buildRoad(s, playerId, action.edge);
    case 'buildSettlement': return buildSettlement(s, playerId, action.node);
    case 'buildCity': return buildCity(s, playerId, action.node);
    case 'buyDevCard':       return buyDevCard(s, playerId);
    case 'playKnight':       return playKnight(s, playerId, action.hex, action.stealFrom);
    case 'playRoadBuilding': return playRoadBuilding(s, playerId);
    case 'playYearOfPlenty': return playYearOfPlenty(s, playerId, action.resources);
    case 'playMonopoly':     return playMonopoly(s, playerId, action.resource);
    case 'tradeBank':    return tradeBank(s, playerId, action.give, action.receive);
    case 'tradeOffer':   return tradeOffer(s, playerId, action.to, action.give, action.want);
    case 'tradeRespond': return tradeRespond(s, playerId, action.accept);
    case 'endTurn': return endTurn(s, playerId);
    default: throw new Error(`unhandled action: ${(action as Action).type}`);
  }
}

function setupSettlement(s: State, playerId: PlayerId, node: NodeId): State {
  const setup = s.setup!;
  if (setup.order[setup.index] !== playerId) throw new Error('not your setup turn');
  if (setup.needRoadFrom !== null) throw new Error('must place road first');
  if (!distanceOk(s, node)) throw new Error('illegal settlement spot');

  const p = s.players[playerId]!;
  s.board.nodes[node]!.building = { type: 'settlement', owner: playerId };
  p.piecesLeft.settlements -= 1;
  updatePorts(s, playerId);

  // second round (index >= numPlayers): grant one card per adjacent producing hex
  if (setup.index >= s.config.numPlayers) {
    for (const hid of s.board.nodes[node]!.hexIds) {
      const res = TERRAIN_RESOURCE[s.board.hexes[hid]!.terrain];
      if (res && s.bank.resources[res] > 0) { p.resources[res] += 1; s.bank.resources[res] -= 1; }
    }
  }
  setup.needRoadFrom = node;
  pushLog(s, playerId, `placed a settlement`);
  return s;
}

function setupRoad(s: State, playerId: PlayerId, edge: EdgeId): State {
  const setup = s.setup!;
  if (setup.needRoadFrom === null) throw new Error('place a settlement first');
  if (!roadSpotsFromNode(s, setup.needRoadFrom).includes(edge)) throw new Error('illegal road spot');

  const p = s.players[playerId]!;
  s.board.edges[edge]!.road = { owner: playerId };
  p.piecesLeft.roads -= 1;
  setup.needRoadFrom = null;
  setup.index += 1;
  pushLog(s, playerId, `placed a road`);

  if (setup.index >= setup.order.length) {
    // setup complete → first turn goes to the last placer (snake → player 0)
    s.phase = 'play';
    s.currentPlayer = setup.order[setup.order.length - 1]!;
    s.turn = { hasRolled: false, dice: null, devCardPlayedThisTurn: false, turnNumber: 1, freeRoads: 0 };
    s.setup = null;
  }
  return s;
}

function rollDice(s: State, playerId: PlayerId): State {
  if (s.currentPlayer !== playerId) throw new Error('not your turn');
  if (s.turn.hasRolled) throw new Error('already rolled');
  const r1 = randInt(s.rng, 6); const r2 = randInt(r1.rng, 6);
  s.rng = r2.rng;
  const d1 = r1.value + 1, d2 = r2.value + 1, sum = d1 + d2;
  s.turn.dice = [d1, d2]; s.turn.hasRolled = true;
  pushLog(s, playerId, `rolled ${sum}`);
  if (sum === 7) startSeven(s, playerId);
  else produceResources(s, sum);
  return s;
}

function startSeven(s: State, roller: PlayerId): void {
  const remaining = s.players.filter(p => totalCards(p.resources) > 7).map(p => p.id);
  s.pending = remaining.length > 0
    ? { kind: 'discard', remaining }
    : { kind: 'robber', mover: roller, viaKnight: false };
}

function discard(s: State, playerId: PlayerId, res: ResourceMap): State {
  if (s.pending?.kind !== 'discard' || !s.pending.remaining.includes(playerId)) throw new Error('no discard pending');
  const need = requiredDiscardCount(s, playerId);
  if (totalCards(res) !== need) throw new Error(`must discard exactly ${need}`);
  const p = s.players[playerId]!;
  for (const k of RESOURCES) {
    if (res[k] > p.resources[k]) throw new Error('discarding cards you do not have');
    p.resources[k] -= res[k]; s.bank.resources[k] += res[k];
  }
  s.pending.remaining = s.pending.remaining.filter(id => id !== playerId);
  pushLog(s, playerId, `discarded ${need} cards`);
  if (s.pending.remaining.length === 0) s.pending = { kind: 'robber', mover: s.currentPlayer, viaKnight: false };
  return s;
}

function resolveRobber(s: State, mover: PlayerId, hex: HexId, stealFrom: PlayerId | null): void {
  if (hex === s.board.robberHex) throw new Error('robber must move to a different hex');
  s.board.robberHex = hex;
  // mandatory-steal guard: cannot decline a steal when a valid target exists
  if (stealFrom === null && adjacentStealTargets(s, hex, mover).length > 0)
    throw new Error('must steal when a valid target exists');
  if (stealFrom !== null) {
    if (!adjacentStealTargets(s, hex, mover).includes(stealFrom)) throw new Error('illegal steal target');
    stealCard(s, stealFrom, mover);
  }
}

function moveRobber(s: State, playerId: PlayerId, hex: HexId, stealFrom: PlayerId | null): State {
  if (s.pending?.kind !== 'robber' || s.pending.mover !== playerId) throw new Error('no robber move pending');
  resolveRobber(s, playerId, hex, stealFrom);
  s.pending = null;
  pushLog(s, playerId, 'moved the robber' + (stealFrom !== null ? ` and stole from player ${stealFrom}` : ''));
  return s;
}

function stealCard(s: State, from: PlayerId, to: PlayerId): void {
  const hand: Resource[] = [];
  for (const k of RESOURCES) for (let i = 0; i < s.players[from]!.resources[k]; i++) hand.push(k);
  if (hand.length === 0) return;
  const r = randInt(s.rng, hand.length); s.rng = r.rng;
  const card = hand[r.value]!;
  s.players[from]!.resources[card] -= 1; s.players[to]!.resources[card] += 1;
}

function payToBank(s: State, playerId: PlayerId, cost: ResourceMap): void {
  const p = s.players[playerId]!;
  p.resources = subRes(p.resources, cost);
  for (const k of RESOURCES) s.bank.resources[k] += cost[k];
}

function maybeWin(s: State): void {
  if (s.winner === null && countVictoryPoints(s, s.currentPlayer) >= 10) {
    s.winner = s.currentPlayer; s.phase = 'ended';
    pushLog(s, s.currentPlayer, 'wins the game!');
  }
}

function markPlayed(s: State, playerId: PlayerId, type: DevCardType): void {
  const card = s.players[playerId]!.devCards.find(c => c.type === type && !c.played && c.boughtTurn < s.turn.turnNumber);
  if (!card) throw new Error(`no playable ${type}`);
  card.played = true;
  s.turn.devCardPlayedThisTurn = true;
}

function buyDevCard(s: State, playerId: PlayerId): State {
  if (s.currentPlayer !== playerId) throw new Error('not your turn');
  if (!s.turn.hasRolled) throw new Error('roll first');
  if (s.bank.devDeck.length === 0) throw new Error('dev deck empty');
  const p = s.players[playerId]!;
  if (!canAfford(p.resources, COSTS.devCard)) throw new Error('cannot afford dev card');
  payToBank(s, playerId, COSTS.devCard);
  const type = s.bank.devDeck.pop()!;
  p.devCards.push({ type, boughtTurn: s.turn.turnNumber, played: false });
  pushLog(s, playerId, 'bought a development card');
  maybeWin(s); // a VP card may complete a win the turn it is bought
  return s;
}

function playKnight(s: State, playerId: PlayerId, hex: HexId, stealFrom: PlayerId | null): State {
  if (!hasPlayableDev(s, playerId, 'knight')) throw new Error('no playable knight');
  markPlayed(s, playerId, 'knight');
  s.players[playerId]!.playedKnights += 1;
  resolveRobber(s, playerId, hex, stealFrom);
  pushLog(s, playerId, 'played a Knight');
  recomputeArmy(s);   // defined in Task 14; no-op until then
  maybeWin(s);
  return s;
}

function playRoadBuilding(s: State, playerId: PlayerId): State {
  if (!hasPlayableDev(s, playerId, 'roadBuilding')) throw new Error('no playable road building');
  markPlayed(s, playerId, 'roadBuilding');
  s.turn.freeRoads += 2;
  pushLog(s, playerId, 'played Road Building');
  return s;
}

function playYearOfPlenty(s: State, playerId: PlayerId, res: [Resource, Resource]): State {
  if (!hasPlayableDev(s, playerId, 'yearOfPlenty')) throw new Error('no playable year of plenty');
  for (const r of res) if (s.bank.resources[r] <= 0) throw new Error('bank lacks that resource');
  markPlayed(s, playerId, 'yearOfPlenty');
  for (const r of res) { s.players[playerId]!.resources[r] += 1; s.bank.resources[r] -= 1; }
  pushLog(s, playerId, 'played Year of Plenty');
  return s;
}

function playMonopoly(s: State, playerId: PlayerId, resource: Resource): State {
  if (!hasPlayableDev(s, playerId, 'monopoly')) throw new Error('no playable monopoly');
  markPlayed(s, playerId, 'monopoly');
  let taken = 0;
  for (const q of s.players) {
    if (q.id === playerId) continue;
    taken += q.resources[resource]; q.resources[resource] = 0;
  }
  s.players[playerId]!.resources[resource] += taken;
  pushLog(s, playerId, `played Monopoly on ${resource} (+${taken})`);
  return s;
}

function buildRoad(s: State, playerId: PlayerId, edge: EdgeId): State {
  if (s.currentPlayer !== playerId) throw new Error('not your turn');
  if (!canBuildRoad(s, edge, playerId)) throw new Error('illegal road');
  const p = s.players[playerId]!;
  if (p.piecesLeft.roads <= 0) throw new Error('no road pieces left');
  if (s.turn.freeRoads > 0) s.turn.freeRoads -= 1;
  else { if (!canAfford(p.resources, COSTS.road)) throw new Error('cannot afford road'); payToBank(s, playerId, COSTS.road); }
  s.board.edges[edge]!.road = { owner: playerId };
  p.piecesLeft.roads -= 1;
  pushLog(s, playerId, 'built a road');
  recomputeLongestRoad(s);
  maybeWin(s);
  return s;
}

function buildSettlement(s: State, playerId: PlayerId, node: NodeId): State {
  if (s.currentPlayer !== playerId) throw new Error('not your turn');
  if (!settlementPlacements(s, playerId).includes(node)) throw new Error('illegal settlement');
  const p = s.players[playerId]!;
  if (p.piecesLeft.settlements <= 0) throw new Error('no settlement pieces left');
  if (!canAfford(p.resources, COSTS.settlement)) throw new Error('cannot afford settlement');
  payToBank(s, playerId, COSTS.settlement);
  s.board.nodes[node]!.building = { type: 'settlement', owner: playerId };
  p.piecesLeft.settlements -= 1;
  updatePorts(s, playerId);
  pushLog(s, playerId, 'built a settlement');
  recomputeLongestRoad(s);
  maybeWin(s);
  return s;
}

function buildCity(s: State, playerId: PlayerId, node: NodeId): State {
  if (s.currentPlayer !== playerId) throw new Error('not your turn');
  if (!cityPlacements(s, playerId).includes(node)) throw new Error('illegal city');
  const p = s.players[playerId]!;
  if (p.piecesLeft.cities <= 0) throw new Error('no city pieces left');
  if (!canAfford(p.resources, COSTS.city)) throw new Error('cannot afford city');
  payToBank(s, playerId, COSTS.city);
  s.board.nodes[node]!.building = { type: 'city', owner: playerId };
  p.piecesLeft.cities -= 1;
  p.piecesLeft.settlements += 1; // returned to supply
  pushLog(s, playerId, 'built a city');
  maybeWin(s);
  return s;
}

function tradeBank(s: State, playerId: PlayerId, give: Resource, receive: Resource): State {
  if (s.currentPlayer !== playerId) throw new Error('not your turn');
  if (!s.turn.hasRolled) throw new Error('roll first');
  const ratio = bankRatioFor(s, playerId, give);
  const p = s.players[playerId]!;
  if (p.resources[give] < ratio) throw new Error('not enough to trade');
  if (s.bank.resources[receive] <= 0) throw new Error('bank is out of that resource');
  p.resources[give] -= ratio; s.bank.resources[give] += ratio;
  p.resources[receive] += 1; s.bank.resources[receive] -= 1;
  pushLog(s, playerId, `bank trade ${ratio} ${give} → 1 ${receive}`);
  return s;
}

function tradeOffer(s: State, playerId: PlayerId, to: PlayerId, give: ResourceMap, want: ResourceMap): State {
  if (s.currentPlayer !== playerId) throw new Error('only the active player may offer');
  if (to === playerId) throw new Error('cannot trade with yourself');
  if (totalCards(give) === 0 || totalCards(want) === 0) throw new Error('a trade must give AND take (no free gifts)');
  for (const k of RESOURCES) if (s.players[playerId]!.resources[k] < give[k]) throw new Error('you lack the offered cards');
  s.pending = { kind: 'tradeOffer', from: playerId, to, give, want };
  pushLog(s, playerId, `offered a trade to player ${to}`);
  return s;
}

function tradeRespond(s: State, playerId: PlayerId, accept: boolean): State {
  if (s.pending?.kind !== 'tradeOffer' || s.pending.to !== playerId) throw new Error('no offer to you');
  const { from, give, want } = s.pending;
  if (accept) {
    for (const k of RESOURCES) if (s.players[from]!.resources[k] < give[k]) throw new Error('offerer no longer holds the offered cards');
    for (const k of RESOURCES) if (s.players[playerId]!.resources[k] < want[k]) throw new Error('you lack the requested cards');
    s.players[from]!.resources = addRes(subRes(s.players[from]!.resources, give), want);
    s.players[playerId]!.resources = addRes(subRes(s.players[playerId]!.resources, want), give);
    pushLog(s, playerId, `accepted the trade`);
  } else {
    pushLog(s, playerId, `declined the trade`);
  }
  s.pending = null;
  return s;
}

function endTurn(s: State, playerId: PlayerId): State {
  if (s.currentPlayer !== playerId) throw new Error('not your turn');
  if (!s.turn.hasRolled) throw new Error('must roll before ending turn');
  if (s.pending) throw new Error('resolve the pending action first');
  s.currentPlayer = (s.currentPlayer + 1) % s.config.numPlayers;
  s.turn = {
    hasRolled: false, dice: null, devCardPlayedThisTurn: false,
    turnNumber: s.turn.turnNumber + 1, freeRoads: 0,
  };
  pushLog(s, playerId, 'ended their turn');
  return s;
}

export function produceResources(s: State, roll: number): void {
  const demand: Record<Resource, { playerId: PlayerId; amount: number }[]> =
    { wood: [], brick: [], sheep: [], wheat: [], ore: [] };
  for (const hex of s.board.hexes) {
    if (hex.token !== roll || s.board.robberHex === hex.id) continue;
    const res = TERRAIN_RESOURCE[hex.terrain];
    if (!res) continue;
    for (const nid of hex.nodeIds) {
      const b = s.board.nodes[nid]!.building;
      if (b) demand[res].push({ playerId: b.owner, amount: b.type === 'city' ? 2 : 1 });
    }
  }
  for (const res of RESOURCES) {
    const claims = demand[res];
    if (claims.length === 0) continue;
    const total = claims.reduce((acc, c) => acc + c.amount, 0);
    if (total <= s.bank.resources[res]) {
      for (const c of claims) { s.players[c.playerId]!.resources[res] += c.amount; s.bank.resources[res] -= c.amount; }
    } else if (new Set(claims.map(c => c.playerId)).size === 1) {
      const pid = claims[0]!.playerId, give = s.bank.resources[res];
      s.players[pid]!.resources[res] += give; s.bank.resources[res] = 0;
    }
  }
}
