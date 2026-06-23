import { useState } from 'react';
import type { Resource } from '../../engine/types';
import { RESOURCES } from '../../engine/types';
import { Modal } from './Modal';
import { useI18n, tRes } from '../i18n';

interface Props {
  playable: { knight: boolean; roadBuilding: boolean; yearOfPlenty: boolean; monopoly: boolean };
  onKnight: () => void; onRoadBuilding: () => void;
  onYearOfPlenty: (r: [Resource, Resource]) => void; onMonopoly: (r: Resource) => void; onClose: () => void;
}
export function DevMenu({ playable, onKnight, onRoadBuilding, onYearOfPlenty, onMonopoly, onClose }: Props) {
  const { t } = useI18n();
  const [yop, setYop] = useState<Resource[]>([]);
  return (
    <Modal>
      <h3 style={{ marginTop: 0 }}>{t('dev.title')}</h3>
      <div style={{ display: 'grid', gap: 8 }}>
        {playable.knight && <button onClick={onKnight}>{t('dev.knight')}</button>}
        {playable.roadBuilding && <button onClick={onRoadBuilding}>{t('dev.roadBuilding')}</button>}
        {playable.monopoly && (
          <div>
            {t('dev.monopoly')}{' '}
            {RESOURCES.map(r => <button key={r} onClick={() => onMonopoly(r)}>{tRes(t, r)}</button>)}
          </div>
        )}
        {playable.yearOfPlenty && (
          <div>
            {t('dev.yearOfPlenty')}{' '}
            {RESOURCES.map(r => (
              <button key={r} onClick={() => {
                const next = [...yop, r];
                if (next.length === 2) onYearOfPlenty([next[0]!, next[1]!]);
                else setYop(next);
              }}>{tRes(t, r)}{yop.includes(r) ? '✓' : ''}</button>
            ))}
            <span> {t('dev.chosen', { list: yop.map(r => tRes(t, r)).join(', ') })}</span>
          </div>
        )}
        <button onClick={onClose}>{t('dev.cancel')}</button>
      </div>
    </Modal>
  );
}
