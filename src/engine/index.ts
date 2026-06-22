// src/engine/index.ts
export { createGame, redactFor, checkWinner } from './state';
export { getLegalActions, nextActor } from './legal';
export { applyAction, produceResources } from './reduce';
export * from './types';
