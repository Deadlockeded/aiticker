/**
 * The single seeded-randomness toolkit. Everything deterministic in the app
 * (daily picks, simulated prices, fight resolution, ship meter wobble) hashes
 * a string with FNV-1a and, when a stream is needed, feeds it to mulberry32.
 * One implementation — do not copy these into feature libs.
 */

/** FNV-1a 32-bit hash of a string (unsigned). */
export function fnvHash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

/** Tiny fast seeded PRNG (public domain) — returns a () => [0,1) stream. */
export function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
