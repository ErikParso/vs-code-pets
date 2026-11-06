/** v, kept between lo and hi. */
export const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
