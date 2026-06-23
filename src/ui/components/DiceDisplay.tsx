import { useEffect, useState } from 'react';

const PIPS: Record<number, [number, number][]> = {
  1: [[13, 13]],
  2: [[7, 7], [19, 19]],
  3: [[7, 7], [13, 13], [19, 19]],
  4: [[7, 7], [19, 7], [7, 19], [19, 19]],
  5: [[7, 7], [19, 7], [13, 13], [7, 19], [19, 19]],
  6: [[7, 7], [19, 7], [7, 13], [19, 13], [7, 19], [19, 19]],
};

function Die({ value, rolling }: { value: number; rolling: boolean }) {
  return (
    <svg width={26} height={26} className={rolling ? 'fx-dice-rolling' : undefined}
      style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.5))' }}>
      <rect x={0.5} y={0.5} width={25} height={25} rx={5} fill="#f6f1e6" stroke="#cbb994" />
      {(PIPS[value] ?? []).map(([x, y], i) => <circle key={i} cx={x} cy={y} r={2.4} fill="#2a2a2a" />)}
    </svg>
  );
}

const rand6 = () => 1 + Math.floor(Math.random() * 6);

export function DiceDisplay({ dice, rollKey = 0 }: { dice: [number, number] | null; rollKey?: number }) {
  const [shown, setShown] = useState<[number, number] | null>(dice);
  const [rolling, setRolling] = useState(false);

  // tumble whenever a new roll happens, then settle on the real values
  useEffect(() => {
    if (rollKey === 0 || !dice) { setShown(dice); return; }
    setRolling(true);
    const iv = setInterval(() => setShown([rand6(), rand6()]), 80);
    const to = setTimeout(() => { clearInterval(iv); setRolling(false); setShown(dice); }, 700);
    return () => { clearInterval(iv); clearTimeout(to); };
  }, [rollKey]); // eslint-disable-line

  useEffect(() => { if (!rolling) setShown(dice); }, [dice, rolling]);

  if (!shown) return <div style={{ fontSize: 18, display: 'flex', alignItems: 'center', gap: 8, minHeight: 28 }}>🎲 —</div>;
  return (
    <div style={{ fontSize: 18, display: 'flex', alignItems: 'center', gap: 8, minHeight: 28 }}>
      <Die value={shown[0]} rolling={rolling} />
      <Die value={shown[1]} rolling={rolling} />
      <span>= <b>{shown[0] + shown[1]}</b></span>
    </div>
  );
}
