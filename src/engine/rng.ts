export type Rng = { seed: number; state: number };

export function makeRng(seed: number): Rng {
  return { seed, state: seed >>> 0 };
}

// mulberry32
export function nextFloat(rng: Rng): { value: number; rng: Rng } {
  let t = (rng.state + 0x6d2b79f5) >>> 0;
  let x = t;
  x = Math.imul(x ^ (x >>> 15), x | 1);
  x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
  const value = ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  return { value, rng: { seed: rng.seed, state: t } };
}

export function randInt(rng: Rng, maxExclusive: number): { value: number; rng: Rng } {
  const f = nextFloat(rng);
  return { value: Math.floor(f.value * maxExclusive), rng: f.rng };
}

export function shuffle<T>(rng: Rng, arr: T[]): { value: T[]; rng: Rng } {
  const out = arr.slice();
  let cur = rng;
  for (let i = out.length - 1; i > 0; i--) {
    const r = randInt(cur, i + 1); cur = r.rng;
    const j = r.value;
    const tmp = out[i]!; out[i] = out[j]!; out[j] = tmp;
  }
  return { value: out, rng: cur };
}
