// src/ui/useGameFx.ts
import { useEffect, useRef, useState } from 'react';
import type { State, PlayerId, EdgeId, NodeId, Resource } from '../engine/types';
import { computeFx } from './fx';

const RES_EMOJI: Record<Resource, string> = { wood: '🌲', brick: '🧱', sheep: '🐑', wheat: '🌾', ore: '⛰️' };

// Fly a resource token from each producing tile to its destination: the human's
// hand chip (by resource) or an opponent's player panel (by id). The target pops
// on arrival.
function launchFly(gains: { player: PlayerId; hex: number; resource: Resource }[], human: PlayerId) {
  if (typeof document === 'undefined') return;
  gains.forEach((g, i) => {
    const src = document.querySelector(`[data-hex="${g.hex}"]`);
    const dst = (g.player === human
      ? document.querySelector(`[data-res="${g.resource}"]`)
      : document.querySelector(`[data-player="${g.player}"]`)) as HTMLElement | null;
    if (!src || !dst) return;
    const s = src.getBoundingClientRect(), d = dst.getBoundingClientRect();
    const sx = s.left + s.width / 2, sy = s.top + s.height / 2;
    const dx = (d.left + d.width / 2) - sx, dy = (d.top + d.height / 2) - sy;

    const el = document.createElement('div');
    el.className = 'fx-fly';
    el.textContent = RES_EMOJI[g.resource];
    el.style.left = `${sx - 11}px`;
    el.style.top = `${sy - 11}px`;
    document.body.appendChild(el);

    const anim = el.animate([
      { transform: 'translate(0,0) scale(0.5)', opacity: 0.15 },
      { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 46}px) scale(1.2)`, opacity: 1, offset: 0.5 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.55)`, opacity: 0.85 },
    ], { duration: 720, delay: i * 70, easing: 'cubic-bezier(.35,.1,.25,1)', fill: 'forwards' });

    anim.onfinish = () => {
      el.remove();
      const cls = g.player === human ? 'fx-chip-pop' : 'fx-panel-pop';
      dst.classList.remove(cls); void dst.offsetWidth; dst.classList.add(cls);
      setTimeout(() => dst.classList.remove(cls), 520);
    };
  });
}

export function useGameFx(state: State, human: PlayerId, onSfx?: (name: string) => void) {
  const prev = useRef(state);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [diceRollKey, setDiceRollKey] = useState(0);
  const [recentEdges, setRecentEdges] = useState<Set<EdgeId>>(() => new Set());
  const [recentNodes, setRecentNodes] = useState<Set<NodeId>>(() => new Set());

  useEffect(() => {
    const fx = computeFx(prev.current, state);
    prev.current = state;
    const after = (ms: number, fn: () => void) => { const id = setTimeout(fn, ms); timers.current.push(id); };

    if (fx.diceRolled) { setDiceRollKey(k => k + 1); onSfx?.('dice'); }

    if (fx.newRoads.length) {
      setRecentEdges(new Set(fx.newRoads));
      onSfx?.('road');
      after(560, () => setRecentEdges(new Set()));
    }
    if (fx.newBuildings.length) {
      setRecentNodes(new Set(fx.newBuildings.map(b => b.node)));
      onSfx?.(fx.newBuildings.some(b => b.type === 'city') ? 'city' : 'build');
      after(560, () => setRecentNodes(new Set()));
    }
    if (fx.gains.length) {
      launchFly(fx.gains, human);
      if (fx.gains.some(g => g.player === human)) after(650, () => onSfx?.('resource'));
    }
    if (fx.devCardBought) onSfx?.('devcard');
    if (fx.robberMoved) onSfx?.('robber');
  }, [state, human, onSfx]);

  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);

  return { diceRollKey, recentEdges, recentNodes };
}
