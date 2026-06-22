// src/engine/index.ts
export { createGame, redactFor, checkWinner } from './state';
export { getLegalActions } from './legal';
export { applyAction, produceResources } from './reduce';
export * from './types';
