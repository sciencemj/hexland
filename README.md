# Catan

A browser implementation of the Catan base game — 1 human vs 1–3 heuristic-AI opponents.

## Run

```bash
bun install
bun run dev      # http://localhost:3000
```

## Test

```bash
bun test         # engine + AI + UI suites
bun run build    # bundle to dist/
```

## Architecture

- `src/engine/` — pure, JSON-serializable game state machine. No DOM/network.
  `getLegalActions` is the single validation gate; `applyAction` returns a new state.
  Seeded RNG makes every game reproducible from its seed.
- `src/ai/` — `Agent` interface + a medium heuristic agent. Swap in MCTS or a
  Claude-MCP agent later without touching the engine.
- `src/ui/` — React + SVG. Renders the engine state; clicks dispatch actions.

### Reusing the engine on a server / via MCP

The engine never imports UI. A future Bun WebSocket server loads `src/engine`,
validates client actions with `getLegalActions`, applies with `applyAction`, and
broadcasts state. An MCP server exposes three tools — `get_state` (`redactFor`),
`legal_actions` (`getLegalActions`), `apply_action` (`applyAction`) — so Claude
plays as just another `Agent`. A `tradeOffer` action is intentionally free-form (not enumerated by `getLegalActions` because the offer space is unbounded); a server/MCP layer must accept it and rely on `applyAction` to validate it.

## Rules

Full base game: snake-draft setup, resource production, robber & the 7 (discard at
8+), build roads/settlements/cities, development cards (Knight / Road Building /
Year of Plenty / Monopoly / Victory Point), Longest Road, Largest Army, maritime
(4:1 / 3:1 / 2:1) and player trading, first to 10 VP wins.
