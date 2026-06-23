import { useState } from 'react';
import type { State, PlayerId, Resource, ResourceMap } from '../../engine/types';
import { RESOURCES, emptyResources } from '../../engine/types';
import { bankRatioFor } from '../../engine/rules';
import { Modal } from './Modal';
import { useI18n, tRes, displayName } from '../i18n';

export function TradePanel({ state, human, onTradeBank, onOffer, onClose }: {
  state: State; human: PlayerId;
  onTradeBank: (give: Resource, receive: Resource) => void;
  onOffer: (to: PlayerId, give: ResourceMap, want: ResourceMap) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const me = state.players[human]!;
  const opponents = state.players.filter(p => p.id !== human);
  const [give, setGive] = useState<ResourceMap>(emptyResources());
  const [want, setWant] = useState<ResourceMap>(emptyResources());
  const [to, setTo] = useState<PlayerId>(opponents[0]!.id);
  const [bankGive, setBankGive] = useState<Resource | null>(null);

  const bump = (set: typeof setGive, r: Resource, d: number, cap: number) =>
    set(s => ({ ...s, [r]: Math.max(0, Math.min(cap, s[r] + d)) }));

  return (
    <Modal>
      <h3 style={{ marginTop: 0 }}>{t('trade.title')}</h3>

      <div style={{ marginBottom: 14 }}>
        <b>{t('trade.bankPort')}</b>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '6px 0' }}>
          {RESOURCES.map(r => {
            const ratio = bankRatioFor(state, human, r);
            const ok = me.resources[r] >= ratio;
            return <button key={r} disabled={!ok} onClick={() => setBankGive(r)}
              style={{ border: bankGive === r ? '2px solid #7cf' : '1px solid #456', padding: '4px 8px' }}>
              {t('trade.give', { ratio, res: tRes(t, r) })}
            </button>;
          })}
        </div>
        {bankGive && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {t('trade.receive')}{' '}
            {RESOURCES.filter(r => r !== bankGive && state.bank.resources[r] > 0).map(r => (
              <button key={r} onClick={() => { onTradeBank(bankGive, r); setBankGive(null); }}>{tRes(t, r)}</button>
            ))}
          </div>
        )}
      </div>

      <div>
        <b>{t('trade.offerPlayer')}</b>
        <div>{t('trade.to')} {opponents.map(o => (
          <button key={o.id} onClick={() => setTo(o.id)} style={{ border: to === o.id ? '2px solid #7cf' : '1px solid #456', margin: 2 }}>{displayName(t, o.name)}</button>
        ))}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, margin: '6px 0' }}>
          <div><u>{t('trade.youGive')}</u>{RESOURCES.map(r => (
            <div key={r}>{tRes(t, r)}: <button onClick={() => bump(setGive, r, -1, me.resources[r])}>−</button> {give[r]} <button onClick={() => bump(setGive, r, 1, me.resources[r])}>＋</button></div>
          ))}</div>
          <div><u>{t('trade.youWant')}</u>{RESOURCES.map(r => (
            <div key={r}>{tRes(t, r)}: <button onClick={() => bump(setWant, r, -1, 19)}>−</button> {want[r]} <button onClick={() => bump(setWant, r, 1, 19)}>＋</button></div>
          ))}</div>
        </div>
        <button onClick={() => onOffer(to, give, want)}>{t('trade.sendOffer')}</button>
      </div>

      <button style={{ marginTop: 12 }} onClick={onClose}>{t('trade.close')}</button>
    </Modal>
  );
}
