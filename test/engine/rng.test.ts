import { test, expect } from 'bun:test';
import { makeRng, nextFloat, randInt, shuffle } from '../../src/engine/rng';

test('same seed gives same sequence', () => {
  const a = nextFloat(makeRng(42));
  const b = nextFloat(makeRng(42));
  expect(a.value).toBe(b.value);
  expect(a.value).toBeGreaterThanOrEqual(0);
  expect(a.value).toBeLessThan(1);
});

test('rng is pure — advancing returns new state, input unchanged', () => {
  const r0 = makeRng(7);
  const r1 = nextFloat(r0).rng;
  expect(r1.state).not.toBe(r0.state);
});

test('randInt stays in range', () => {
  let rng = makeRng(1);
  for (let i = 0; i < 100; i++) {
    const r = randInt(rng, 6); rng = r.rng;
    expect(r.value).toBeGreaterThanOrEqual(0);
    expect(r.value).toBeLessThan(6);
  }
});

test('shuffle is a permutation and does not mutate input', () => {
  const input = [1, 2, 3, 4, 5];
  const out = shuffle(makeRng(3), input).value;
  expect(out.slice().sort()).toEqual([1, 2, 3, 4, 5]);
  expect(input).toEqual([1, 2, 3, 4, 5]);
});

test('shuffle is deterministic for a seed', () => {
  expect(shuffle(makeRng(9), [1,2,3,4,5]).value)
    .toEqual(shuffle(makeRng(9), [1,2,3,4,5]).value);
});
