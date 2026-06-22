import { test, expect } from 'bun:test';
import { renderToString } from 'react-dom/server';
import { TradePanel } from '../../src/ui/components/TradePanel';
import { createGame } from '../../src/engine/state';

test('TradePanel shows the bank ratio for an affordable resource', () => {
  const s = createGame({ numPlayers: 4, seed: 5 });
  s.players[0]!.resources = { wood: 4, brick: 0, sheep: 0, wheat: 0, ore: 0 };
  const html = renderToString(<TradePanel state={s} human={0} onTradeBank={() => {}} onOffer={() => {}} onClose={() => {}} />);
  expect(html.toLowerCase()).toContain('bank');
  expect(html).toContain('4'); // 4:1 ratio shown for wood
});
