// The cats' world, without the DOM: the cats in this window, the fish and yarn thrown to them, the floors
// and walls they get around on, and what they show (Zs, hearts, fish requests). Each frame it
// moves everything on (step); the browser side reads it to draw (see app.ts).
import { along, arc } from './arc';
import { CatBrain } from './brain';
import { Cat, CatDef, Flight } from './cat';
import type { Clock } from './clock';
import { EAT_TIME, HOP_TIME, PLAY_TIME, ROLL_DISTANCE, WALK_SPEED, WALL_LEAP, WIND_UP } from './config';
import { Fish, FishPond } from './fish';
import type { Pile, Thrown } from './thrown';
import { type Yarn, YarnPile } from './yarn';
import { CareStore, Care } from './care';
import type { Floor, Layout, Wall } from './layout';
import { clamp } from './math';
import { ClimbMove, JumpMove, Move, Navigator } from './navigator';
import type { Random } from './random';
import { SP } from './sprites';

export type EmotionKind = 'z' | 'heart' | 'fish';

/** A Z, heart or fish floating up from a cat for a moment. */
export interface Emotion {
  kind: EmotionKind;
  x: number;
  y: number;
  t: number;
  dir: number;
}

export const EMOTION_TIME = 2.4; // s an emotion floats before it is gone

interface OnWall {
  wall: Wall;
  dest: Floor;
  origin: Floor;
}

/** A read-only snapshot of a cat (see World.view). */
export interface CatView {
  visit: number;
  name: string;
  energy: number;
  state: Cat['activity']['kind'];
  t: number;
  dur: number; // Infinity for an activity without an end time
  x: number;
  y: number;
  tx?: number; // walking: where to
  speed?: number;
  floor: Floor | null;
  leaving: boolean;
  toFriend: boolean;
  toWall: boolean;
  toFish: boolean;
  toYarn: boolean;
  trust: number;
  fedAt: number;
}

/** A read-only snapshot of something thrown to the cats. */
export interface ThrownView {
  id: number;
  x: number;
  y: number;
  floor: Floor | null;
  landed: boolean;
  fading: boolean;
  falling: boolean;
}

export interface FishView extends ThrownView {
  eater: string | null; // the name of the cat eating it
}

export interface YarnView extends ThrownView {
  player: string | null; // the name of the cat playing with it
  rolling: boolean;
}

/** A read-only snapshot of the world, for anything outside it that wants to look (the tests). */
export interface WorldView {
  now: number;
  width: number;
  floors: Floor[];
  walls: Wall[];
  cats: CatView[];
  fishes: FishView[];
  yarns: YarnView[];
}

export interface WorldDeps {
  random: Random;
  clock: Clock;
  careStore: CareStore;
}

export class World {
  readonly random: Random;
  readonly clock: Clock;
  readonly careStore: CareStore;
  readonly fish: FishPond;
  readonly yarn: YarnPile;
  readonly nav: Navigator;
  private readonly brain: CatBrain;
  private catList: Cat[] = [];
  private emotionList: Emotion[] = [];
  private emotionTime = 0;
  private visits = 0;
  private layoutKey = '';
  floors: Floor[] = [];
  walls: Wall[] = [];
  width = 0; // the window's, CSS px
  px = 2; // device pixels per sprite pixel
  dpr = 1; // device pixels per CSS pixel

  constructor({ random, clock, careStore }: WorldDeps) {
    this.random = random;
    this.clock = clock;
    this.careStore = careStore;
    this.fish = new FishPond(random);
    this.yarn = new YarnPile(random);
    this.nav = new Navigator(random, () => ({ floors: this.floors, walls: this.walls, width: this.width, catW: this.catW, catH: this.catH }));
    this.brain = new CatBrain(this);
  }

  /** The cats out in this window (not packed in their boxes). */
  get cats(): readonly Cat[] {
    return this.catList.filter((c) => !c.packed);
  }

  get emotions(): readonly Emotion[] {
    return this.emotionList;
  }

  /** The cat's size on screen, CSS px. */
  get catW(): number {
    return (SP.width * this.px) / this.dpr;
  }

  get catH(): number {
    return (SP.height * this.px) / this.dpr;
  }

  /** The window is `width` CSS px wide, drawn `px` device pixels per sprite pixel at `dpr` device pixels per CSS pixel. */
  resize(width: number, px: number, dpr: number): void {
    this.width = width;
    this.px = px;
    this.dpr = dpr;
    this.layoutKey = ''; // the next layout is news, whatever it is
  }

  // After the layout changed, a cat still standing on a floor stays put; every other cat (on a
  // wall, in the air, or whose floor is gone) drops onto the floor below it.
  setLayout(next: Layout): void {
    const key = JSON.stringify(next);
    if (key === this.layoutKey) return;
    this.layoutKey = key;
    this.floors = next.floors;
    this.walls = next.walls;
    for (const cat of this.cats) {
      if (cat.leaving) continue; // on its way out of the window anyway
      const f = cat.floor && this.nav.floorAt(cat.x, cat.y);
      if (cat.heading?.to === 'wall') cat.heading = null; // the wall may have moved
      if (f) {
        cat.floor = f;
        const a = cat.activity;
        if (a.kind === 'walk') a.tx = clamp(a.tx, ...this.nav.range(f));
        continue;
      }
      const hold = cat.onWall;
      if (hold) cat.x = clamp(hold.wall.x, this.catW / 2, this.width - this.catW / 2);
      this.interrupt(cat);
      this.fall(cat);
    }
    this.fish.relayout(this.floors);
    this.yarn.relayout(this.floors);
  }

  // A cat comes out: it walks in along the bottom. `done` lets it go to another window.
  spawn(def: CatDef, done: () => void): void {
    const saved = this.careStore.load()[def.name];
    const cat = new Cat(def, Care.restore(this.clock, saved), done, ++this.visits);
    cat.packed = !!saved?.packed;
    this.catList.push(cat);
    this.walkIn(cat);
  }

  /**
   * Cats packed in their boxes (from any window) go in at once; cats let out walk in again. A
   * packed cat stays this window's (it is not done), so no other window gets it.
   */
  checkPacked(): void {
    const care = this.careStore.load();
    for (const cat of this.catList) {
      const packed = !!care[cat.name]?.packed;
      if (packed && !cat.packed) this.interrupt(cat);
      if (!packed && cat.packed) this.walkIn(cat);
      cat.packed = packed;
    }
  }

  /** Moves everything on by dt seconds. */
  step(dt: number): void {
    for (const cat of this.cats) this.update(cat, dt);
    this.fish.update(dt, this.width);
    this.yarn.update(dt, this.width);
    this.spawnEmotions(dt);
  }

  /** Emotions float up and fade, whether the cats are shown or not. */
  ageEmotions(dt: number): void {
    for (const z of this.emotionList) {
      z.t += dt;
      z.y -= 12 * dt;
    }
    this.emotionList = this.emotionList.filter((z) => z.t < EMOTION_TIME);
  }

  // The 🐈‍⬛ was clicked at (x, y): a fish for one of the cats on a floor, or anywhere if none is.
  throwFish(x: number, y: number): void {
    this.throwTo(this.fish, x, y);
  }

  // The yarn in the 🐈‍⬛'s menu was clicked at (x, y): a ball of yarn, thrown just like a fish.
  throwYarn(x: number, y: number): void {
    this.throwTo(this.yarn, x, y);
  }

  private throwTo<T extends Thrown>(pile: Pile<T>, x: number, y: number): void {
    const near = this.random.oneOf(this.cats.filter((c) => c.floor));
    const f = near ? (near.floor as Floor) : this.random.oneOf(this.floors);
    const [lo, hi] = this.nav.range(f);
    pile.toss(x, y, f, lo, hi, near ? near.x : undefined);
  }

  // Every cat in this window, saved along with the ones that are elsewhere.
  save(): void {
    const all = this.careStore.load();
    for (const c of this.catList) all[c.name] = { ...all[c.name], ...c.care.saved() }; // keeps `packed`
    this.careStore.save(all);
  }

  view(): WorldView {
    const floorOf = (f: Floor | null) => f && { x1: f.x1, x2: f.x2, y: f.y };
    const thrown = (g: Thrown): ThrownView => ({ id: g.id, x: g.x, y: g.y, floor: floorOf(g.floor), landed: g.landed, fading: !!g.fade, falling: g.falling });
    return {
      now: this.clock.now(),
      width: this.width,
      floors: this.floors.map((f) => ({ ...f })),
      walls: this.walls.map((w) => ({ ...w })),
      cats: this.cats.map((c) => {
        const a = c.activity;
        return {
          visit: c.visit,
          name: c.name,
          energy: c.energy,
          state: a.kind,
          t: a.t,
          dur: 'dur' in a ? a.dur : Infinity,
          x: c.x,
          y: c.y,
          tx: a.kind === 'walk' ? a.tx : undefined,
          speed: a.kind === 'walk' ? a.speed : undefined,
          floor: floorOf(c.floor),
          leaving: c.leaving,
          toFriend: c.heading?.to === 'friend',
          toWall: c.heading?.to === 'wall',
          toFish: c.heading?.to === 'fish',
          toYarn: c.heading?.to === 'ball',
          trust: c.care.trust,
          fedAt: c.care.fedAt,
        };
      }),
      fishes: this.fish.items.map((g) => ({ ...thrown(g), eater: g.cat ? g.cat.name : null })),
      yarns: this.yarn.items.map((g) => ({ ...thrown(g), player: g.cat ? g.cat.name : null, rolling: !!g.roll })),
    };
  }

  // ---- carrying out moves ----

  // The cat arrives by walking in along the lowest floor (the status bar), from a window edge,
  // and stops within MAX_WALK_DISTANCE of it.
  private walkIn(cat: Cat): void {
    const { floor, x, tx } = this.nav.entry();
    cat.floor = floor;
    cat.y = floor.y;
    cat.x = x;
    cat.heading = null; // (packed on its way out, it is let out to stay)
    cat.walkTo(tx, WALK_SPEED);
  }

  // Every move through the air is an arc from where the cat is, landing on floor `onto`.
  private flightTo(cat: Cat, tx: number, ty: number, lift: number, onto: Floor): Flight {
    return { ...arc(cat.x, cat.y, tx, ty, lift), onto };
  }

  // Drop straight down onto the floor below (after the layout changed).
  private fall(cat: Cat): void {
    const below = this.nav.floorBelow(cat.x, cat.y);
    if (!below) return this.walkIn(cat);
    cat.fly(this.flightTo(cat, clamp(cat.x, ...this.nav.range(below)), below.y, 0, below));
  }

  // Landing: a short crouch, then on to whatever is next.
  private land(cat: Cat, f: Floor): void {
    cat.land(f, 0.14);
  }

  // Take a move from nav.reachable(): jump to the floor, or walk over to the wall.
  go(cat: Cat, o: Move): void {
    if (o.kind === 'jump') return this.jumpTo(cat, o);
    cat.heading = { to: 'wall', move: o };
    cat.walkTo(o.tx, WALK_SPEED);
  }

  private jumpTo(cat: Cat, o: JumpMove): void {
    cat.dir = o.tx >= cat.x ? 1 : -1;
    cat.crouch(0.16, this.flightTo(cat, o.tx, o.floor.y, this.random.between(15, 35), o.floor));
  }

  // At the foot (or top) of the wall: start up or down it, from the floor it is on.
  climb(cat: Cat, o: ClimbMove): void {
    const on = { wall: o.wall, dest: o.dest, origin: cat.floor as Floor };
    cat.floor = null;
    cat.x = o.wall.x;
    if (o.dest.y < cat.y) return this.wallStep(cat, on);
    cat.slide(on);
  }

  private wallStep(cat: Cat, on: OnWall): void {
    // If another leap would take its front paws past the floor's edge, it jumps up instead.
    const paws = SP.frames.climbReach.length * (this.px / this.dpr);
    if (cat.y - WALL_LEAP - paws <= on.dest.y) return this.jumpOnto(cat, on.dest, on.wall);
    cat.wallhop(on, WALL_LEAP, WIND_UP + HOP_TIME + this.random.between(0.4, 0.7));
  }

  // Jump up onto floor f from the top of wall w, on a side of the wall where it extends.
  private jumpOnto(cat: Cat, f: Floor, w: Wall): void {
    const { dir, tx, lift } = this.nav.wallTopLanding(f, w);
    cat.dir = dir;
    cat.fly(this.flightTo(cat, tx, f.y, lift, f));
  }

  // Slid down level with its destination: step off the wall onto it.
  private arrive(cat: Cat, on: { wall: Wall; dest: Floor }): void {
    cat.x = clamp(on.wall.x, ...this.nav.range(on.dest));
    this.land(cat, on.dest);
  }

  eat(cat: Cat, g: Fish): void {
    this.settleAt(cat, g);
    cat.eat(g, EAT_TIME);
  }

  play(cat: Cat, ball: Yarn): void {
    this.settleAt(cat, ball);
    cat.play(ball, this.random.between(PLAY_TIME[0], PLAY_TIME[1]));
  }

  // At a fish or a ball: it is this cat's now, and the cat faces it.
  private settleAt(cat: Cat, g: Thrown): void {
    cat.heading = null; // there
    g.cat = cat;
    cat.dir = g.x >= cat.x ? 1 : -1;
  }

  // Interrupted (it fell, or was packed): a fish or ball it was at is up for grabs again, and
  // whatever it was walking over for is forgotten.
  private interrupt(cat: Cat): void {
    if (cat.activity.kind === 'eat') cat.activity.meal.cat = null;
    if (cat.activity.kind === 'play') cat.activity.ball.cat = null;
    cat.heading = null;
  }

  // Walked out of the window: saved for whichever window gets it next (maybe this one).
  private leave(cat: Cat): void {
    this.save();
    this.catList = this.catList.filter((c) => c !== cat);
    cat.done();
  }

  // ---- each frame ----

  private update(cat: Cat, dt: number): void {
    const a = cat.activity;
    a.t += dt;
    switch (a.kind) {
      case 'sit':
        if (a.t >= a.dur) this.brain.decide(cat);
        break;
      case 'eat':
        if (a.t >= a.dur) {
          this.fish.remove(a.meal);
          const onTime = cat.care.eat();
          this.save();
          if (onTime) this.spawnEmotion('heart', cat);
          cat.sit(this.random.between(2, 5));
        }
        break;
      case 'play':
        // Done: one last swipe sends the ball rolling away, and it sits back.
        if (a.t >= a.dur) {
          a.ball.cat = null;
          this.yarn.roll(a.ball, cat.dir, this.random.between(ROLL_DISTANCE[0], ROLL_DISTANCE[1]));
          if (cat.care.played()) {
            this.save();
            this.spawnEmotion('heart', cat);
          }
          cat.sit(this.random.between(2, 5));
        }
        break;
      case 'sleep':
        if (a.t >= a.dur) cat.sit(this.random.between(1, 3));
        break;
      case 'walk': {
        const step = a.speed * dt;
        if (Math.abs(a.tx - cat.x) <= step) {
          cat.x = a.tx;
          if (cat.leaving) this.leave(cat);
          else this.brain.decide(cat);
        } else {
          cat.x += cat.dir * step;
        }
        break;
      }
      case 'crouch':
        // Before a jump (then off it goes) or after landing.
        if (a.t >= a.dur) {
          if (a.flight) cat.fly(a.flight);
          else this.brain.decide(cat);
        }
        break;
      case 'air': {
        const fl = a.flight;
        [cat.x, cat.y] = along(fl, Math.min(a.t, fl.time));
        if (a.t >= fl.time) this.land(cat, fl.onto);
        break;
      }
      case 'wallhop': {
        const k = clamp((a.t - WIND_UP) / HOP_TIME, 0, 1);
        const sink = a.t < WIND_UP ? this.px / this.dpr : 0; // one sprite pixel
        cat.y = a.hopFrom + (a.hopTo - a.hopFrom) * (1 - (1 - k) * (1 - k)) + sink;
        if (a.t >= a.dur) {
          // Now and then it thinks better of it and slides back down to where it started.
          // Lazier cats give up more often.
          if (this.random.chance(0.05 / cat.energy)) cat.slide({ wall: a.wall, dest: a.origin, origin: a.origin });
          else this.wallStep(cat, { wall: a.wall, dest: a.dest, origin: a.origin });
        }
        break;
      }
      case 'slide':
        // Claws on the wall: picks up speed, but never free-falls.
        a.vy = Math.min(a.vy + 500 * dt, 230);
        cat.y += a.vy * dt;
        if (cat.y >= a.dest.y) {
          cat.y = a.dest.y;
          this.arrive(cat, a);
        }
        break;
    }
  }

  // Every half second, a sleeping cat may show a Z, and a hungry one a fish.
  private spawnEmotions(dt: number): void {
    this.emotionTime += dt;
    if (this.emotionTime < 0.5) return;
    this.emotionTime = 0;
    for (const c of this.cats) {
      if (c.activity.kind === 'sleep') {
        if (this.random.chance(0.25)) this.spawnEmotion('z', c);
      } else if (c.care.asking()) {
        if (this.random.chance(c.care.starving() ? 1 / 6 : 1 / 18)) this.spawnEmotion('fish', c);
      }
    }
  }

  private spawnEmotion(kind: EmotionKind, c: Cat): void {
    const fish = kind === 'fish';
    const sleep = kind === 'z';
    this.emotionList.push({
      kind,
      x: c.x + (fish ? c.dir * 7 * (this.px / this.dpr) : 0),
      y: c.y - (sleep ? 9 * (this.px / this.dpr) : this.catH + 4),
      t: 0,
      dir: c.dir,
    });
  }
}
