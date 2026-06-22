import type { Player } from '../../engine/types';
import { RESOURCES } from '../../engine/types';

export function HandPanel({ player }: { player: Player }) {
  const playable = player.devCards.filter(c => !c.played);
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
      {RESOURCES.map(r => (
        <span key={r} style={{ padding: '4px 8px', borderRadius: 6, background: '#2a4660' }}>
          {r}: <b>{player.resources[r]}</b>
        </span>
      ))}
      {playable.length > 0 && (
        <span style={{ opacity: 0.85 }}>dev: {playable.map(c => c.type).join(', ')}</span>
      )}
    </div>
  );
}
