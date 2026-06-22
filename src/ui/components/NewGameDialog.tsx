// src/ui/components/NewGameDialog.tsx
import { useState } from 'react';

export function NewGameDialog({ onStart }: { onStart: (aiCount: number, seed: number) => void }) {
  const [ai, setAi] = useState(3);
  const [seed, setSeed] = useState('1');
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
      <div style={{ background: '#1c2f43', padding: 28, borderRadius: 14, border: '1px solid #456', minWidth: 300 }}>
        <h1 style={{ marginTop: 0 }}>Catan — New Game</h1>
        <div style={{ margin: '12px 0' }}>
          AI opponents:{' '}
          {[1, 2, 3].map(n => (
            <button key={n} onClick={() => setAi(n)}
              style={{ margin: 3, padding: '6px 12px', border: ai === n ? '2px solid #7cf' : '1px solid #456' }}>{n}</button>
          ))}
        </div>
        <div style={{ margin: '12px 0' }}>
          Seed: <input value={seed} onChange={e => setSeed(e.target.value)} style={{ width: 80 }} />
        </div>
        <button style={{ padding: '8px 16px', fontWeight: 700 }}
          onClick={() => onStart(ai, Number(seed) || 1)}>Start</button>
      </div>
    </div>
  );
}
