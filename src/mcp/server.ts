// src/mcp/server.ts
// MCP server that lets Claude play Hexland. Claude is seat 0; the other seats
// are the built-in AI, advanced automatically, so Claude only acts on its own
// turn (or interrupts like discard/robber). Run: bun run src/mcp/server.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { createSession, newGame, act, view } from './session';
import type { Action, Difficulty } from '../engine/types';

const session = createSession();
const text = (obj: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(obj, null, 2) }] });

const server = new McpServer({ name: 'hexland', version: '1.0.0' });

server.registerTool('new_game', {
  description: 'Start a new Hexland game. You play seat 0; the other seats are AI and play automatically between your turns. ' +
    'Setup comes first (place 2 settlements + 2 roads), then normal play. Returns the board, your hand, opponents (public info), and your legal actions.',
  inputSchema: {
    aiOpponents: z.number().int().min(1).max(3).default(3).describe('number of AI opponents (1-3)'),
    difficulty: z.enum(['easy', 'medium', 'hard', 'impossible']).default('hard').describe('AI strength'),
    seed: z.number().int().optional().describe('board seed (omit for a fresh random board)'),
  },
}, async ({ aiOpponents, difficulty, seed }) =>
  text(newGame(session, { aiOpponents, difficulty: difficulty as Difficulty, seed })));

server.registerTool('state', {
  description: 'Get the current game state from your perspective, plus your legal actions.',
  inputSchema: {},
}, async () => text(view(session)));

server.registerTool('act', {
  description: 'Apply one of YOUR legal actions on your turn. Pass the exact action object (copy one from legalActions, ' +
    'or construct one such as {"type":"tradeBank","give":"wood","receive":"ore"} or {"type":"discard","resources":{"wood":2,...}}). ' +
    'After your action the AI seats play automatically and the new state is returned.',
  inputSchema: {
    action: z.object({ type: z.string() }).passthrough().describe('the action to apply'),
  },
}, async ({ action }) => text(act(session, action as unknown as Action)));

const transport = new StdioServerTransport();
await server.connect(transport);
console.error('Hexland MCP server running on stdio.');
