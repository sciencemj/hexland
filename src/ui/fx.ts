// src/ui/fx.ts
// Pure diff of two consecutive engine states into the visual/audio events the
// UI animates. Keeps the engine unaware of presentation.
import type { State, PlayerId, EdgeId, NodeId, Resource } from '../engine/types';
import { TERRAIN_RESOURCE } from '../engine/types';

export interface FxEvents {
  diceRolled: boolean;
  dice: [number, number] | null;
  newRoads: EdgeId[];
  newBuildings: { node: NodeId; type: 'settlement' | 'city' }[];
  humanGains: { hex: HexLike; resource: Resource }[]; // one entry per card produced for the human
  robberMoved: boolean;
  devCardBought: boolean;
}
type HexLike = number;

export function computeFx(prev: State, cur: State, human: PlayerId): FxEvents {
  const cd = cur.turn.dice;
  const diceRolled = !!cd && !prev.turn.dice; // dice goes null -> value exactly once per roll
  const sum = cd ? cd[0] + cd[1] : 0;

  const newRoads: EdgeId[] = [];
  for (const e of cur.board.edges) if (e.road && !prev.board.edges[e.id]!.road) newRoads.push(e.id);

  const newBuildings: { node: NodeId; type: 'settlement' | 'city' }[] = [];
  for (const n of cur.board.nodes) {
    const cb = n.building, pb = prev.board.nodes[n.id]!.building;
    if (cb && (!pb || pb.type !== cb.type)) newBuildings.push({ node: n.id, type: cb.type });
  }

  // Resources the human harvested this roll, sourced from the producing tiles.
  const humanGains: { hex: HexLike; resource: Resource }[] = [];
  if (diceRolled && sum !== 7) {
    for (const hex of cur.board.hexes) {
      if (hex.token !== sum || cur.board.robberHex === hex.id) continue;
      const res = TERRAIN_RESOURCE[hex.terrain];
      if (!res) continue;
      for (const nid of hex.nodeIds) {
        const b = cur.board.nodes[nid]!.building;
        if (b && b.owner === human) {
          const amt = b.type === 'city' ? 2 : 1;
          for (let i = 0; i < amt; i++) humanGains.push({ hex: hex.id, resource: res });
        }
      }
    }
  }

  const robberMoved = prev.board.robberHex !== cur.board.robberHex;
  const devCardBought = cur.players[cur.currentPlayer]!.devCards.length
    > (prev.players[cur.currentPlayer]?.devCards.length ?? 0);

  return { diceRolled, dice: cd, newRoads, newBuildings, humanGains, robberMoved, devCardBought };
}
