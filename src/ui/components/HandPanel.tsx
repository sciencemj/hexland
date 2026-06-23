import type { Player, Resource } from '../../engine/types';
import { RESOURCES } from '../../engine/types';
import { useI18n, tRes } from '../i18n';

const RES_COLOR: Record<Resource, string> = {
  wood: '#2e7d32', brick: '#bf6a3a', sheep: '#7cc36b', wheat: '#e3bb43', ore: '#8a8d93',
};
const RES_ICON: Record<Resource, string> = { wood: '🌲', brick: '🧱', sheep: '🐑', wheat: '🌾', ore: '⛰️' };

function ResourceCard({ resource, count, name }: { resource: Resource; count: number; name: string }) {
  return (
    <div data-res={resource} style={{
      width: 56, height: 78, borderRadius: 9, overflow: 'hidden', display: 'flex', flexDirection: 'column',
      background: '#f3ead2', border: '1px solid #0b1d2b', boxShadow: '0 3px 7px rgba(0,0,0,0.45)',
      opacity: count === 0 ? 0.4 : 1, transition: 'opacity 0.2s',
    }}>
      <div style={{ height: 30, background: RES_COLOR[resource], display: 'grid', placeItems: 'center',
        fontSize: 17, borderBottom: '1px solid rgba(0,0,0,0.25)' }}>{RES_ICON[resource]}</div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
        <span style={{ fontSize: 22, fontWeight: 800, color: '#2a2a2a', lineHeight: 1 }}>{count}</span>
        <span style={{ fontSize: 9, color: '#5a5247' }}>{name}</span>
      </div>
    </div>
  );
}

export function HandPanel({ player }: { player: Player }) {
  const { t } = useI18n();
  const playable = player.devCards.filter(c => !c.played);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
        {RESOURCES.map(r => <ResourceCard key={r} resource={r} count={player.resources[r]} name={tRes(t, r)} />)}
      </div>
      {playable.length > 0 && (
        <span style={{ opacity: 0.85, fontSize: 12 }}>{t('hand.dev', { list: playable.map(c => t('devtype.' + c.type)).join(', ') })}</span>
      )}
    </div>
  );
}
