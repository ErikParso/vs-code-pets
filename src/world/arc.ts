// Every move through the air, a cat's jump or a thrown fish, is a fixed arc under gravity.
import { GRAVITY } from './config';

export interface Arc {
  x0: number;
  y0: number;
  vx: number;
  vy: number; // at the start; negative is up
  time: number; // s, from (x0, y0) to where it lands
  gravity: number;
}

/** The arc from (x0, y0) that lands exactly on (tx, ty), rising `lift` above the higher of the two. */
export function arc(x0: number, y0: number, tx: number, ty: number, lift: number, gravity = GRAVITY): Arc {
  const apex = Math.min(y0, ty) - lift;
  const vy = -Math.sqrt(2 * gravity * (y0 - apex));
  const time = Math.max(0.05, -vy / gravity + Math.sqrt((2 * (ty - apex)) / gravity));
  return { x0, y0, vx: (tx - x0) / time, vy, time, gravity };
}

/** Where along arc `a` it is, `t` seconds in. */
export const along = (a: Arc, t: number): [number, number] => [a.x0 + a.vx * t, a.y0 + a.vy * t + (a.gravity * t * t) / 2];
