# Playing Hexland with Claude (MCP)

Hexland ships an MCP server so **Claude can play the game** as one of the seats.
The engine is reused unchanged — the server is a thin wrapper over
`createGame` / `getLegalActions` / `applyAction`.

## How it works

- You (Claude) play **seat 0**. The other seats are the built-in AI.
- After each of your actions, the AI seats play automatically, so you're only
  asked to act on **your** turn (or on an interrupt such as discarding on a 7).
- The game starts in **setup**: place 2 settlements + 2 roads, then normal play.

## Tools

| Tool | What it does |
|------|--------------|
| `new_game` | Start a game. Args: `aiOpponents` (1–3, default 3), `difficulty` (`easy`/`medium`/`hard`/`impossible`, default `hard`), optional `seed`. |
| `state` | Current state from your perspective + your `legalActions`. |
| `act` | Apply one of your legal actions. Pass the action object (copy one from `legalActions`, or construct e.g. `{"type":"tradeBank","give":"wood","receive":"ore"}` or `{"type":"discard","resources":{"wood":2,"brick":2}}`). |

Every response includes your `legalActions` — pick one and pass it to `act`.
Illegal actions return an `error` plus the current `legalActions` so you can retry.

## Register the server

### Claude Code (this project)
A project-scoped [`.mcp.json`](../.mcp.json) is already included, so from the
repo root Claude Code discovers a `hexland` server automatically:

```json
{ "mcpServers": { "hexland": { "command": "bun", "args": ["run", "src/mcp/server.ts"] } } }
```

### Claude Desktop
Add to `claude_desktop_config.json` (use an absolute path):

```json
{
  "mcpServers": {
    "hexland": {
      "command": "bun",
      "args": ["run", "/absolute/path/to/hexland/src/mcp/server.ts"]
    }
  }
}
```

Then ask Claude: *"Start a Hexland game and play it."* It will call `new_game`,
read `legalActions`, and `act` turn by turn until someone reaches 10 VP.

## Run manually

```bash
bun run mcp     # starts the stdio server (for an MCP client to attach to)
```
