import type { Player, PlayerId } from '../../engine/types';
import { Modal } from './Modal';
import { useI18n, displayName } from '../i18n';

export function RobberPrompt({ targets, players, onPick }: { targets: PlayerId[]; players: Player[]; onPick: (p: PlayerId | null) => void }) {
  const { t } = useI18n();
  return (
    <Modal>
      <h3 style={{ marginTop: 0 }}>{t('robber.stealFrom')}</h3>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {targets.map(pid => (
          <button key={pid} onClick={() => onPick(pid)} style={{ borderLeft: `4px solid ${players[pid]!.color}`, padding: '6px 10px' }}>
            {displayName(t, players[pid]!.name)}
          </button>
        ))}
        <button onClick={() => onPick(null)}>{t('robber.nobody')}</button>
      </div>
    </Modal>
  );
}
