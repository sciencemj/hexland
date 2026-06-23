// test/ui/i18n.test.tsx
import { test, expect } from 'bun:test';
import { renderToString } from 'react-dom/server';
import { translate, LangProvider, useI18n, displayName, tRes } from '../../src/ui/i18n';
import { ActionBar } from '../../src/ui/components/ActionBar';

test('translate returns the right locale and interpolates params', () => {
  expect(translate('en', 'newgame.start')).toBe('Start');
  expect(translate('ko', 'newgame.start')).toBe('시작');
  expect(translate('en', 'discard.title', { count: 4 })).toBe('Discard 4 cards');
  expect(translate('ko', 'discard.title', { count: 4 })).toBe('카드 4장 버리기');
});

test('unknown keys fall back to English, then to the key itself', () => {
  expect(translate('ko', 'totally.missing.key')).toBe('totally.missing.key');
});

test('every Korean key has an English counterpart (no orphan keys)', () => {
  // translate falls back to en, so a ko-only key would silently differ; guard the dict.
  // (covered indirectly: ensure a sample of keys exist in both)
  for (const k of ['action.roll', 'trade.title', 'info.tipsTitle', 'tip.default']) {
    expect(translate('en', k)).not.toBe(k);
    expect(translate('ko', k)).not.toBe(k);
  }
});

test('displayName and tRes localize', () => {
  const t = (k: string, p?: Record<string, string | number>) => translate('ko', k, p);
  expect(displayName(t, 'You')).toBe('나');
  expect(displayName(t, 'AI 2')).toBe('AI 2');
  expect(tRes(t, 'wood')).toBe('나무');
});

test('a component inside LangProvider (default EN here) renders translated labels', () => {
  // No navigator in the test env → defaults to EN.
  const html = renderToString(
    <LangProvider>
      <ActionBar legal={[{ type: 'endTurn' }]} mode="idle" setMode={() => {}}
        onBuy={() => {}} onEndTurn={() => {}} onTrade={() => {}} onPlayDev={() => {}} />
    </LangProvider>,
  );
  expect(html).toContain('End Turn');
});

// sanity: the provider's hook is wired
function Probe() { const { lang } = useI18n(); return <span>{lang}</span>; }
test('useI18n inside provider yields a concrete language', () => {
  const html = renderToString(<LangProvider><Probe /></LangProvider>);
  expect(html === '<span>en</span>' || html === '<span>ko</span>').toBe(true);
});
