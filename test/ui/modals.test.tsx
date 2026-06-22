// test/ui/modals.test.tsx
import { test, expect } from 'bun:test';
import { renderToString } from 'react-dom/server';
import { DiscardModal } from '../../src/ui/components/DiscardModal';
import { RobberPrompt } from '../../src/ui/components/RobberPrompt';
import { createGame } from '../../src/engine/state';

test('DiscardModal shows the required count', () => {
  const s = createGame({ numPlayers: 4, seed: 5 });
  s.players[0]!.resources = { wood: 8, brick: 0, sheep: 0, wheat: 0, ore: 0 };
  const html = renderToString(<DiscardModal player={s.players[0]!} count={4} onConfirm={() => {}} />);
  expect(html).toContain('4');
  expect(html.toLowerCase()).toContain('discard');
});

test('RobberPrompt lists target names', () => {
  const s = createGame({ numPlayers: 4, seed: 5 });
  const html = renderToString(<RobberPrompt targets={[1, 2]} players={s.players} onPick={() => {}} />);
  expect(html).toContain(s.players[1]!.name);
  expect(html).toContain(s.players[2]!.name);
});
