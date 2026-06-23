import { useState } from 'react';
import type { Player, ResourceMap } from '../../engine/types';
import { RESOURCES, emptyResources } from '../../engine/types';
import { totalCards } from '../../engine/helpers';
import { Modal } from './Modal';
import { useI18n, tRes } from '../i18n';

export function DiscardModal({ player, count, onConfirm }: { player: Player; count: number; onConfirm: (r: ResourceMap) => void }) {
  const { t } = useI18n();
  const [sel, setSel] = useState<ResourceMap>(emptyResources());
  const chosen = totalCards(sel);
  const inc = (r: typeof RESOURCES[number], d: number) =>
    setSel(s => ({ ...s, [r]: Math.max(0, Math.min(player.resources[r], s[r] + d)) }));
  return (
    <Modal>
      <h3 style={{ marginTop: 0 }}>{t('discard.title', { count })}</h3>
      {RESOURCES.map(r => (
        <div key={r} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, margin: '4px 0' }}>
          <span>{t('discard.have', { res: tRes(t, r), n: player.resources[r] })}</span>
          <span>
            <button onClick={() => inc(r, -1)}>−</button>
            <b style={{ margin: '0 8px' }}>{sel[r]}</b>
            <button onClick={() => inc(r, 1)} disabled={chosen >= count}>＋</button>
          </span>
        </div>
      ))}
      <button style={{ marginTop: 10 }} disabled={chosen !== count} onClick={() => onConfirm(sel)}>
        {t('discard.confirm', { chosen, count })}
      </button>
    </Modal>
  );
}
