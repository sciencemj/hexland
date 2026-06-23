// src/ui/useGame.ts
import { useEffect, useState } from 'react';
import type { State, Action } from '../engine/types';
import { getLegalActions, nextActor } from '../engine/legal';
import { applyAction } from '../engine/reduce';
import type { Agent } from '../ai/agent';
import { aiActionFor } from '../ai/runner';

// Never let an engine throw crash the React render. Returning the input
// state unchanged means a bad action is a no-op rather than a white screen.
function safeApply(s: State, actor: number, action: Action): State {
  try {
    return applyAction(s, actor, action);
  } catch (e) {
    console.error('action rejected by engine:', action, e);
    return s;
  }
}

export function useGame(initial: State, agents: Agent[]) {
  const [state, setState] = useState<State>(initial);

  useEffect(() => {
    const next = aiActionFor(state, agents);
    if (!next) return;
    const t = setTimeout(() => setState(s => safeApply(s, next.actor, next.action)), 600);
    return () => clearTimeout(t);
  }, [state, agents]);

  const actor = nextActor(state);
  const humanUp = actor !== null && !state.players[actor]!.isAI;
  const legal = humanUp ? getLegalActions(state, actor!) : [];

  const dispatch = (action: Action) => {
    setState(s => {
      const who = nextActor(s);
      if (who === null || s.players[who]!.isAI) return s; // only the human acts via dispatch
      return safeApply(s, who, action);
    });
  };

  return { state, dispatch, legal };
}
