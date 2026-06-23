// src/ui/components/InfoPanel.tsx
import { useState } from 'react';
import type { ReactNode } from 'react';
import type { State, PlayerId, Resource } from '../../engine/types';
import { totalCards } from '../../engine/helpers';
import { productionProfile, publicVictoryPoints, contextualTips } from '../insights';

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
  const [showRef, setShowRef] = useState(false);
  const tips = contextualTips(state, human);
  const opponents = state.players.filter(p => p.id !== human);
  const myVp = publicVictoryPoints(state, human)
    + state.players[human]!.devCards.filter(c => c.type === 'victory').length; // human sees own VP cards

  return (
    <div style={{ background: '#13283b', borderRadius: 10, padding: 12, alignSelf: 'start', position: 'sticky', top: 16 }}>
      <Section title={`🏆 Victory — ${myVp}/10 VP`}>
        First to <b>10 VP</b> on their own turn wins.<br />
        Settlement <b>1</b> · City <b>2</b> · VP card <b>1</b> · Longest Road <b>2</b> (5+ road) · Largest Army <b>2</b> (3+ knights).
      </Section>

      <Section title="💡 Tips">
        {tips.map((t, i) => <div key={i} style={{ marginBottom: 4 }}>· {t}</div>)}
      </Section>

      <Section title="👁 Opponents (public info)">
        {opponents.map(p => {
          const prof = productionProfile(state, p.id);
          const devCount = p.devCards.filter(c => !c.played).length;
          return (
            <div key={p.id} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid #24405c' }}>
              <div>
                <b style={{ color: p.color }}>● {p.name}</b> — {publicVictoryPoints(state, p.id)} VP
                {state.bonuses.longestRoad === p.id ? ' 🛣️' : ''}{state.bonuses.largestArmy === p.id ? ' ⚔️' : ''}
              </div>
              <div style={{ opacity: 0.85 }}>
                {totalCards(p.resources)} cards · {devCount} dev · {p.playedKnights} knights
              </div>
              <div style={{ opacity: 0.85 }}>
                makes: {prof.length
                  ? prof.map(e => `${RES_ICON[e.resource]}${e.numbers.join('/')}`).join('  ')
                  : '—'}
              </div>
            </div>
          );
        })}
        <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>
          Exact hands stay hidden — only counts & what they produce are shown.
        </div>
      </Section>

      <button onClick={() => setShowRef(s => !s)}
        style={{ width: '100%', padding: '6px 8px', background: '#24405c', color: '#eee', border: '1px solid #456', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
        📖 Reference {showRef ? '▲' : '▼'}
      </button>
      {showRef && (
        <div style={{ fontSize: 12, lineHeight: 1.5, opacity: 0.9, marginTop: 8 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Build costs</div>
          🛣️ Road = 🌲+🧱<br />
          🏠 Settlement = 🌲+🧱+🐑+🌾<br />
          🏙️ City = 3⛰️+2🌾 (upgrades a settlement)<br />
          🃏 Dev card = ⛰️+🐑+🌾
          <div style={{ fontWeight: 700, margin: '8px 0 4px' }}>Dice odds</div>
          6 & 8 roll most (5/36 each) · 7 = robber (6/36) · 2 & 12 rarest (1/36).
          <div style={{ fontWeight: 700, margin: '8px 0 4px' }}>Strategy</div>
          · Diversify resources; aim for ore+wheat to reach cities.<br />
          · A port (2:1 / 3:1) turns a surplus resource into anything.<br />
          · On a 7, move the robber onto the leader's best hex and steal from them.<br />
          · A dev card can't be played the turn you buy it (except a VP card that wins).<br />
          · Keep your hand at 7 or fewer to dodge the 7-discard.
        </div>
      )}
    </div>
  );
}
