export function DiceDisplay({ dice }: { dice: [number, number] | null }) {
  if (!dice) return <div style={{ fontSize: 18 }}>🎲 —</div>;
  return <div style={{ fontSize: 18 }}>🎲 {dice[0]} + {dice[1]} = <b>{dice[0] + dice[1]}</b></div>;
}
