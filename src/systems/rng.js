// Seeded RNG (mulberry32) + Helfer. Jeder Run ist ueber seinen Seed reproduzierbar.

export function hashString(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

export function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class RNG {
  constructor(seed) {
    this.seed = typeof seed === 'number' ? seed >>> 0 : hashString(String(seed));
    this.state = this.seed; // speicherbar (Spielstand)
  }
  // mulberry32 mit sichtbarem Zustand
  next() {
    let a = this.state | 0;
    a = (a + 0x6d2b79f5) | 0;
    this.state = a;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  float(min = 0, max = 1) { return min + this.next() * (max - min); }
  int(min, max) { return Math.floor(this.float(min, max + 1)); } // inklusive max
  chance(p) { return this.next() < p; }
  pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
  shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  weighted(items, weightFn) {
    const ws = items.map(weightFn);
    const total = ws.reduce((s, w) => s + Math.max(0, w), 0);
    if (total <= 0) return items[0];
    let r = this.next() * total;
    for (let i = 0; i < items.length; i++) {
      r -= Math.max(0, ws[i]);
      if (r <= 0) return items[i];
    }
    return items[items.length - 1];
  }
  // Normalverteilung (Box-Muller)
  gauss(mean = 0, sd = 1) {
    const u = Math.max(1e-9, this.next()), v = this.next();
    return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  // Abgeleiteter Sub-Stream, damit z.B. Sprites stabil bleiben, egal wie viel RNG vorher verbraucht wurde
  fork(label) { return new RNG(hashString(this.seed + ':' + label)); }
}

const SEED_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function randomSeedString() {
  let s = '';
  const buf = new Uint32Array(6);
  try { crypto.getRandomValues(buf); } catch { for (let i = 0; i < 6; i++) buf[i] = Math.random() * 1e9; }
  for (let i = 0; i < 6; i++) s += SEED_CHARS[buf[i] % SEED_CHARS.length];
  return s;
}

export function dailySeedString(date = new Date()) {
  const d = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  return 'D' + d;
}

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
