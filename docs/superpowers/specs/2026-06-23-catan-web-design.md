# Catan Web — Design Spec

**Date:** 2026-06-23
**Status:** Approved design, pending implementation plan

A browser implementation of the Catan (Settlers of Catan) base game, playable by 1 human against 1–3 heuristic-AI opponents. Architected so the same game engine can later run on a Bun server (multiplayer) or be wrapped as a Claude MCP server, with no engine rewrite.

---

## 1. Goals & Scope

### In scope (base game, full)
- 3–4 players: 1 human + 1–3 AI (selectable at game start).
- 19-hex island, random **balanced** layout each game (6/8 never adjacent).
- Full setup: 2-round snake draft, second settlement grants starting resources.
- Resource production, robber, rolling 7 (discard at 8+, half rounded down).
- Building: roads, settlements, cities; distance & connection rules; piece limits.
- Development cards: 14 Knight, 5 Victory Point, 2 Road Building, 2 Year of Plenty, 2 Monopoly. One-per-turn, cannot-play-turn-bought, VP-card exception.
- Bonuses: Longest Road (≥5, strictly-longer to take, breakable by settlement), Largest Army (3 knights, strictly-more to take).
- Trading: maritime 4:1 / 3:1 / 2:1 ports; player↔player simple offer/accept (human proposes to AI, AI may propose to human; no multi-round counteroffers).
- Trade & build freely interleaved after the roll (digital-Catan style "combined phase").
- Win at 10 VP on your own turn.

### Out of scope (now; designed-for later)
- Bun server + WebSocket multiplayer.
- Claude MCP integration.
- MCTS / stronger AI (Agent interface ready for drop-in).
- Expansions (5–6 players, Seafarers, Cities & Knights).
- Persistence / save-load, accounts.

### Non-goals
- Pixel-perfect art. Clean, readable SVG board is enough.

---

## 2. Tech Stack

- **Runtime / tooling:** Bun (bundler, package manager, test runner, dev server).
- **Engine/AI:** TypeScript, zero runtime deps, no DOM/network references. Runs in Bun and browser.
- **UI:** React + SVG board. Only runtime dependency.
- **Tests:** `bun test`.

---

## 3. Architecture — Three Layers

```
src/engine/   Pure game logic. No DOM, no network, no React. Serializable State.
src/ai/       Agent interface + heuristic agent (medium). MCTS later, same interface.
src/ui/       React + SVG. Calls engine only.
(future) server/   Bun.serve + WebSocket; imports the SAME src/engine.
(future) mcp/      MCP server wrapping engine: get_state / legal_actions / apply_action.
```

**Why this shape:** the engine is a pure, serializable state machine. The browser drives it directly today. A server later loads the identical module, validates client actions with `getLegalActions`, applies with `applyAction`, and broadcasts new state. An MCP server exposes the same three calls as tools so Claude plays as just another `Agent`. No layer below the engine ever imports a layer above it.

---

## 4. Engine — The Core Contract

Everything (UI, AI, future server, future MCP) uses only these:

```ts
createGame(config: GameConfig): State          // players, seed, layoutMode
getLegalActions(state: State, playerId: PlayerId): Action[]
applyAction(state: State, action: Action): State   // pure; returns NEW state; throws on illegal
redactFor(state: State, playerId: PlayerId): View  // strips hidden info (opponents' hands, deck order)
checkWinner(state: State): PlayerId | null
```

**Invariants:**
- `applyAction` is pure and immutable — never mutates its input; returns a fresh state. Enables cheap cloning (`structuredClone`) for AI rollouts and trivial server snapshotting.
- All validation funnels through `getLegalActions`. `applyAction` re-checks legality and throws on an illegal action — so a future server reuses the exact same anti-cheat logic.
- **State is fully JSON-serializable**: no class instances, no functions, no cycles. Sendable over WebSocket / MCP and storable as-is.
- **Determinism:** all randomness (dice, deck shuffle, robber steal) draws from a seeded PRNG stored in `state.rng`. Same seed + same actions ⇒ identical game. Server-authoritative and replayable.

---

## 5. Data Model (State shape)

```ts
type Resource = 'wood' | 'brick' | 'sheep' | 'wheat' | 'ore';
type Terrain  = 'forest' | 'hills' | 'pasture' | 'fields' | 'mountains' | 'desert';
// forest→wood, hills→brick, pasture→sheep, fields→wheat, mountains→ore, desert→none

interface State {
  config: { numPlayers: number; layoutMode: 'random' };
  rng: { seed: number; state: number };       // seeded PRNG state
  phase: Phase;                                 // sub-state machine (see §7)
  board: Board;
  players: Player[];
  bank: { resources: Record<Resource, number>; devDeck: DevCardType[] };
  bonuses: { longestRoad: PlayerId | null; largestArmy: PlayerId | null };
  currentPlayer: PlayerId;
  turn: TurnState;
  pending: PendingState | null;                 // active interrupt (discards, robber, trade offer)
  log: LogEntry[];
  winner: PlayerId | null;
}

interface Board {
  // Topology is FIXED across games; embedded in state so state is self-describing.
  hexes: Hex[];   // 19
  nodes: Node[];  // 54
  edges: Edge[];  // 72
  robberHex: HexId;
}
interface Hex  { id: HexId; terrain: Terrain; token: number | null; // 2–12, null on desert
                 nodeIds: NodeId[]; }                 // 6 corner nodes
interface Node { id: NodeId; hexIds: HexId[];          // up to 3 adjacent hexes
                 edgeIds: EdgeId[]; neighborNodeIds: NodeId[];
                 port: { type: Resource | 'any' } | null;   // 'any' = 3:1 generic
                 building: { type: 'settlement' | 'city'; owner: PlayerId } | null; }
interface Edge { id: EdgeId; nodeIds: [NodeId, NodeId];
                 hexIds: HexId[];                      // 1–2 adjacent hexes
                 road: { owner: PlayerId } | null; }

interface Player {
  id: PlayerId; name: string; color: string; isAI: boolean; aiDifficulty?: 'medium';
  resources: Record<Resource, number>;
  devCards: { type: DevCardType; boughtTurn: number; played: boolean }[]; // boughtTurn enforces can't-play-same-turn
  playedKnights: number;
  piecesLeft: { roads: number; settlements: number; cities: number };     // 15 / 5 / 4
  ports: (Resource | 'any')[];    // derived cache (array, not Set, to stay JSON-serializable); recomputed when buildings change
}

type DevCardType = 'knight' | 'victory' | 'roadBuilding' | 'yearOfPlenty' | 'monopoly';
```

**Topology note:** the 19/54/72 graph (which nodes touch which hexes, node–node adjacency, edge endpoints, and the 9 fixed port locations) is the same every game. It is generated once by `topology.ts` and embedded into `board`. Only terrain assignment, number tokens, and port resource types are randomized per game.

---

## 6. Actions (all JSON-serializable)

```ts
type Action =
  // setup
  | { type: 'setupSettlement'; node: NodeId }
  | { type: 'setupRoad'; edge: EdgeId }
  // main turn
  | { type: 'rollDice' }
  | { type: 'buildRoad'; edge: EdgeId }
  | { type: 'buildSettlement'; node: NodeId }
  | { type: 'buildCity'; node: NodeId }
  | { type: 'buyDevCard' }
  | { type: 'playKnight'; hex: HexId; stealFrom: PlayerId | null }
  | { type: 'playRoadBuilding'; edges: EdgeId[] }       // 1–2
  | { type: 'playYearOfPlenty'; resources: [Resource, Resource] }
  | { type: 'playMonopoly'; resource: Resource }
  | { type: 'tradeBank'; give: Resource; receive: Resource }   // ratio derived from ports
  | { type: 'tradeOffer'; to: PlayerId; give: Partial<Record<Resource, number>>; want: Partial<Record<Resource, number>> }
  | { type: 'tradeRespond'; accept: boolean }
  | { type: 'endTurn' }
  // interrupts
  | { type: 'discard'; resources: Partial<Record<Resource, number>> }
  | { type: 'moveRobber'; hex: HexId; stealFrom: PlayerId | null };
```

---

## 7. Phase / Interrupt State Machine

```
setup            → players place settlement+road in snake order (1..N, then N..1).
                   2nd settlement grants resources. → play (first player = last placer).
play sub-states (per active player's turn):
  awaitingRoll       legal: rollDice, playKnight(if held & not bought-this-turn)
  → on roll 7:
       awaitingDiscards   each player with ≥8 cards: legal = discard(half, floor). Others wait.
       → awaitingRobber   roller: legal = moveRobber(+ optional steal)
       → main
  → on roll 2–6,8–12: production paid out → main
  main               legal: build*, buyDevCard, play<dev> (≤1/turn, not bought this turn),
                     tradeBank, tradeOffer, endTurn. Trade & build freely interleaved.
  awaitingTradeResponse  target player: legal = tradeRespond(accept/reject). (Transient.)
ended            winner set.
```

`pending` holds the active interrupt (who must discard, robber-move owner, open trade offer). `getLegalActions` returns the right actions per `(phase, pending, playerId)`.

**Robber interrupts also triggered by Knight** — same `moveRobber` resolution, but no discards (only a rolled 7 discards).

---

## 8. Rule Details (verified — implementation reference)

These are the load-bearing rules confirmed by the rules-research workflow. Tests assert each.

**Setup**
- Snake draft order 1..N then N..1. Each player: 1 settlement + 1 adjoining road per round.
- Distance rule enforced during setup (no settlement adjacent to another).
- **Second** settlement: grant 1 card per adjacent terrain hex (≤3). First settlement: none.
- First game turn = player who placed their second settlement last (the round-1 starting player).

**Production**
- Roll sum names the token. Every player: +1 per adjacent settlement, +2 per adjacent city, on hexes with that token. All players, not just roller.
- Robber's hex produces nothing.
- **Bank shortage:** if the bank can't pay all players owed a resource, no one gets that resource — **except** if exactly one player is owed it, they take whatever remains.

**Rolling 7**
- Every player with **>7** (i.e. ≥8) resource cards discards **floor(n/2)**. (8→4, 9→4, 10→5, 11→5.) Dev cards never counted/discarded.
- Roller moves robber to a **different land hex** (desert allowed; not water; must move).
- Steal 1 **random** card from one opponent with a building adjacent to the new hex. Roller chooses which opponent if several. No adjacent opponent (or all empty-handed) ⇒ no steal.

**Building (costs & rules)**
- Road = wood+brick. Settlement = wood+brick+sheep+wheat. City = 3 ore + 2 wheat (upgrades own settlement, returns the settlement piece). Dev card = ore+sheep+wheat.
- Distance rule: settlement only on an empty node ≥2 edges from any building.
- Road must connect to your own road/settlement/city; cannot pass through an opponent's building.
- Settlement (post-setup) must touch your own road.
- City only upgrades your own settlement.
- Piece limits 15/5/4 are hard caps.

**Development cards**
- Buy: draw top of seeded-shuffled deck. Cannot play the turn bought (`boughtTurn < currentTurn`). At most one dev card played per turn (VP excluded).
- Knight: move robber + steal; placed face-up; counts to Largest Army.
- Road Building: place up to 2 free roads (legal placements & road-piece supply permitting).
- Year of Plenty: take any 2 from bank (subject to bank stock).
- Monopoly: name a resource; every other player gives you all of it.
- Victory Point: +1 VP, hidden; revealed (not "played"), exempt from one-per-turn; may win the turn bought.

**Bonuses**
- Longest Road: 2 VP. Continuous unbranched path ≥5. Taken only by a **strictly longer** road (tie keeps holder). An opponent's settlement built mid-road **splits** it (pieces stay, path recounts); holder can lose the card; if no one has ≥5, card unheld.
- Largest Army: 2 VP. First to 3 played knights. Taken only by **strictly more** played knights.

**Trading**
- Maritime: 4:1 default (no port); 3:1 generic port; 2:1 specific-resource port. Port rate requires a building on a node adjacent to that port. 2:1 applies only to its resource.
- Player trade: only on the active player's turn; the active player must be a party; non-active players cannot trade with each other (but may propose to the active player). No free gifts. No dev-card trading.
- Robber does **not** block trading or ports.

**Victory**
- 10 VP wins, checked on your own turn. VP sources: settlement 1, city 2, VP card 1, Longest Road 2, Largest Army 2.

---

## 9. Board Generation (random balanced)

1. Build fixed topology (19 hexes, 54 nodes, 72 edges, 9 port slots).
2. Shuffle terrains: 4 forest, 4 fields, 4 pasture, 3 hills, 3 mountains, 1 desert.
3. Place number tokens on the 18 non-desert hexes: one 2, one 12, two each of 3–6 & 8–11.
4. **Balance constraint:** reshuffle/swap until no two red tokens (6 & 8) share an edge.
5. Assign the 9 ports: 4 generic (3:1) + 5 specific (one per resource) to the fixed port slots, shuffled.
All via seeded PRNG ⇒ reproducible from the seed.

---

## 10. AI

```ts
interface Agent { decide(state: State, legal: Action[], playerId: PlayerId): Promise<Action>; }
```

**HeuristicAgent ('medium')** — scores legal actions, picks the best:
- **Setup placement:** node value = Σ over adjacent hexes of (pip-probability × resource weight) + resource-diversity bonus + port bonus. Road toward the best next node.
- **Build priority:** city > settlement > dev card > road, gated by VP proximity and production balance.
- **Robber / Knight:** target the hex that hurts the VP leader most (high pips, opponent building); steal from the leader.
- **Discard (on 7):** drop the most abundant / least strategically useful.
- **Bank trade:** trade when it unlocks an affordable build this turn.
- **Player trade:** accept offers that improve its position; may propose simple 1:1-ish swaps to the human. No multi-round negotiation.
- **Year of Plenty / Monopoly / Road Building:** pick resources/targets by current need / opponent holdings / longest-road progress.

**Pluggability:** `aiRegistry[difficulty] -> Agent`. MCTS later implements the same `Agent`, using `applyAction` on cloned states for rollouts. Claude-via-MCP is also just an `Agent`.

**Game loop (UI):** after each applied action, while `currentPlayer.isAI` and not ended, `await agent.decide(...)` → `applyAction` → render. Small delay per AI action for readability.

---

## 11. UI (React + SVG)

- **`<Board>`** (SVG): hex polygons (terrain color + number token, red for 6/8 with pip dots), robber pawn, roads on edges, settlements/cities on nodes. Renders **legal targets** as highlighted clickable nodes/edges driven by `getLegalActions`. SVG elements carry ids ⇒ click hit-testing is free (no pixel math).
- **`<PlayerPanel>` × N:** name/color, VP (public total), resource **count** only for opponents, dev-card count, played knights, Longest Road / Largest Army badges.
- **`<HandPanel>`** (human): actual resource cards, playable dev cards.
- **`<ActionBar>`:** Roll, Build (road/settlement/city), Buy Dev, Trade, End Turn — each enabled per legal actions.
- **`<TradePanel>`:** bank trade (auto-shows best ratio per resource) + player offer/respond.
- **`<DiscardModal>`** (human on 7), **`<RobberPrompt>`** (move + pick steal target), **`<DiceDisplay>`**, **`<GameLog>`**, toast notifications.
- **`<NewGameDialog>`:** choose number of AI opponents (1–3), seed (optional).
- **State management:** engine `State` is the single source of truth, held via `useReducer`; the reducer wraps `applyAction`. `getLegalActions` drives all highlighting and button enablement. `geometry.ts` maps topology → pixel coordinates for layout.

---

## 12. Hidden Information

Engine `State` holds full info. `redactFor(state, playerId)` produces a view where opponents' resource cards collapse to a count, opponents' dev cards collapse to a count (knights played stay visible), and the deck order is hidden. Used by the future server/MCP; the local UI simply renders opponents from the redacted view, so single-player already respects hidden info.

---

## 13. Testing (TDD)

**Engine — topology:** 19 hexes / 54 nodes / 72 edges / 9 ports; adjacency symmetry (if A neighbors B then B neighbors A); every node has 2–3 hexes; every edge has 2 endpoints.

**Engine — rules (one test each):** distance rule; road connectivity & blocking; build-cost deduction; production payout (settlement 1 / city 2 / robber blocks / multi-building hex); bank-shortage rule; 7 discard threshold & floor rounding; robber must-move + random steal + no-target; dev-card can't-play-turn-bought & one-per-turn & VP exception; Year of Plenty / Monopoly / Road Building effects; longest-road computation including break-by-settlement and strictly-longer transfer; largest-army strictly-more transfer; maritime ratios incl. port eligibility; win at 10 on own turn only.

**Board generation:** seeded determinism; 6/8 never adjacent; correct terrain/token/port multiset.

**AI smoke:** four heuristic agents play a full game to completion; every action they emit is in `getLegalActions`; the game terminates with a winner.

---

## 14. File Layout

```
catan/
  package.json            # bun; dep: react, react-dom
  tsconfig.json
  index.html
  src/
    engine/
      types.ts            # State, Action, Player, Board, ...
      rng.ts              # seeded PRNG (mulberry32)
      topology.ts         # fixed 19/54/72 graph + port slots
      board.ts            # random balanced terrain/token/port placement
      state.ts            # createGame, redactFor, checkWinner
      legal.ts            # getLegalActions
      reduce.ts           # applyAction reducer (dispatch per action type)
      roads.ts            # longest-road graph algorithm
      scoring.ts          # VP totals, longest-road / largest-army assignment
      index.ts            # public engine API barrel
    ai/
      agent.ts            # Agent interface + registry
      heuristic.ts        # medium heuristic agent
    ui/
      main.tsx
      App.tsx
      useGame.ts          # hook: holds State, drives AI loop
      geometry.ts         # topology → pixel coords
      components/
        Board.tsx PlayerPanel.tsx HandPanel.tsx ActionBar.tsx
        TradePanel.tsx DiscardModal.tsx RobberPrompt.tsx
        DiceDisplay.tsx GameLog.tsx NewGameDialog.tsx
  test/
    engine/*.test.ts
```

**Build/run:** `bun run dev` = `bun build src/ui/main.tsx --watch --outdir dist` + a small `Bun.serve` serving `index.html` + `dist`. `bun test` for the engine suite.

---

## 15. Future-Proofing Checklist (server / MCP)

- Engine is pure, serializable, side-effect-free ✓
- All randomness seeded in state ✓
- Actions are JSON; `getLegalActions` is the single validation gate ✓
- `redactFor` hides per-player info ✓
- `Agent` interface decouples AI; MCP/Claude/MCTS are all just agents ✓

Result: adding a server = a thin `Bun.serve` + WebSocket relay around the existing engine. Adding MCP = three tools (`get_state` → `redactFor`, `legal_actions` → `getLegalActions`, `apply_action` → `applyAction`). No engine changes.
