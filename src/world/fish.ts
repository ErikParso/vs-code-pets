// The fish thrown to the cats. Clicking the 🐟 in the status bar throws one from there, landing
// on a floor. Once down it flops about, now and then off the end of its floor and out of reach.
// Fish stay until eaten; with more than MAX_FISH out, the oldest fades away.
import { along, arc, Arc } from './arc';
import { EDGE, FADE_TIME, FISH_GRAVITY, MAX_FISH } from './config';
import { Floor, touches } from './layout';
import { clamp } from './math';
import type { Random } from './random';

/** The cat eating a fish, as far as the fish is concerned. */
export interface FishEater {
  name: string;
  t: number; // how far into its meal
  dir: number; // which way it faces
}

export class Fish implements Arc {
  x0: number;
  y0: number;
  vx: number;
  vy: number;
  time: number;
  gravity: number;
  t = 0; // s since it was thrown
  eater: FishEater | null = null;
  fade = 0; // s into fading away; 0 = not fading
  falling = false; // flopped off the end of its floor
  // The current flop (see FishPond.flop); flips is undefined until it first lands.
  flips?: number;
  flopFrom = 0;
  flopTime = 0;
  flopHeight = 0;
  hop = 0; // which way it flops: -1, 1, or 0 before the first flop
  hopSpeed = 0;
  nextFlop = 0;

  constructor(
    /** Which fish this is: they are numbered as they are thrown. */
    readonly id: number,
    path: Arc,
    public x: number,
    public y: number,
    public floor: Floor | null
  ) {
    this.x0 = path.x0;
    this.y0 = path.y0;
    this.vx = path.vx;
    this.vy = path.vy;
    this.time = path.time;
    this.gravity = path.gravity;
  }

  get landed(): boolean {
    return this.t >= this.time;
  }
}

export class FishPond {
  private items: Fish[] = []; // oldest first
  private thrown = 0;

  constructor(private readonly random: Random) {}

  get fish(): readonly Fish[] {
    return this.items;
  }

  /**
   * Throws a fish from (x, y) onto `floor`, somewhere between lo and hi. Thrown to a cat
   * standing at `nearX`, it lands off to one side of it (the side with room), so the cat has
   * to go and get it.
   */
  toss(x: number, y: number, floor: Floor, lo: number, hi: number, nearX?: number): void {
    let tx = this.random.between(lo, hi);
    if (nearX !== undefined) {
      const d = this.random.between(100, 350);
      let side = this.random.chance(0.5) ? -1 : 1;
      if (nearX + side * d < lo || nearX + side * d > hi) side = -side;
      tx = clamp(nearX + side * d, lo, hi);
    }
    // A floaty toss, higher the further it goes (but staying in the window).
    const lift = Math.max(0, Math.min(50 + 0.2 * Math.abs(tx - x), Math.min(y, floor.y) - 10));
    this.items.push(new Fish(++this.thrown, arc(x, y, tx, floor.y, lift, FISH_GRAVITY), x, y, floor));
    const live = this.items.filter((g) => !g.fade);
    if (live.length > MAX_FISH) live[0].fade = 0.001;
  }

  /** Moves every fish on by dt seconds, in a window `width` wide. */
  update(dt: number, width: number): void {
    for (const g of this.items) {
      const wasFlying = !g.landed;
      g.t += dt;
      if (g.fade) g.fade += dt;
      if (g.falling) {
        g.vy += FISH_GRAVITY * dt;
        g.x += g.hop * g.hopSpeed * dt;
        g.y += g.vy * dt;
      } else if (wasFlying) {
        [g.x, g.y] = along(g, Math.min(g.t, g.time));
      } else if (!g.eater && !g.fade) {
        this.flop(g, dt, width);
      }
    }
    this.items = this.items.filter((g) => g.fade < FADE_TIME);
  }

  /** Eaten: gone. */
  remove(g: Fish): void {
    this.items = this.items.filter((other) => other !== g);
  }

  /** The layout changed: fish on a floor that is gone fade away. */
  relayout(floors: readonly Floor[]): void {
    for (const g of this.items) {
      if (!g.floor) continue; // fading away already
      const was = g.floor;
      g.floor = floors.find((f) => Math.abs(f.y - was.y) <= EDGE && touches(f, g.x)) || null;
      if (!g.floor) g.fade ||= 0.001;
    }
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
    const floor = g.floor as Floor; // flopping happens on a floor
    if (g.x < Math.max(floor.x1, 0) || g.x > Math.min(floor.x2, width)) {
      g.falling = true;
      g.vy = -120;
      g.fade = 0.001;
    }
  }
}
