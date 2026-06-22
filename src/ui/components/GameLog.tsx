import type { LogEntry } from '../../engine/types';
export function GameLog({ log }: { log: LogEntry[] }) {
  const recent = log.slice(-8);
  return (
    <div style={{ fontSize: 12, background: '#13283b', borderRadius: 8, padding: 8, maxHeight: 160, overflow: 'auto' }}>
      {recent.map((e, i) => <div key={i}>· {e.text}</div>)}
    </div>
  );
}
