// A cat: where it is, which way it faces, and what it is doing. What it is doing is one
// Activity, and each kind of activity carries only what it needs: a walk its target, a jump
// its flight, a climb its wall. The Cat changes activity; deciding what comes next is the
// world's (see world.ts).
import type { Arc } from './arc';
import type { Fish } from './fish';
import type { Care } from './care';
import type { Floor, Wall } from './layout';
import type { ClimbMove } from './navigator';
import type { AtIt, Thrown } from './thrown';
import type { Yarn } from './yarn';

/**
 * A cat in your collection (see collection.ts): the first ones are FIRST_CATS there,
 * friends are made up when they come. Energy (1 = an everyday cat): the more it has, the more it
 * walks, trots and jumps, and the less often and less long it naps.
 */
export interface CatDef {
  id: string; // unique, never reused; its care is kept under it
  name: string;
  coat: string; // a coat's id (coats.ts)
  energy: number;
  step: Step; // its next step, the one its box's button offers (collection.ts): a new cat's is its collar
}

/** A cat's steps in the collection, in order: claim its collar, bring a friend, say goodbye. */
export type Step = 'collar' | 'friend' | 'depart';

/** A move through the air, landing on floor `onto`. */
export interface Flight extends Arc {
  onto: Floor;
}

/** Up or down a wall, from floor `origin` to floor `dest`. */
interface OnWall {
  wall: Wall;
  dest: Floor;
  origin: Floor;
}

// `t` is the seconds since it started; `dur`, where there is one, how long it lasts.
export type Activity =
  | { kind: 'sit'; t: number; dur: number }
  | { kind: 'sleep'; t: number; dur: number }
  | { kind: 'eat'; t: number; dur: number; meal: Fish }
  | { kind: 'stalk'; t: number; dur: number; ball: Yarn } // crouched at a ball of yarn before batting it
  | { kind: 'play'; t: number; dur: number; ball: Yarn } // batting at a ball of yarn
  | { kind: 'walk'; t: number; tx: number; speed: number }
  // Gathering itself before a jump (`flight` is the jump) or after landing (no flight).
  | { kind: 'crouch'; t: number; dur: number; flight: Flight | null }
  | { kind: 'air'; t: number; flight: Flight }
  // One leap up a wall, from hopFrom to hopTo, then holding on until `dur`.
  | ({ kind: 'wallhop'; t: number; dur: number; hopFrom: number; hopTo: number } & OnWall)
  // Sliding down a wall, at speed vy.
  | ({ kind: 'slide'; t: number; vy: number } & OnWall);

export type WallActivity = Extract<Activity, { kind: 'wallhop' | 'slide' }>;

/**
 * What a cat is walking over for: out of the window, to curl up next to a sleeping cat, to a
 * wall to climb it, to a fish to eat it, or to a ball of yarn to play with it. Arrived, it does
 * that (see CatBrain.decide); the heading is gone once it gets there.
 */
export type Heading =
  | { to: 'leave' }
  | { to: 'friend' }
  | { to: 'wall'; move: ClimbMove }
  | { to: 'fish'; item: Fish }
  | { to: 'ball'; item: Yarn };

export class Cat implements AtIt {
  x = 0;
  y = 0;
  dir = 1; // 1 facing right, -1 left
  floor: Floor | null = null; // null in the air or on a wall
  activity: Activity = { kind: 'walk', t: 0, tx: 0, speed: 0 };
  heading: Heading | null = null; // what it is walking over for, if anything
  packed = false; // shut in its box: not out, though this window still has it

  constructor(
    /** Kept up to date with the collection (World.sync): its collar may be claimed while it is out. */
    public def: CatDef,
    readonly care: Care,
    /** Called when it walks out of the window, so another window can have it. */
    readonly done: () => void,
    /** Which time this cat has come into the window: each visit is a new Cat. */
    readonly visit: number
  ) {}

  get id(): string {
    return this.def.id;
  }

  get name(): string {
    return this.def.name;
  }

  /** On its way out of the window. */
  get leaving(): boolean {
    return this.heading?.to === 'leave';
  }

  /** The fish or ball it is going for, if that is what it is walking over for. */
  get goingFor(): Thrown | null {
    const h = this.heading;
    return h && 'item' in h ? h.item : null;
  }

  get coat(): string {
    return this.def.coat;
  }

  get energy(): number {
    return this.def.energy;
  }

  /** Seconds into its current activity. */
  get t(): number {
    return this.activity.t;
  }

  /** On a wall: what it is holding on to. */
  get onWall(): WallActivity | null {
    const a = this.activity;
    return a.kind === 'wallhop' || a.kind === 'slide' ? a : null;
  }

  sit(dur: number): void {
    this.activity = { kind: 'sit', t: 0, dur };
  }

  sleep(dur: number): void {
    this.activity = { kind: 'sleep', t: 0, dur };
  }

  eat(meal: Fish, dur: number): void {
    this.activity = { kind: 'eat', t: 0, dur, meal };
  }

  stalk(ball: Yarn, dur: number): void {
    this.activity = { kind: 'stalk', t: 0, dur, ball };
  }

  play(ball: Yarn, dur: number): void {
    this.activity = { kind: 'play', t: 0, dur, ball };
  }

  walkTo(tx: number, speed: number): void {
    this.dir = tx >= this.x ? 1 : -1;
    this.activity = { kind: 'walk', t: 0, tx, speed };
  }

  /** Gathers itself: before `flight` (then off its floor), or after landing (flight null). */
  crouch(dur: number, flight: Flight | null): void {
    if (flight) this.floor = null;
    this.activity = { kind: 'crouch', t: 0, dur, flight };
  }

  fly(flight: Flight): void {
    this.floor = null;
    this.activity = { kind: 'air', t: 0, flight };
  }

  /** Lands on floor f, and crouches. */
  land(f: Floor, crouchFor: number): void {
    this.y = f.y;
    this.floor = f;
    this.crouch(crouchFor, null);
  }

  /** One leap `rise` px up the wall, then holding on until `dur`. */
  wallhop(on: OnWall, rise: number, dur: number): void {
    this.activity = { kind: 'wallhop', t: 0, dur, hopFrom: this.y, hopTo: this.y - rise, ...on };
  }

  slide(on: OnWall): void {
    this.activity = { kind: 'slide', t: 0, vy: 0, ...on };
  }
}
