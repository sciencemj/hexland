// test/ui/board.test.tsx
import { test, expect } from 'bun:test';
import { renderToString } from 'react-dom/server';
import { Board } from '../../src/ui/components/Board';
import { createGame } from '../../src/engine/state';

test('Board renders 19 terrain hexes and a robber', () => {
  const s = createGame({ numPlayers: 4, seed: 5 });
  const html = renderToString(<Board state={s} />);
  expect((html.match(/<polygon/g) ?? []).length).toBeGreaterThanOrEqual(19);
  expect(html).toContain('data-robber'); // robber marker present
});

test('Board renders highlight targets when provided', () => {
  const s = createGame({ numPlayers: 4, seed: 5 });
  const html = renderToString(<Board state={s} highlightNodes={[0, 1, 2]} />);
  expect((html.match(/data-node-hl/g) ?? []).length).toBe(3);
});

test('a highlighted node that already has a building (city upgrade) is still clickable', () => {
  const s: any = createGame({ numPlayers: 4, seed: 5 });
  s.board.nodes[0].building = { type: 'settlement', owner: 0 };
  const html = renderToString(<Board state={s} highlightNodes={[0]} />);
  // the settlement still renders, AND a clickable highlight ring sits over it
  expect((html.match(/data-node-hl/g) ?? []).length).toBe(1);
});
