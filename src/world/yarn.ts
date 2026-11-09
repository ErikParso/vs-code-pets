// The balls of yarn thrown to the cats (see thrown.ts). A ball lies still where it lands, and
// rolls only when a cat that played with it swipes it away, slowing to a stop; then it is up for
// play again. Rolled off the end of its floor, it drops out of reach and is gone.
import type { Arc } from './arc';
import { ROLL_FRICTION } from './config';
import type { Floor } from './layout';
import { Pile, Thrown } from './thrown';

export class Yarn extends Thrown {
  roll = 0; // px/s, signed; 0 = lying still
}

export class YarnPile extends Pile<Yarn> {
  protected make(id: number, path: Arc, x: number, y: number, floor: Floor): Yarn {
    return new Yarn(id, path, x, y, floor);
  }

  /** Swiped `dir` (-1, 1): it rolls about `distance` px before it stops. */
  roll(g: Yarn, dir: number, distance: number): void {
    g.roll = dir * Math.sqrt(2 * ROLL_FRICTION * distance);
  }

  // Rolling, slowing down until it stops.
  protected onFloor(g: Yarn, dt: number, width: number): void {
    if (!g.roll) return;
    const dir = Math.sign(g.roll);
    g.x += g.roll * dt;
    g.roll = dir * Math.max(0, Math.abs(g.roll) - ROLL_FRICTION * dt);
    if (this.fellOff(g, width, dir * Math.max(Math.abs(g.roll), 20), 0)) g.roll = 0;
  }
}
