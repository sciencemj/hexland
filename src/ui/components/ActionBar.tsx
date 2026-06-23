// src/ui/components/ActionBar.tsx
import type { Action } from '../../engine/types';
import type { Mode } from '../interaction';
import { useI18n } from '../i18n';

interface Props {
  legal: Action[]; mode: Mode; setMode: (m: Mode) => void;
  onRoll: () => void; onBuy: () => void; onEndTurn: () => void;
  onTrade: () => void; onPlayDev: () => void;
}
export function ActionBar({ legal, mode, setMode, onRoll, onBuy, onEndTurn, onTrade, onPlayDev }: Props) {
  const { t } = useI18n();
  const has = (type: Action['type']) => legal.some(a => a.type === type);
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
      {btn(t('action.roll'), onRoll, has('rollDice'))}
      {btn(t('action.road'), toggle('road'), has('buildRoad'), mode === 'road')}
      {btn(t('action.settlement'), toggle('settlement'), has('buildSettlement'), mode === 'settlement')}
      {btn(t('action.city'), toggle('city'), has('buildCity'), mode === 'city')}
      {btn(t('action.buyDev'), onBuy, has('buyDevCard'))}
      {btn(t('action.playDev'), onPlayDev, has('playKnight') || has('playRoadBuilding') || has('playYearOfPlenty') || has('playMonopoly'))}
      {/* trade is open in the whole main phase (endTurn legal), not only when a 4:1 bank trade is affordable */}
      {btn(t('action.trade'), onTrade, has('tradeBank') || has('endTurn'))}
      {btn(t('action.endTurn'), onEndTurn, has('endTurn'))}
    </div>
  );
}
