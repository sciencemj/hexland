// src/ui/useGameFx.ts
import { useEffect, useRef, useState } from 'react';
import type { State, PlayerId, EdgeId, NodeId, Resource } from '../engine/types';
import { computeFx } from './fx';

const RES_EMOJI: Record<Resource, string> = { wood: '🌲', brick: '🧱', sheep: '🐑', wheat: '🌾', ore: '⛰️' };

// Fly a resource token from each producing tile into its hand-count chip.
function launchFly(gains: { hex: number; resource: Resource }[]) {
  if (typeof document === 'undefined') return;
  gains.forEach((g, i) => {
    const src = document.querySelector(`[data-hex="${g.hex}"]`);
    const dst = document.querySelector(`[data-res="${g.resource}"]`) as HTMLElement | null;
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
      { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 46}px) scale(1.25)`, opacity: 1, offset: 0.5 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.6)`, opacity: 0.9 },
    ], { duration: 720, delay: i * 90, easing: 'cubic-bezier(.35,.1,.25,1)', fill: 'forwards' });

    anim.onfinish = () => {
      el.remove();
      dst.classList.remove('fx-chip-pop'); void dst.offsetWidth; dst.classList.add('fx-chip-pop');
      setTimeout(() => dst.classList.remove('fx-chip-pop'), 450);
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
    const fx = computeFx(prev.current, state, human);
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
    if (fx.humanGains.length) {
      launchFly(fx.humanGains);
      after(650, () => onSfx?.('resource')); // ding as the first token lands
    }
    if (fx.devCardBought) onSfx?.('devcard');
    if (fx.robberMoved) onSfx?.('robber');
  }, [state, human, onSfx]);

  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);

  return { diceRollKey, recentEdges, recentNodes };
}
