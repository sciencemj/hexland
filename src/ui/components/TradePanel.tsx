import { useState } from 'react';
import type { State, PlayerId, Resource, ResourceMap } from '../../engine/types';
import { RESOURCES, emptyResources } from '../../engine/types';
import { bankRatioFor } from '../../engine/rules';
import { Modal } from './Modal';

export function TradePanel({ state, human, onTradeBank, onOffer, onClose }: {
  state: State; human: PlayerId;
  onTradeBank: (give: Resource, receive: Resource) => void;
  onOffer: (to: PlayerId, give: ResourceMap, want: ResourceMap) => void;
  onClose: () => void;
}) {
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
      <h3 style={{ marginTop: 0 }}>Trade</h3>

      <div style={{ marginBottom: 14 }}>
        <b>Bank / Port</b>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '6px 0' }}>
          {RESOURCES.map(r => {
            const ratio = bankRatioFor(state, human, r);
            const ok = me.resources[r] >= ratio;
            return <button key={r} disabled={!ok} onClick={() => setBankGive(r)}
              style={{ border: bankGive === r ? '2px solid #7cf' : '1px solid #456', padding: '4px 8px' }}>
              give {ratio} {r}
            </button>;
          })}
        </div>
        {bankGive && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            receive:{' '}
            {RESOURCES.filter(r => r !== bankGive && state.bank.resources[r] > 0).map(r => (
              <button key={r} onClick={() => { onTradeBank(bankGive, r); setBankGive(null); }}>{r}</button>
            ))}
          </div>
        )}
      </div>

      <div>
        <b>Offer a player</b>
        <div>to: {opponents.map(o => (
          <button key={o.id} onClick={() => setTo(o.id)} style={{ border: to === o.id ? '2px solid #7cf' : '1px solid #456', margin: 2 }}>{o.name}</button>
        ))}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, margin: '6px 0' }}>
          <div><u>You give</u>{RESOURCES.map(r => (
            <div key={r}>{r}: <button onClick={() => bump(setGive, r, -1, me.resources[r])}>−</button> {give[r]} <button onClick={() => bump(setGive, r, 1, me.resources[r])}>＋</button></div>
          ))}</div>
          <div><u>You want</u>{RESOURCES.map(r => (
            <div key={r}>{r}: <button onClick={() => bump(setWant, r, -1, 19)}>−</button> {want[r]} <button onClick={() => bump(setWant, r, 1, 19)}>＋</button></div>
          ))}</div>
        </div>
        <button onClick={() => onOffer(to, give, want)}>Send offer</button>
      </div>

      <button style={{ marginTop: 12 }} onClick={onClose}>Close</button>
    </Modal>
  );
}
