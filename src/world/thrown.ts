// What is thrown to the cats from the 🐈‍⬛'s menu (in the status bar): fish (fish.ts) and balls
// of yarn (yarn.ts). Each is thrown from there in a floaty arc, landing on a floor; what it does
// once down is its own. Off the end of its floor it drops out of reach and fades away. With more
// than MAX_FISH of a kind out, the oldest fades away.
import { along, arc, Arc } from './arc';
import { EDGE, FADE_TIME, FISH_GRAVITY, MAX_FISH } from './config';
import { Floor, touches } from './layout';
import { clamp } from './math';
import type { Random } from './random';

/** The cat eating it or playing with it, as far as the thing is concerned. */
export interface AtIt {
  name: string;
  t: number; // how far into its meal, or its play
  dir: number; // which way it faces
}

export class Thrown implements Arc {
  x0: number;
  y0: number;
  vx: number;
  vy: number;
  time: number;
  gravity: number;
  t = 0; // s since it was thrown
  cat: AtIt | null = null;
  fade = 0; // s into fading away; 0 = not fading
  falling = false; // gone off the end of its floor
  fallVx = 0; // px/s sideways while falling

  constructor(
    /** Which one this is: each kind is numbered as it is thrown. */
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

/** Everything of one kind thrown to the cats, oldest first. */
export abstract class Pile<T extends Thrown> {
  private list: T[] = [];
  private thrown = 0;

  constructor(protected readonly random: Random) {}

  get items(): readonly T[] {
    return this.list;
  }

  /** A new one of the kind, on its way along `path`. */
  protected abstract make(id: number, path: Arc, x: number, y: number, floor: Floor): T;

  /** Down on its floor, each frame: what this kind does there. */
  protected abstract onFloor(g: T, dt: number, width: number): void;

  /**
   * Throws one from (x, y) onto `floor`, somewhere between lo and hi. Thrown to a cat standing
   * at `nearX`, it lands off to one side of it (the side with room), so the cat has to go and
   * get it.
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
    this.list.push(this.make(++this.thrown, arc(x, y, tx, floor.y, lift, FISH_GRAVITY), x, y, floor));
    const live = this.list.filter((g) => !g.fade);
    if (live.length > MAX_FISH) live[0].fade = 0.001;
  }

  /** Moves everything on by dt seconds, in a window `width` wide. */
  update(dt: number, width: number): void {
    for (const g of this.list) {
      const wasFlying = !g.landed;
      g.t += dt;
      if (g.fade) g.fade += dt;
      if (g.falling) {
        g.vy += FISH_GRAVITY * dt;
        g.x += g.fallVx * dt;
        g.y += g.vy * dt;
      } else if (wasFlying) {
        [g.x, g.y] = along(g, Math.min(g.t, g.time));
      } else {
        this.onFloor(g, dt, width);
      }
    }
    this.list = this.list.filter((g) => g.fade < FADE_TIME);
  }

  /** Eaten: gone. */
  remove(g: T): void {
    this.list = this.list.filter((other) => other !== g);
  }

  /** The layout changed: what lies on a floor that is gone fades away. */
  relayout(floors: readonly Floor[]): void {
    for (const g of this.list) {
      if (!g.floor) continue; // fading away already
      const was = g.floor;
      g.floor = floors.find((f) => Math.abs(f.y - was.y) <= EDGE && touches(f, g.x)) || null;
      if (!g.floor) g.fade ||= 0.001;
    }
  }

  /** Moved past the end of its floor (or out of the window): it drops out of reach, at (vx, vy), and fades. */
  protected fellOff(g: T, width: number, vx: number, vy: number): boolean {
    const floor = g.floor as Floor; // it moves along a floor
    if (g.x >= Math.max(floor.x1, 0) && g.x <= Math.min(floor.x2, width)) return false;
    g.falling = true;
    g.fallVx = vx;
    g.vy = vy;
    g.fade = 0.001;
    return true;
  }
}
