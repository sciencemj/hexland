// src/ui/App.tsx
import { useMemo, useState } from 'react';
import type { State, Action, PlayerId, HexId } from '../engine/types';
import { createGame } from '../engine/state';
import { countVictoryPoints } from '../engine/helpers';
import { requiredDiscardCount } from '../engine/rules';
import { nextActor } from '../engine/legal';
import { getAgent } from '../ai/registry';
import { useGame } from './useGame';
import { highlightsFor, actionForNode, actionForEdge, robberOptionsForHex, type Mode } from './interaction';
import { Board } from './components/Board';
import { PlayerPanel } from './components/PlayerPanel';
import { HandPanel } from './components/HandPanel';
import { DiceDisplay } from './components/DiceDisplay';
import { GameLog } from './components/GameLog';
import { ActionBar } from './components/ActionBar';
import { DiscardModal } from './components/DiscardModal';
import { RobberPrompt } from './components/RobberPrompt';
import { DevMenu } from './components/DevMenu';
import { TradePanel } from './components/TradePanel';
import { NewGameDialog } from './components/NewGameDialog';
import { InfoPanel } from './components/InfoPanel';
import { SettingsMenu } from './components/SettingsMenu';
import { loadAiDelay } from './components/SpeedToggle';
import { useI18n, displayName } from './i18n';
import { useGameFx } from './useGameFx';
import { playSfx } from './sound';

// public VP (hides opponents' hidden Victory Point cards)
function displayVp(state: State, pid: PlayerId, reveal: boolean): number {
  const full = countVictoryPoints(state, pid);
  if (reveal) return full;
  const hidden = state.players[pid]!.devCards.filter(c => c.type === 'victory').length;
  return full - hidden;
}

export function App() {
  const [start, setStart] = useState<{ state: State } | null>(null);
  if (!start) {
    return <NewGameDialog onStart={(ai, seed, difficulty) => setStart({ state: createGame({ numPlayers: 1 + ai, humanCount: 1, seed, difficulty }) })} />;
  }
  return <GameView initial={start.state} onExit={() => setStart(null)} />;
}

function GameView({ initial, onExit }: { initial: State; onExit: () => void }) {
  const { t } = useI18n();
  const [aiDelay, setAiDelay] = useState<number>(loadAiDelay);
  const agents = useMemo(() => initial.players.map(p => getAgent(p.aiDifficulty ?? 'medium')), [initial]);
  const { state, dispatch, legal } = useGame(initial, agents, aiDelay);
  const [mode, setMode] = useState<Mode>('idle');
  const [robberChoice, setRobberChoice] = useState<{ targets: PlayerId[]; byHex: HexId } | null>(null);
  const [devOpen, setDevOpen] = useState(false);
  const [tradeOpen, setTradeOpen] = useState(false);

  const human = 0;
  const { diceRollKey, recentEdges, recentNodes } = useGameFx(state, human, playSfx);
  const actor = nextActor(state);
  const humanUp = actor === human;
  const highlights = useMemo(() => highlightsFor(state, legal, mode), [state, legal, mode]);

  const act = (a: Action | null) => { if (a) { dispatch(a); setMode('idle'); } };
  const onNode = (id: number) => act(actionForNode(state, legal, mode, id));
  const onEdge = (id: number) => act(actionForEdge(state, legal, mode, id));
  const onHex = (id: HexId) => {
    const opts = robberOptionsForHex(state, legal, id);
    if (opts.length === 1) act(opts[0]!);
    else if (opts.length > 1) setRobberChoice({ targets: opts.map(o => (o as any).stealFrom).filter((x: any) => x !== null), byHex: id });
  };

  const has = (type: Action['type']) => legal.some(a => a.type === type);
  const pendingDiscard = state.pending?.kind === 'discard' && state.pending.remaining.includes(human);
  const pendingOffer = state.pending?.kind === 'tradeOffer' && state.pending.to === human;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr 340px', gap: 16, padding: 16 }}>
      {/* left column: players + log */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <button onClick={onExit}>{t('app.newGame')}</button>
          <SettingsMenu aiDelay={aiDelay} setAiDelay={setAiDelay} />
        </div>
        {state.players.map(p => (
          <PlayerPanel key={p.id} player={p}
            vp={displayVp(state, p.id, p.id === human)}
            isCurrent={state.currentPlayer === p.id}
            hasLongestRoad={state.bonuses.longestRoad === p.id}
            hasLargestArmy={state.bonuses.largestArmy === p.id}
            reveal={p.id === human} />
        ))}
        <GameLog log={state.log} />
      </div>

      {/* center: board + controls */}
      <div>
        <Board state={state} onNode={onNode} onEdge={onEdge} onHex={onHex}
          highlightNodes={highlights.nodes} highlightEdges={highlights.edges} highlightHexes={highlights.hexes}
          recentEdges={recentEdges} recentNodes={recentNodes} />

        <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <DiceDisplay dice={state.turn.dice} rollKey={diceRollKey} />
            {/* fixed-height slot so the cards below never shift between pre/post roll */}
            <div style={{ height: 48, display: 'flex', alignItems: 'center' }}>
              {humanUp && has('rollDice') && (
                <button onClick={() => dispatch({ type: 'rollDice' })}
                  style={{ padding: '12px 32px', fontSize: 18, fontWeight: 800, borderRadius: 12, cursor: 'pointer',
                    background: 'linear-gradient(#e8b94e,#d29a30)', color: '#1b2a3a', border: 'none',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.45)' }}>
                  {t('action.roll')}
                </button>
              )}
            </div>
          </div>
          <HandPanel player={state.players[human]!} />
          {humanUp && !state.pending && (
            <ActionBar legal={legal} mode={mode} setMode={setMode}
              onBuy={() => dispatch({ type: 'buyDevCard' })}
              onEndTurn={() => dispatch({ type: 'endTurn' })}
              onTrade={() => setTradeOpen(true)}
              onPlayDev={() => setDevOpen(true)} />
          )}
          {state.phase === 'setup' && humanUp && (
            <div>{t(legal[0]?.type === 'setupSettlement' ? 'app.setupSettlement' : 'app.setupRoad')}</div>
          )}
          {state.pending?.kind === 'robber' && state.pending.mover === human && (
            <div>{t('app.moveRobber')}</div>
          )}
        </div>
      </div>

      {/* right column: win conditions, tips, public opponent info */}
      <InfoPanel state={state} human={human} />

      {/* interrupts / overlays */}
      {pendingDiscard && (
        <DiscardModal player={state.players[human]!} count={requiredDiscardCount(state, human)}
          onConfirm={r => dispatch({ type: 'discard', resources: r })} />
      )}
      {robberChoice && (
        <RobberPrompt targets={robberChoice.targets} players={state.players}
          onPick={pid => {
            const opt = robberOptionsForHex(state, legal, robberChoice.byHex)
              .find(o => (o as any).stealFrom === pid) ?? null;
            setRobberChoice(null); act(opt);
          }} />
      )}
      {pendingOffer && state.pending?.kind === 'tradeOffer' && (
        <div style={{ position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)', background: '#24405c', padding: 12, borderRadius: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
          {t('app.tradeOffer', { name: displayName(t, state.players[state.pending.from]!.name) })}
          <button onClick={() => dispatch({ type: 'tradeRespond', accept: true })}>{t('app.accept')}</button>
          <button onClick={() => dispatch({ type: 'tradeRespond', accept: false })}>{t('app.decline')}</button>
        </div>
      )}
      {devOpen && (
        <DevMenu
          playable={{ knight: has('playKnight'), roadBuilding: has('playRoadBuilding'),
            yearOfPlenty: has('playYearOfPlenty'), monopoly: has('playMonopoly') }}
          onKnight={() => { setMode('knight'); setDevOpen(false); }}
          onRoadBuilding={() => { dispatch({ type: 'playRoadBuilding' }); setDevOpen(false); }}
          onYearOfPlenty={r => { dispatch({ type: 'playYearOfPlenty', resources: r }); setDevOpen(false); }}
          onMonopoly={r => { dispatch({ type: 'playMonopoly', resource: r }); setDevOpen(false); }}
          onClose={() => setDevOpen(false)} />
      )}
      {tradeOpen && (
        <TradePanel state={state} human={human}
          onTradeBank={(g, r) => dispatch({ type: 'tradeBank', give: g, receive: r })}
          onOffer={(to, give, want) => { dispatch({ type: 'tradeOffer', to, give, want }); setTradeOpen(false); }}
          onClose={() => setTradeOpen(false)} />
      )}
      {state.winner !== null && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'grid', placeItems: 'center', zIndex: 20 }}>
          <div style={{ background: '#1c2f43', padding: 28, borderRadius: 14, textAlign: 'center' }}>
            <h1>{t('app.wins', { name: displayName(t, state.players[state.winner]!.name) })}</h1>
            <button onClick={onExit}>{t('app.playAgain')}</button>
          </div>
        </div>
      )}
    </div>
  );
}
