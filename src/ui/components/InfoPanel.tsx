// src/ui/components/InfoPanel.tsx
import { useState } from 'react';
import type { ReactNode } from 'react';
import type { State, PlayerId, Resource } from '../../engine/types';
import { totalCards } from '../../engine/helpers';
import { productionProfile, publicVictoryPoints, contextualTips } from '../insights';
import { useI18n, displayName } from '../i18n';

const RES_ICON: Record<Resource, string> = { wood: '🌲', brick: '🧱', sheep: '🐑', wheat: '🌾', ore: '⛰️' };

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, opacity: 0.95 }}>{title}</div>
      <div style={{ fontSize: 12, lineHeight: 1.5, opacity: 0.9 }}>{children}</div>
    </div>
  );
}

export function InfoPanel({ state, human }: { state: State; human: PlayerId }) {
  const { t } = useI18n();
  const [showRef, setShowRef] = useState(false);
  const tips = contextualTips(state, human, t);
  const opponents = state.players.filter(p => p.id !== human);
  const myVp = publicVictoryPoints(state, human)
    + state.players[human]!.devCards.filter(c => c.type === 'victory').length; // human sees own VP cards

  return (
    <div style={{ background: '#13283b', borderRadius: 10, padding: 12, alignSelf: 'start', position: 'sticky', top: 16 }}>
      <Section title={t('info.victoryTitle', { vp: myVp })}>
        {t('info.victoryBody')}<br />{t('info.vpSources')}
      </Section>

      <Section title={t('info.tipsTitle')}>
        {tips.map((tip, i) => <div key={i} style={{ marginBottom: 4 }}>· {tip}</div>)}
      </Section>

      <Section title={t('info.opponentsTitle')}>
        {opponents.map(p => {
          const prof = productionProfile(state, p.id);
          const devCount = p.devCards.filter(c => !c.played).length;
          return (
            <div key={p.id} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid #24405c' }}>
              <div>
                <b style={{ color: p.color }}>● {displayName(t, p.name)}</b> — {t('player.vp', { n: publicVictoryPoints(state, p.id) })}
                {state.bonuses.longestRoad === p.id ? ' 🛣️' : ''}{state.bonuses.largestArmy === p.id ? ' ⚔️' : ''}
              </div>
              <div style={{ opacity: 0.85 }}>
                {t('info.cardsLine', { cards: totalCards(p.resources), dev: devCount, knights: p.playedKnights })}
              </div>
              <div style={{ opacity: 0.85 }}>
                {t('info.makes', {
                  list: prof.length ? prof.map(e => `${RES_ICON[e.resource]}${e.numbers.join('/')}`).join('  ') : '—',
                })}
              </div>
            </div>
          );
        })}
        <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>{t('info.hiddenNote')}</div>
      </Section>

      <button onClick={() => setShowRef(s => !s)}
        style={{ width: '100%', padding: '6px 8px', background: '#24405c', color: '#eee', border: '1px solid #456', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
        {t('info.reference')} {showRef ? '▲' : '▼'}
      </button>
      {showRef && (
        <div style={{ fontSize: 12, lineHeight: 1.5, opacity: 0.9, marginTop: 8 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>{t('info.buildCosts')}</div>
          <div style={{ whiteSpace: 'pre-line' }}>{t('info.costsBody')}</div>
          <div style={{ fontWeight: 700, margin: '8px 0 4px' }}>{t('info.diceOdds')}</div>
          {t('info.diceBody')}
          <div style={{ fontWeight: 700, margin: '8px 0 4px' }}>{t('info.strategy')}</div>
          <div style={{ whiteSpace: 'pre-line' }}>{t('info.strategyBody')}</div>
        </div>
      )}
    </div>
  );
}
