// What a cat does next, when it has finished what it was doing and stands on a floor: in
// keeping with its energy and hunger, what is around it, and the other cats. The brain only
// decides; the world carries the move out.
import type { Cat } from './cat';
import { EDGE, MAX_WALK_DISTANCE, PLAY_WEIGHT, WALK_SPEED } from './config';
import type { Fish, FishPond } from './fish';
import type { Floor } from './layout';
import { clamp } from './math';
import type { ClimbMove, Move, Navigator } from './navigator';
import type { Random } from './random';
import type { Thrown } from './thrown';
import type { Yarn, YarnPile } from './yarn';

/** What the brain needs from the world around the cat. */
export interface BrainWorld {
  readonly cats: readonly Cat[];
  readonly fish: FishPond;
  readonly yarn: YarnPile;
  readonly nav: Navigator;
  readonly random: Random;
  readonly width: number; // the window's, CSS px
  readonly catW: number;
  /** Carry out a move: up or down a wall, a jump or a walk to a wall, eating a fish, playing with a ball. */
  climb(cat: Cat, o: ClimbMove): void;
  go(cat: Cat, o: Move): void;
  eat(cat: Cat, g: Fish): void;
  play(cat: Cat, ball: Yarn): void;
}

export class CatBrain {
  constructor(private readonly world: BrainWorld) {}

  // Pick the next thing to do on a floor, in keeping with the cat's energy. A cat going to
  // sleep curls up next to another cat sleeping on its floor, if one is within reach.
  decide(cat: Cat): void {
    const { cats, nav, random, width: W, catW } = this.world;
    const f = cat.floor as Floor; // it decides standing on a floor
    const e = cat.energy;
    const [lo, hi] = nav.range(f);
    // What it walked over here for, if anything; from here on it heads somewhere new.
    const was = cat.heading;
    cat.heading = null;
    // Walked over to the sleeping cat (so it faces it): curl up.
    if (was?.to === 'friend') return cat.sleep(this.napTime(cat));
    // Walked over to the wall: up or down it goes.
    if (was?.to === 'wall') return this.world.climb(cat, was.move);
    const g = this.fishFor(cat, was?.to === 'fish' ? was.item : null);
    if (g) {
      cat.heading = { to: 'fish', item: g }; // food first
      return this.toFish(cat, g);
    }
    // Starving, it only sits or walks about (asking for food) until it eats.
    const starving = cat.hunger.starving();
    const ball = starving ? null : this.ballFor(cat, was?.to === 'ball' ? was.item : null);
    // Walked over to the ball it chose to play with (and it is still there, lying still): play.
    if (ball && was?.to === 'ball' && was.item === ball) {
      cat.heading = was;
      return this.toBall(cat, ball);
    }
    const options = starving ? [] : nav.reachable(cat.x, cat.y, f);
    // Window edges this floor runs out to, within MAX_WALK_DISTANCE.
    const exits = starving
      ? []
      : [f.x1 <= EDGE && cat.x <= MAX_WALK_DISTANCE ? -1 : 0, f.x2 >= W - EDGE && W - cat.x <= MAX_WALK_DISTANCE ? 1 : 0].filter(Boolean);
    const choice = random.pick([
      ['sit', 22],
      ['walk', 32 * Math.min(1, e * 2)], // only really lazy cats walk less
      ['sleep', starving ? 0 : 8 / e + 5],
      ['jump', options.length ? 35 * e : 0],
      ['leave', exits.length ? 1.5 : 0],
      ['play', ball ? PLAY_WEIGHT : 0],
    ]);
    switch (choice) {
      case 'play':
        cat.heading = { to: 'ball', item: ball as Yarn };
        return this.toBall(cat, ball as Yarn);
      case 'leave':
        cat.heading = { to: 'leave' };
        return cat.walkTo(random.oneOf(exits) < 0 ? -catW : W + catW, WALK_SPEED * 2);
      case 'sit':
        return cat.sit(random.between(2, 7));
      case 'sleep': {
        // The nearest cat sleeping on this floor within MAX_WALK_DISTANCE: curl up next to it,
        // on the side it comes from. Otherwise sleep right here.
        const friend = cats
          .filter((c) => c !== cat && c.floor === f && c.activity.kind === 'sleep' && Math.abs(c.x - cat.x) <= MAX_WALK_DISTANCE)
          .sort((a, b) => Math.abs(a.x - cat.x) - Math.abs(b.x - cat.x))[0];
        if (!friend) return cat.sleep(this.napTime(cat));
        cat.heading = { to: 'friend' };
        return cat.walkTo(clamp(friend.x + (cat.x < friend.x ? -1 : 1) * catW * 0.9, lo, hi), WALK_SPEED);
      }
      case 'walk': {
        const trot = random.chance(0.2 * e);
        return cat.walkTo(clamp(cat.x + random.between(-MAX_WALK_DISTANCE, MAX_WALK_DISTANCE), lo, hi), WALK_SPEED * (trot ? 3 : 1));
      }
      case 'jump':
        return this.world.go(cat, random.oneOf(options));
    }
  }

  // The fish it would eat, if it is hungry enough (`mine`: the one it was going for): see nearest.
  private fishFor(c: Cat, mine: Fish | null): Fish | null {
    if (!c.hunger.canEat()) return null;
    return this.nearest(c, this.world.fish.items, mine);
  }

  // The ball of yarn it would play with: one lying still (see nearest).
  private ballFor(c: Cat, mine: Yarn | null): Yarn | null {
    return this.nearest(c, this.world.yarn.items.filter((g) => !g.roll), mine);
  }

  // The nearest of `items` lying on the cat's floor, within MAX_WALK_DISTANCE, that no cat is at
  // and no other cat is going for. Once it has picked one (`mine`) it sticks with it: standing
  // at one of a cluster can make another the nearest, and it would trot back and forth between
  // them for ever.
  private nearest<T extends Thrown>(c: Cat, items: readonly T[], mine: T | null): T | null {
    const here = items.filter(
      (g) =>
        g.landed &&
        !g.cat &&
        !g.fade &&
        g.floor === c.floor &&
        Math.abs(g.x - c.x) <= MAX_WALK_DISTANCE &&
        !this.world.cats.some((other) => other !== c && other.goingFor === g)
    );
    if (mine && here.includes(mine)) return mine;
    return here.sort((a, b) => Math.abs(a.x - c.x) - Math.abs(b.x - c.x))[0] || null;
  }

  // Sprint over and stand with its mouth at the fish, then eat.
  private toFish(cat: Cat, g: Fish): void {
    this.approach(cat, g, 0.8, WALK_SPEED * 4, () => this.world.eat(cat, g));
  }

  // Trot over and stand with its paw just short of the ball, then play.
  private toBall(cat: Cat, ball: Yarn): void {
    this.approach(cat, ball, 1.25, WALK_SPEED * 3, () => this.world.play(cat, ball));
  }

  // Walks over to stand `reach` half its width short of `g`, at `speed`; there already, `arrive`.
  private approach(cat: Cat, g: Thrown, reach: number, speed: number, arrive: () => void): void {
    const [lo, hi] = this.world.nav.range(cat.floor as Floor);
    const side = g.x >= cat.x ? 1 : -1;
    const tx = clamp(g.x - side * (this.world.catW / 2) * reach, lo, hi);
    if (Math.abs(tx - cat.x) <= 2) return arrive();
    cat.walkTo(tx, speed);
  }

  // A nap: shorter the more energy the cat has.
  private napTime(cat: Cat): number {
    return this.world.random.between(12, 35) / cat.energy;
  }
}
