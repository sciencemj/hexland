// src/ui/components/SettingsMenu.tsx
import { useState } from 'react';
import type { ReactNode } from 'react';
import { useI18n } from '../i18n';
import { SpeedToggle } from './SpeedToggle';
import { SoundToggle } from './SoundToggle';
import { LanguageToggle } from './LanguageToggle';

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
      <span style={{ fontSize: 12, opacity: 0.85 }}>{label}</span>
      {children}
    </div>
  );
}

export function SettingsMenu({ aiDelay, setAiDelay }: { aiDelay: number; setAiDelay: (ms: number) => void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} title={t('settings.title')}
        style={{ padding: '4px 9px', borderRadius: 6, fontSize: 14, cursor: 'pointer',
          border: open ? '2px solid #7cf' : '1px solid #456', background: open ? '#24405c' : '#1c2a38', color: '#eee' }}>
        ⚙️
      </button>
      {open && (
        <>
          {/* click-away backdrop */}
          <div onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 30 }} />
          <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', zIndex: 31,
            background: '#1c2f43', border: '1px solid #456', borderRadius: 10, padding: 12,
            display: 'grid', gap: 10, minWidth: 200, boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
            <Row label={t('settings.speed')}><SpeedToggle value={aiDelay} onChange={setAiDelay} /></Row>
            <Row label={t('settings.sound')}><SoundToggle /></Row>
            <Row label={t('lang.label')}><LanguageToggle /></Row>
          </div>
        </>
      )}
    </div>
  );
}
