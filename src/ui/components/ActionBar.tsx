// src/ui/components/ActionBar.tsx
import type { Action } from '../../engine/types';
import type { Mode } from '../interaction';

interface Props {
  legal: Action[]; mode: Mode; setMode: (m: Mode) => void;
  onRoll: () => void; onBuy: () => void; onEndTurn: () => void;
  onTrade: () => void; onPlayDev: () => void;
}
export function ActionBar({ legal, mode, setMode, onRoll, onBuy, onEndTurn, onTrade, onPlayDev }: Props) {
  const has = (t: Action['type']) => legal.some(a => a.type === t);
  const btn = (label: string, on: () => void, enabled: boolean, active = false) => (
    <button disabled={!enabled} onClick={on}
      style={{ padding: '6px 10px', borderRadius: 6, border: active ? '2px solid #7cf' : '1px solid #456',
        background: enabled ? '#2a4660' : '#1c2a38', color: enabled ? '#eee' : '#789', cursor: enabled ? 'pointer' : 'default' }}>
      {label}
    </button>
  );
  const toggle = (m: Mode) => () => setMode(mode === m ? 'idle' : m);
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      {btn('🎲 Roll', onRoll, has('rollDice'))}
      {btn('Road', toggle('road'), has('buildRoad'), mode === 'road')}
      {btn('Settlement', toggle('settlement'), has('buildSettlement'), mode === 'settlement')}
      {btn('City', toggle('city'), has('buildCity'), mode === 'city')}
      {btn('Buy Dev', onBuy, has('buyDevCard'))}
      {btn('Play Dev', onPlayDev, has('playKnight') || has('playRoadBuilding') || has('playYearOfPlenty') || has('playMonopoly'))}
      {btn('Trade', onTrade, has('tradeBank'))}
      {btn('End Turn', onEndTurn, has('endTurn'))}
    </div>
  );
}
