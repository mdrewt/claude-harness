// Deterministic simulation — NO rendering imports here. Fixed timestep, seedable RNG.
// See standards/domain/game.md.
export interface State {
  tick: number;
  x: number;
  seed: number;
}

// Mulberry32: tiny deterministic PRNG.
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function init(seed: number): State {
  return { tick: 0, x: 0, seed };
}

/** Advance one fixed step. Pure: same input -> same output. */
export function step(s: State): State {
  const r = rng(s.seed + s.tick)();
  return { tick: s.tick + 1, x: s.x + (r < 0.5 ? -1 : 1), seed: s.seed };
}

export function run(seed: number, ticks: number): State {
  let s = init(seed);
  for (let i = 0; i < ticks; i++) s = step(s);
  return s;
}
