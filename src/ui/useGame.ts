// src/ui/useGame.ts
import { useEffect, useState } from 'react';
import type { State, Action } from '../engine/types';
import { getLegalActions, nextActor } from '../engine/legal';
import { applyAction } from '../engine/reduce';
import type { Agent } from '../ai/agent';
import { aiActionFor } from '../ai/runner';

export function useGame(initial: State, agents: Agent[]) {
  const [state, setState] = useState<State>(initial);

  useEffect(() => {
    const next = aiActionFor(state, agents);
    if (!next) return;
    const t = setTimeout(() => setState(s => applyAction(s, next.actor, next.action)), 600);
    return () => clearTimeout(t);
  }, [state, agents]);

  const actor = nextActor(state);
  const humanUp = actor !== null && !state.players[actor]!.isAI;
  const legal = humanUp ? getLegalActions(state, actor!) : [];

  const dispatch = (action: Action) => {
    const who = nextActor(state);
    if (who === null || state.players[who]!.isAI) return;
    setState(s => applyAction(s, who, action));
  };

  return { state, dispatch, legal };
}
