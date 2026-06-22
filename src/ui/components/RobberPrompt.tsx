import type { Player, PlayerId } from '../../engine/types';
import { Modal } from './Modal';
export function RobberPrompt({ targets, players, onPick }: { targets: PlayerId[]; players: Player[]; onPick: (p: PlayerId | null) => void }) {
  return (
    <Modal>
      <h3 style={{ marginTop: 0 }}>Steal from?</h3>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {targets.map(t => (
          <button key={t} onClick={() => onPick(t)} style={{ borderLeft: `4px solid ${players[t]!.color}`, padding: '6px 10px' }}>
            {players[t]!.name}
          </button>
        ))}
        <button onClick={() => onPick(null)}>Nobody</button>
      </div>
    </Modal>
  );
}
