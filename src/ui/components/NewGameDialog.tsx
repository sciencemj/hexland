// src/ui/components/NewGameDialog.tsx
import { useState } from 'react';
import type { Difficulty } from '../../engine/types';
import { useI18n } from '../i18n';
import { LanguageToggle } from './LanguageToggle';

const DIFFS: Difficulty[] = ['easy', 'medium', 'hard', 'impossible'];

export function NewGameDialog({ onStart }: { onStart: (aiCount: number, seed: number, difficulty: Difficulty) => void }) {
  const { t } = useI18n();
  const [ai, setAi] = useState(3);
  const [seed, setSeed] = useState('1');
  const [diff, setDiff] = useState<Difficulty>('hard');
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
      <div style={{ background: '#1c2f43', padding: 28, borderRadius: 14, border: '1px solid #456', minWidth: 300 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}><LanguageToggle /></div>
        <h1 style={{ marginTop: 8 }}>{t('newgame.title')}</h1>
        <div style={{ margin: '12px 0' }}>
          {t('newgame.aiOpponents')}{' '}
          {[1, 2, 3].map(n => (
            <button key={n} onClick={() => setAi(n)}
              style={{ margin: 3, padding: '6px 12px', border: ai === n ? '2px solid #7cf' : '1px solid #456' }}>{n}</button>
          ))}
        </div>
        <div style={{ margin: '12px 0' }}>
          {t('newgame.difficulty')}{' '}
          {DIFFS.map(d => (
            <button key={d} onClick={() => setDiff(d)}
              style={{ margin: 3, padding: '6px 12px', border: diff === d ? '2px solid #7cf' : '1px solid #456' }}>
              {t(`diff.${d}`)}
            </button>
          ))}
        </div>
        <div style={{ margin: '12px 0' }}>
          {t('newgame.seed')} <input value={seed} onChange={e => setSeed(e.target.value)} style={{ width: 80 }} />
        </div>
        <button style={{ padding: '8px 16px', fontWeight: 700 }}
          onClick={() => onStart(ai, Number(seed) || 1, diff)}>{t('newgame.start')}</button>
        <p style={{ marginTop: 18, marginBottom: 0, fontSize: 11, opacity: 0.55, maxWidth: 300, lineHeight: 1.5 }}>
          {t('newgame.disclaimer')}
        </p>
      </div>
    </div>
  );
}
