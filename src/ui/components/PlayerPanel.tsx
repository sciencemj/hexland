import type { Player } from '../../engine/types';
import { RESOURCES } from '../../engine/types';
import { totalCards } from '../../engine/helpers';

interface Props {
  player: Player; vp: number; isCurrent: boolean;
  hasLongestRoad: boolean; hasLargestArmy: boolean; reveal: boolean;
}
export function PlayerPanel({ player, vp, isCurrent, hasLongestRoad, hasLargestArmy, reveal }: Props) {
  return (
    <div style={{ padding: 8, borderRadius: 8, marginBottom: 6,
      background: isCurrent ? '#24405c' : '#1c2f43', border: `2px solid ${player.color}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
        <span><span style={{ color: player.color }}>●</span> {player.name}{player.isAI ? ' 🤖' : ''}</span>
        <span>{vp} VP</span>
      </div>
      <div style={{ fontSize: 12, opacity: 0.85 }}>
        {reveal
          ? RESOURCES.map(r => `${r[0]!.toUpperCase()}:${player.resources[r]}`).join('  ')
          : `cards: ${totalCards(player.resources)}`}
      </div>
      <div style={{ fontSize: 12, opacity: 0.85 }}>
        dev: {player.devCards.filter(c => !c.played || c.type === 'victory').length} · knights: {player.playedKnights}
        {hasLongestRoad ? ' · 🛣️ Road' : ''}{hasLargestArmy ? ' · ⚔️ Army' : ''}
      </div>
    </div>
  );
}
