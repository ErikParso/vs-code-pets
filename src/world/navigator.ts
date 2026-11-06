// Getting around: which floors and walls a cat can reach from where it stands, and where on a
// floor it may be. From a floor a cat jumps to any floor within MAX_JUMP. To get further up or
// down it walks to where a wall meets its floor, climbs up in leaps or slides down until it is
// level with the floor it picked, and steps onto it.
import { EDGE, MAX_JUMP, MAX_WALK_DISTANCE } from './config';
import { Floor, touches, Wall } from './layout';
import { clamp } from './math';
import type { Random } from './random';

/** The world as the navigator needs it: the layout, the window width and the cat's size, all in CSS px. */
export interface Space {
  floors: readonly Floor[];
  walls: readonly Wall[];
  width: number;
  catW: number;
  catH: number;
}

/** A jump to another floor, landing at tx. */
export interface JumpMove {
  kind: 'jump';
  tx: number;
  floor: Floor;
}

/** A walk to the wall at tx, then up or down it to `dest`. */
export interface ClimbMove {
  kind: 'climb';
  tx: number;
  wall: Wall;
  dest: Floor;
}

export type Move = JumpMove | ClimbMove;

export class Navigator {
  /** `space` is read on every question, so the navigator always sees the current layout. */
  constructor(
    private readonly random: Random,
    private readonly space: () => Space
  ) {}

  /** The horizontal range the cat's centre may use on floor f. */
  range(f: Floor): [number, number] {
    const { width, catW } = this.space();
    const lo = Math.max(f.x1, catW / 2);
    const hi = Math.min(f.x2, width - catW / 2);
    return lo <= hi ? [lo, hi] : [(lo + hi) / 2, (lo + hi) / 2];
  }

  /** Everything within reach of a cat at (x, y) standing on `floor`. */
  reachable(x: number, y: number, floor: Floor): Move[] {
    const { floors, walls, width, catW, catH } = this.space();
    const moves: Move[] = [];
    for (const f of floors) {
      const [lo, hi] = this.range(f);
      if (f === floor || hi - lo < 4 || Math.abs(f.y - y) <= EDGE) continue;
      if (Math.abs(f.y - y) > MAX_JUMP) continue;
      const tx = clamp(x + this.random.between(-80, 80), lo, hi);
      if (Math.abs(tx - x) <= MAX_JUMP) moves.push({ kind: 'jump', tx, floor: f });
    }
    // Walls along this floor, and the floors they lead to (which may start a little past their
    // ends), other than this level.
    const leadsTo = (w: Wall, g: Floor) => w.y1 - catH <= g.y && g.y <= w.y2 + catH && touches(g, w.x);
    for (const w of walls) {
      if (!leadsTo(w, floor) || w.x < catW / 2 || w.x > width - catW / 2 || Math.abs(w.x - x) > MAX_WALK_DISTANCE) continue;
      const dests = floors.filter((g) => Math.abs(g.y - y) > EDGE && leadsTo(w, g));
      if (dests.length) moves.push({ kind: 'climb', tx: clamp(w.x, ...this.range(floor)), wall: w, dest: this.random.oneOf(dests) });
    }
    return moves;
  }

  /** The floor a cat at (x, y) is standing on, if any. */
  floorAt(x: number, y: number): Floor | undefined {
    return this.space().floors.find((g) => Math.abs(g.y - y) <= EDGE && touches(g, x));
  }

  /** The nearest floor at or below (x, y), if any. */
  floorBelow(x: number, y: number): Floor | undefined {
    return this.space()
      .floors.filter((f) => f.y >= y - EDGE && touches(f, x))
      .sort((a, b) => a.y - b.y)[0];
  }

  /**
   * Where a cat comes in: along the lowest floor (the status bar), from one window edge (x,
   * just outside it), stopping within MAX_WALK_DISTANCE of it (tx).
   */
  entry(): { floor: Floor; x: number; tx: number } {
    const { floors, width, catW } = this.space();
    const floor = floors.reduce((low, g) => (g.y > low.y ? g : low));
    const [lo, hi] = this.range(floor);
    const fromLeft = this.random.chance(0.5);
    const x = fromLeft ? -(catW / 2) : width + catW / 2;
    const tx = fromLeft ? this.random.between(lo, Math.min(hi, lo + MAX_WALK_DISTANCE)) : this.random.between(Math.max(lo, hi - MAX_WALK_DISTANCE), hi);
    return { floor, x, tx };
  }

  /**
   * At the top of wall w, the jump up onto floor f: on a side of the wall where the floor
   * extends, facing `dir`, landing at tx after rising `lift`.
   */
  wallTopLanding(f: Floor, w: Wall): { dir: number; tx: number; lift: number } {
    const { catW } = this.space();
    const [lo, hi] = this.range(f);
    const sides = [-1, 1].filter((s) => (s < 0 ? lo < w.x - catW / 2 : hi > w.x + catW / 2));
    const dir = sides.length ? this.random.oneOf(sides) : (lo + hi) / 2 < w.x ? -1 : 1;
    const tx = clamp(w.x + dir * this.random.between(20, 40), lo, hi);
    return { dir, tx, lift: this.random.between(10, 20) };
  }
}
