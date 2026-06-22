// src/engine/reduce.ts
import type { State, PlayerId, Action, NodeId, EdgeId } from './types';
import { TERRAIN_RESOURCE } from './types';
import { clone } from './helpers';
import { pushLog, updatePorts, distanceOk, roadSpotsFromNode } from './rules';

export function applyAction(state: State, playerId: PlayerId, action: Action): State {
  const s = clone(state);
  switch (action.type) {
    case 'setupSettlement': return setupSettlement(s, playerId, action.node);
    case 'setupRoad': return setupRoad(s, playerId, action.edge);
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
