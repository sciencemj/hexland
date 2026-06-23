// src/ui/sound.ts
// Synthesized sound effects via the Web Audio API — no audio asset files, no
// dependency. A single lazily-created AudioContext (resumed on first use after
// a user gesture). Muting persists to localStorage.
let ctx: AudioContext | null = null;
function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

let muted = (() => { try { return localStorage.getItem('catan.muted') === '1'; } catch { return false; } })();
export const isMuted = () => muted;
export function setMuted(m: boolean) { muted = m; try { localStorage.setItem('catan.muted', m ? '1' : '0'); } catch { /* ignore */ } }

function env(c: AudioContext, node: GainNode, t: number, attack: number, dur: number, peak: number) {
  node.gain.setValueAtTime(0.0001, t);
  node.gain.exponentialRampToValueAtTime(peak, t + attack);
  node.gain.exponentialRampToValueAtTime(0.0001, t + dur);
}

function tone(c: AudioContext, t: number, freq: number, dur: number, type: OscillatorType, peak: number, slideTo?: number) {
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slideTo !== undefined) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  env(c, g, t, 0.005, dur, peak);
  o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
}

function noiseBurst(c: AudioContext, t: number, dur: number, freq: number, peak: number) {
  const n = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, n, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = c.createBufferSource(); src.buffer = buf;
  const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = 1.2;
  const g = c.createGain(); env(c, g, t, 0.004, dur, peak);
  src.connect(bp).connect(g).connect(c.destination); src.start(t); src.stop(t + dur + 0.02);
}

export function playSfx(name: string) {
  if (muted) return;
  const c = ac(); if (!c) return;
  const t = c.currentTime + 0.001;
  switch (name) {
    case 'dice': // a short clatter of two-three impacts
      noiseBurst(c, t, 0.06, 2600, 0.25);
      noiseBurst(c, t + 0.08, 0.05, 2000, 0.2);
      noiseBurst(c, t + 0.15, 0.05, 1700, 0.16);
      break;
    case 'road':
      tone(c, t, 240, 0.12, 'sine', 0.3, 120);
      noiseBurst(c, t, 0.04, 1400, 0.12);
      break;
    case 'build': // settlement
      tone(c, t, 180, 0.16, 'sine', 0.32, 90);
      tone(c, t + 0.04, 540, 0.12, 'triangle', 0.14);
      break;
    case 'city': // chunkier + a small chime
      tone(c, t, 130, 0.22, 'sine', 0.34, 70);
      tone(c, t + 0.05, 523, 0.18, 'triangle', 0.13);
      tone(c, t + 0.11, 784, 0.16, 'triangle', 0.11);
      break;
    case 'resource':
      tone(c, t, 880, 0.16, 'sine', 0.22);
      tone(c, t + 0.05, 1320, 0.14, 'sine', 0.14);
      break;
    case 'devcard':
      tone(c, t, 660, 0.12, 'triangle', 0.2);
      tone(c, t + 0.09, 990, 0.14, 'triangle', 0.16);
      break;
    case 'robber':
      tone(c, t, 320, 0.3, 'sawtooth', 0.18, 80);
      noiseBurst(c, t, 0.12, 600, 0.12);
      break;
  }
}
