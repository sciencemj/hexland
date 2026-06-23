// src/mcp/session.ts
// The game-driving logic behind the MCP tools, kept transport-free so it can be
// unit-tested. Claude plays seat 0; AI seats are advanced automatically.
import { createGame } from '../engine/state';
import { getLegalActions, nextActor } from '../engine/legal';
import { applyAction } from '../engine/reduce';
import { countVictoryPoints, totalCards } from '../engine/helpers';
import { getAgent } from '../ai/registry';
import type { Agent } from '../ai/agent';
import type { State, Action, PlayerId, Difficulty } from '../engine/types';

export const CLAUDE: PlayerId = 0;

export interface Session { game: State | null; agents: Agent[]; }
export const createSession = (): Session => ({ game: null, agents: [] });

function publicVp(g: State, pid: PlayerId): number {
  return countVictoryPoints(g, pid) - g.players[pid]!.devCards.filter(c => c.type === 'victory').length;
}

function advanceAI(s: Session): void {
  if (!s.game) return;
  for (let guard = 0; guard < 100000; guard++) {
    const actor = nextActor(s.game);
    if (actor === null || actor === CLAUDE) return;
    const legal = getLegalActions(s.game, actor);
    if (legal.length === 0) return;
    const a = s.agents[actor]!.decide(s.game, legal, actor);
    if (a instanceof Promise) return; // AI agents are synchronous
    s.game = applyAction(s.game, actor, a);
  }
}

export function view(s: Session, extra: Record<string, unknown> = {}): Record<string, unknown> {
  if (!s.game) return { error: 'No game in progress. Call new_game first.', ...extra };
  const g = s.game;
  const me = g.players[CLAUDE]!;
  const actor = nextActor(g);
  const yourTurn = actor === CLAUDE;
  const legal = yourTurn ? getLegalActions(g, CLAUDE) : [];

  return {
    phase: g.phase,
    winner: g.winner,
    youWon: g.winner === CLAUDE,
    currentPlayer: g.currentPlayer,
    yourSeat: CLAUDE,
    yourTurn,
    pending: g.pending ? g.pending.kind : null,
    dice: g.turn.dice,
    turnNumber: g.turn.turnNumber,
    you: {
      name: me.name,
      resources: me.resources,
      devCards: me.devCards.filter(c => !c.played).map(c => c.type),
      playedKnights: me.playedKnights,
      piecesLeft: me.piecesLeft,
      ports: me.ports,
      victoryPoints: countVictoryPoints(g, CLAUDE),
    },
    opponents: g.players.filter(p => p.id !== CLAUDE).map(p => ({
      seat: p.id, name: p.name,
      cardCount: totalCards(p.resources),
      devCardCount: p.devCards.filter(c => !c.played).length,
      playedKnights: p.playedKnights,
      victoryPoints: publicVp(g, p.id),
    })),
    bonuses: g.bonuses,
    board: {
      robberHex: g.board.robberHex,
      hexes: g.board.hexes.map(h => ({ id: h.id, terrain: h.terrain, token: h.token, cornerNodes: h.nodeIds })),
      nodes: g.board.nodes.map(n => ({ id: n.id, hexes: n.hexIds, port: n.port, building: n.building })),
      edges: g.board.edges.map(e => ({ id: e.id, nodes: e.nodeIds, road: e.road })),
      ports: g.board.portSlots.map(slot => {
        const e = g.board.edges[slot]!;
        return { edge: slot, nodes: e.nodeIds, type: g.board.nodes[e.nodeIds[0]]!.port };
      }),
    },
    legalActions: legal,
    recentLog: g.log.slice(-12).map(l => l.text),
    ...extra,
  };
}

export function newGame(s: Session, opts: { aiOpponents: number; difficulty: Difficulty; seed?: number }): Record<string, unknown> {
  const seed = opts.seed ?? Math.floor(Math.random() * 1_000_000);
  s.game = createGame({ numPlayers: 1 + opts.aiOpponents, humanCount: 1, seed, difficulty: opts.difficulty });
  s.agents = s.game.players.map(p => getAgent(p.aiDifficulty ?? 'medium'));
  advanceAI(s);
  return view(s, { seed, message: 'Game started. You are seat 0.' });
}

export function act(s: Session, action: Action): Record<string, unknown> {
  if (!s.game) return view(s);
  const actor = nextActor(s.game);
  if (actor !== CLAUDE) return view(s, { error: `It is not your turn (current actor: seat ${actor}).` });
  try {
    s.game = applyAction(s.game, CLAUDE, action);
  } catch (e) {
    return view(s, { error: `Illegal action: ${(e as Error).message}. Pick one of legalActions.` });
  }
  advanceAI(s);
  return view(s, { message: 'Action applied.' });
}
