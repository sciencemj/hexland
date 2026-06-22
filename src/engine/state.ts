import { makeRng, shuffle } from './rng';
import { generateBoard } from './board';
import { countVictoryPoints, clone } from './helpers';
import {
  emptyResources, type State, type GameConfig, type Player, type PlayerId, type DevCardType,
} from './types';

const COLORS = ['#d23b3b', '#2f6fd0', '#e8a13a', '#3aa86b']; // red, blue, orange, green

function buildDevDeck(): DevCardType[] {
  return [
    ...Array<DevCardType>(14).fill('knight'),
    ...Array<DevCardType>(5).fill('victory'),
    ...Array<DevCardType>(2).fill('roadBuilding'),
    ...Array<DevCardType>(2).fill('yearOfPlenty'),
    ...Array<DevCardType>(2).fill('monopoly'),
  ];
}

export function createGame(config: GameConfig): State {
  const n = config.numPlayers;
  const humanCount = config.humanCount ?? 1;
  let rng = makeRng(config.seed);

  const gen = generateBoard(rng); rng = gen.rng;
  const board = gen.board;

  const sh = shuffle(rng, buildDevDeck()); rng = sh.rng;
  const devDeck = sh.value;

  const players: Player[] = Array.from({ length: n }, (_, i) => ({
    id: i,
    name: config.names?.[i] ?? (i < humanCount ? `You` : `AI ${i}`),
    color: COLORS[i]!,
    isAI: i >= humanCount,
    aiDifficulty: i >= humanCount ? 'medium' : null,
    resources: emptyResources(),
    devCards: [],
    playedKnights: 0,
    piecesLeft: { roads: 15, settlements: 5, cities: 4 },
    ports: [],
  }));

  const order: PlayerId[] = [];
  for (let i = 0; i < n; i++) order.push(i);
  for (let i = n - 1; i >= 0; i--) order.push(i);

  return {
    config: { numPlayers: n, layoutMode: 'random' },
    rng,
    phase: 'setup',
    setup: { order, index: 0, needRoadFrom: null },
    board,
    players,
    bank: { resources: { wood: 19, brick: 19, sheep: 19, wheat: 19, ore: 19 }, devDeck },
    bonuses: { longestRoad: null, largestArmy: null },
    currentPlayer: 0,
    turn: { hasRolled: false, dice: null, devCardPlayedThisTurn: false, turnNumber: 0, freeRoads: 0 },
    pending: null,
    log: [],
    winner: null,
  };
}

export function redactFor(state: State, playerId: PlayerId): State {
  const v = clone(state);
  for (const p of v.players) {
    if (p.id === playerId) continue;
    p.resources = emptyResources();             // hide hand (UI shows total elsewhere if needed)
    p.devCards = p.devCards.filter(c => c.played); // only played (knights) are public
  }
  // mask deck order: keep length, replace with a neutral placeholder set
  v.bank.devDeck = v.bank.devDeck.map(() => 'knight' as DevCardType);
  if (v.bank.devDeck.length > 0) v.bank.devDeck[0] = 'victory'; // ensure not all-identical (view is opaque)
  v.rng = { seed: 0, state: 0 };
  return v;
}

export function checkWinner(state: State): PlayerId | null {
  for (const p of state.players) if (countVictoryPoints(state, p.id) >= 10) return p.id;
  return null;
}
