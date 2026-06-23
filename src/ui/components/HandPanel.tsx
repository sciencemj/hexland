import type { Player } from '../../engine/types';
import { RESOURCES } from '../../engine/types';
import { useI18n, tRes } from '../i18n';

export function HandPanel({ player }: { player: Player }) {
  const { t } = useI18n();
  const playable = player.devCards.filter(c => !c.played);
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
      {RESOURCES.map(r => (
        <span key={r} data-res={r} style={{ padding: '4px 8px', borderRadius: 6, background: '#2a4660', display: 'inline-block' }}>
          {tRes(t, r)}: <b>{player.resources[r]}</b>
        </span>
      ))}
      {playable.length > 0 && (
        <span style={{ opacity: 0.85 }}>{t('hand.dev', { list: playable.map(c => t('devtype.' + c.type)).join(', ') })}</span>
      )}
    </div>
  );
}
