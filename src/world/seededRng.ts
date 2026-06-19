export interface SeededRng {
  next(): number;
  int(min: number, max: number): number;
  float(min: number, max: number): number;
  chance(probability: number): boolean;
  pick<T>(values: readonly T[]): T;
  shuffle<T>(values: readonly T[]): T[];
  fork(label: string): SeededRng;
}

export function createSeededRng(seed: string): SeededRng {
  let state = hashString(seed) >>> 0;
  const next = () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int(min: number, max: number) {
      return Math.floor(next() * (max - min + 1)) + min;
    },
    float(min: number, max: number) {
      return min + next() * (max - min);
    },
    chance(probability: number) {
      return next() < probability;
    },
    pick<T>(values: readonly T[]) {
      if (!values.length) throw new Error("Cannot pick from an empty seeded list.");
      return values[Math.floor(next() * values.length) % values.length];
    },
    shuffle<T>(values: readonly T[]) {
      const result = [...values];
      for (let i = result.length - 1; i > 0; i -= 1) {
        const j = Math.floor(next() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
      }
      return result;
    },
    fork(label: string) {
      return createSeededRng(`${seed}:${label}:${Math.floor(next() * 0xffffffff).toString(36)}`);
    }
  };
}

export function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function hashNoise(seed: string, x: number, y: number, z = 0): number {
  let h = hashString(seed);
  h ^= Math.imul(x + 0x9e3779b9, 0x85ebca6b);
  h ^= Math.imul(y + 0xc2b2ae35, 0x27d4eb2f);
  h ^= Math.imul(z + 0x165667b1, 0x9e3779b1);
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  return (h >>> 0) / 0xffffffff;
}

export function fbm(seed: string, x: number, y: number, octaves = 3, lacunarity = 2.05): number {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let total = 0;
  for (let octave = 0; octave < octaves; octave += 1) {
    value += valueNoise(seed, x * frequency, y * frequency, octave) * amplitude;
    total += amplitude;
    amplitude *= 0.52;
    frequency *= lacunarity;
  }
  return value / total;
}

function valueNoise(seed: string, x: number, y: number, octave: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = x0 + 1;
  const y1 = y0 + 1;
  const tx = smoothstep(x - x0);
  const ty = smoothstep(y - y0);
  const a = hashNoise(seed, x0, y0, octave);
  const b = hashNoise(seed, x1, y0, octave);
  const c = hashNoise(seed, x0, y1, octave);
  const d = hashNoise(seed, x1, y1, octave);
  return lerp(lerp(a, b, tx), lerp(c, d, tx), ty);
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
