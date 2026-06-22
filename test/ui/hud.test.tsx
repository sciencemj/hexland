import { test, expect } from 'bun:test';
import { renderToString } from 'react-dom/server';
import { PlayerPanel } from '../../src/ui/components/PlayerPanel';
import { DiceDisplay } from '../../src/ui/components/DiceDisplay';
import { GameLog } from '../../src/ui/components/GameLog';
import { createGame } from '../../src/engine/state';

test('PlayerPanel shows name, VP, and a bonus badge', () => {
  const s = createGame({ numPlayers: 4, seed: 5 });
  const html = renderToString(
    <PlayerPanel player={s.players[0]!} vp={4} isCurrent hasLongestRoad hasLargestArmy={false} reveal />
  );
  expect(html).toContain(s.players[0]!.name);
  expect(html).toContain('4');
  expect(html.toLowerCase()).toContain('road'); // longest road badge
});

test('DiceDisplay shows a dash before rolling and the sum after', () => {
  expect(renderToString(<DiceDisplay dice={null} />)).toContain('—');
  expect(renderToString(<DiceDisplay dice={[3, 4]} />)).toContain('7');
});

test('GameLog renders recent entries', () => {
  const html = renderToString(<GameLog log={[{ turn: 1, player: 0, text: 'rolled 8' }]} />);
  expect(html).toContain('rolled 8');
});
