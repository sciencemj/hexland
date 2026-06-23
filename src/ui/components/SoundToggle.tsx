// src/ui/components/SoundToggle.tsx
import { useState } from 'react';
import { isMuted, setMuted } from '../sound';

export function SoundToggle() {
  const [muted, setM] = useState(isMuted());
  return (
    <button onClick={() => { const next = !muted; setMuted(next); setM(next); }}
      title="sound on/off"
      style={{ padding: '3px 8px', borderRadius: 6, fontSize: 13, cursor: 'pointer',
        border: '1px solid #456', background: '#1c2a38', color: '#eee' }}>
      {muted ? '🔇' : '🔊'}
    </button>
  );
}
