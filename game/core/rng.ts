/**
 * Small deterministic RNG (mulberry32). The state lives inside the game state
 * so that saving, loading and tests reproduce exactly the same results.
 */
export interface RngState {
  seed: number;
}

export function nextFloat(r: RngState): number {
  r.seed = (r.seed + 0x6d2b79f5) | 0;
  let t = r.seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Integer in [min, max] (inclusive). */
export function randInt(r: RngState, min: number, max: number): number {
  return min + Math.floor(nextFloat(r) * (max - min + 1));
}

export function chance(r: RngState, p: number): boolean {
  return nextFloat(r) < p;
}

export function pick<T>(r: RngState, list: readonly T[]): T {
  return list[Math.floor(nextFloat(r) * list.length)];
}

export function shuffle<T>(r: RngState, list: T[]): T[] {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(nextFloat(r) * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}
