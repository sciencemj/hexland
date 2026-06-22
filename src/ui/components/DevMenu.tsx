import { useState } from 'react';
import type { Resource } from '../../engine/types';
import { RESOURCES } from '../../engine/types';
import { Modal } from './Modal';

interface Props {
  playable: { knight: boolean; roadBuilding: boolean; yearOfPlenty: boolean; monopoly: boolean };
  onKnight: () => void; onRoadBuilding: () => void;
  onYearOfPlenty: (r: [Resource, Resource]) => void; onMonopoly: (r: Resource) => void; onClose: () => void;
}
export function DevMenu({ playable, onKnight, onRoadBuilding, onYearOfPlenty, onMonopoly, onClose }: Props) {
  const [yop, setYop] = useState<Resource[]>([]);
  return (
    <Modal>
      <h3 style={{ marginTop: 0 }}>Play a development card</h3>
      <div style={{ display: 'grid', gap: 8 }}>
        {playable.knight && <button onClick={onKnight}>Knight (move robber)</button>}
        {playable.roadBuilding && <button onClick={onRoadBuilding}>Road Building (2 free roads)</button>}
        {playable.monopoly && (
          <div>
            Monopoly:{' '}
            {RESOURCES.map(r => <button key={r} onClick={() => onMonopoly(r)}>{r}</button>)}
          </div>
        )}
        {playable.yearOfPlenty && (
          <div>
            Year of Plenty (pick 2):{' '}
            {RESOURCES.map(r => (
              <button key={r} onClick={() => {
                const next = [...yop, r];
                if (next.length === 2) onYearOfPlenty([next[0]!, next[1]!]);
                else setYop(next);
              }}>{r}{yop.includes(r) ? '✓' : ''}</button>
            ))}
            <span> chosen: {yop.join(', ')}</span>
          </div>
        )}
        <button onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  );
}
