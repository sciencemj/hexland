// src/ui/components/LanguageToggle.tsx
import { LANGS, useI18n, type Lang } from '../i18n';

const LABEL: Record<Lang, string> = { en: 'EN', ko: '한국어' };

export function LanguageToggle() {
  const { lang, setLang } = useI18n();
  return (
    <div style={{ display: 'inline-flex', gap: 4 }}>
      {LANGS.map(l => (
        <button key={l} onClick={() => setLang(l)}
          style={{
            padding: '3px 8px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
            border: lang === l ? '2px solid #7cf' : '1px solid #456',
            background: lang === l ? '#24405c' : '#1c2a38', color: '#eee',
          }}>
          {LABEL[l]}
        </button>
      ))}
    </div>
  );
}
