import type { ReactNode } from 'react';
export function Modal({ children }: { children: ReactNode }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'grid', placeItems: 'center', zIndex: 10 }}>
      <div style={{ background: '#1c2f43', padding: 20, borderRadius: 12, minWidth: 280, border: '1px solid #456' }}>
        {children}
      </div>
    </div>
  );
}
