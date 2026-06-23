// src/ui/components/SpeedToggle.tsx
// Controls how long each AI action lingers before the next, so the human can
// watch AI turns at a comfortable pace.
export const SPEEDS = [
  { ms: 400, icon: '🐇' },  // fast
  { ms: 800, icon: '🚶' },  // normal
  { ms: 1600, icon: '🐢' }, // slow
];

export function loadAiDelay(): number {
  try {
    const v = Number(localStorage.getItem('catan.aidelay'));
    return SPEEDS.some(s => s.ms === v) ? v : 800;
  } catch { return 800; }
}

export function SpeedToggle({ value, onChange }: { value: number; onChange: (ms: number) => void }) {
  const set = (ms: number) => { try { localStorage.setItem('catan.aidelay', String(ms)); } catch { /* ignore */ } onChange(ms); };
  return (
    <div style={{ display: 'inline-flex', gap: 4 }} title="AI turn speed">
      {SPEEDS.map(s => (
        <button key={s.ms} onClick={() => set(s.ms)}
          style={{ padding: '3px 6px', borderRadius: 6, fontSize: 13, cursor: 'pointer',
            border: value === s.ms ? '2px solid #7cf' : '1px solid #456',
            background: value === s.ms ? '#24405c' : '#1c2a38', color: '#eee' }}>
          {s.icon}
        </button>
      ))}
    </div>
  );
}
