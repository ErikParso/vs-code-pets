// The fish thrown to the cats (see thrown.ts). Once down it flops about, now and then off the
// end of its floor and out of reach. Fish stay until eaten.
import type { Arc } from './arc';
import type { Floor } from './layout';
import { Pile, Thrown } from './thrown';

export class Fish extends Thrown {
  // The current flop (see FishPond.flop); flips is undefined until it first lands.
  flips?: number;
  flopFrom = 0;
  flopTime = 0;
  flopHeight = 0;
  hop = 0; // which way it flops: -1, 1, or 0 before the first flop
  hopSpeed = 0;
  nextFlop = 0;
}

export class FishPond extends Pile<Fish> {
  protected make(id: number, path: Arc, x: number, y: number, floor: Floor): Fish {
    return new Fish(id, path, x, y, floor);
  }

  // Being eaten, or fading away, it lies still.
  protected onFloor(g: Fish, dt: number, width: number): void {
    if (!g.cat && !g.fade) this.flop(g, dt, width);
  }

  // Flops come at random: a hop as it lands, then every so often another, each its own height,
  // length and quickness. Each carries it a little way, mostly the same way as the last, and
  // lands it the other way round. Flopped off the end of its floor, it drops out of reach and
  // is gone.
  private flop(g: Fish, dt: number, width: number): void {
    if (g.flips === undefined || g.t >= g.nextFlop) {
      g.flips = g.flips === undefined ? 0 : g.flips + 1;
      g.flopFrom = g.t;
      g.flopTime = this.random.between(0.25, 0.45);
      g.flopHeight = this.random.between(3, 10);
      g.hop = g.hop && this.random.chance(0.7) ? g.hop : this.random.oneOf([-1, 1]);
      g.hopSpeed = this.random.between(8, 30); // px a second while in the air
      g.nextFlop = g.t + g.flopTime + this.random.between(1, 5);
    }
    if (g.t >= g.flopFrom + g.flopTime) return;
    g.x += g.hop * g.hopSpeed * dt;
    this.fellOff(g, width, g.hop * g.hopSpeed, -120);
  }
}
