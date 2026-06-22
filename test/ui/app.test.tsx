// test/ui/app.test.tsx
import { test, expect } from 'bun:test';
import { renderToString } from 'react-dom/server';
import { App } from '../../src/ui/App';
import { NewGameDialog } from '../../src/ui/components/NewGameDialog';

test('App shows the new-game start screen first', () => {
  const html = renderToString(<App />);
  expect(html.toLowerCase()).toContain('new game');
});

test('NewGameDialog offers AI opponent counts', () => {
  const html = renderToString(<NewGameDialog onStart={() => {}} />);
  expect(html).toContain('1'); expect(html).toContain('2'); expect(html).toContain('3');
});
