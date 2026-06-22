import type { State, PlayerId } from './types';

export function longestRoadLength(state: State, playerId: PlayerId): number {
  const myEdges = state.board.edges.filter(e => e.road?.owner === playerId);
  if (myEdges.length === 0) return 0;

  const adj: { edge: number; other: number }[][] = state.board.nodes.map(() => []);
  for (const e of myEdges) {
    const [a, b] = e.nodeIds;
    adj[a]!.push({ edge: e.id, other: b });
    adj[b]!.push({ edge: e.id, other: a });
  }
  const blocked = (node: number): boolean => {
    const bld = state.board.nodes[node]!.building;
    return bld !== null && bld.owner !== playerId;
  };

  let best = 0;
  const used = new Set<number>();
  const dfs = (node: number, len: number): void => {
    if (len > best) best = len;
    if (len > 0 && blocked(node)) return; // cannot pass through an opponent's building
    for (const { edge, other } of adj[node]!) {
      if (used.has(edge)) continue;
      used.add(edge);
      dfs(other, len + 1);
      used.delete(edge);
    }
  };
  for (let n = 0; n < adj.length; n++) if (adj[n]!.length > 0) dfs(n, 0);
  return best;
}
