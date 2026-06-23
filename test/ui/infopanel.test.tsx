// test/ui/infopanel.test.tsx
import { test, expect } from 'bun:test';
import { renderToString } from 'react-dom/server';
import { InfoPanel } from '../../src/ui/components/InfoPanel';
import { createGame } from '../../src/engine/state';

test('InfoPanel renders victory conditions, tips, and public opponent info', () => {
  const s = createGame({ numPlayers: 4, seed: 5 });
  const html = renderToString(<InfoPanel state={s} human={0} />);
  expect(html).toContain('10'); // 10 VP
  expect(html.toLowerCase()).toContain('victory');
  expect(html).toContain(s.players[1]!.name); // opponent listed
  expect(html.toLowerCase()).toContain('hidden'); // hidden-hands note
});

test('InfoPanel never prints an opponent\'s exact resource breakdown', () => {
  const s = createGame({ numPlayers: 4, seed: 5 });
  s.players[1]!.resources = { wood: 3, brick: 0, sheep: 0, wheat: 0, ore: 0 };
  const html = renderToString(<InfoPanel state={s} human={0} />);
  // opponent's card COUNT may appear, but not a "wood: 3" style exact hand line
  expect(html).not.toMatch(/wood:\s*3/i);
});
