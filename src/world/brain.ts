// What a cat does next, when it has finished what it was doing and stands on a floor: in
// keeping with its energy and hunger, what is around it, and the other cats. The brain only
// decides; the world carries the move out.
import type { Cat } from './cat';
import { EDGE, MAX_WALK_DISTANCE, WALK_SPEED } from './config';
import type { Fish, FishPond } from './fish';
import type { Floor } from './layout';
import { clamp } from './math';
import type { ClimbMove, Move, Navigator } from './navigator';
import type { Random } from './random';

/** What the brain needs from the world around the cat. */
export interface BrainWorld {
  readonly cats: readonly Cat[];
  readonly pond: FishPond;
  readonly nav: Navigator;
  readonly random: Random;
  readonly width: number; // the window's, CSS px
  readonly catW: number;
  /** Carry out a move: up or down a wall, a jump or a walk to a wall, eating a fish. */
  climb(cat: Cat, o: ClimbMove): void;
  go(cat: Cat, o: Move): void;
  eat(cat: Cat, g: Fish): void;
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
    if (cat.napNext) {
      // Walked over to the sleeping cat (so it faces it): curl up.
      cat.napNext = false;
      return cat.sleep(this.napTime(cat));
    }
    if (cat.route) {
      // Walked over to the wall: up or down it goes.
      const o = cat.route;
      cat.route = null;
      return this.world.climb(cat, o);
    }
    const g = this.fishFor(cat);
    if (g) {
      // Trot over and stand with its mouth at the fish, then eat.
      cat.goingFor = g;
      const side = g.x >= cat.x ? 1 : -1;
      const tx = clamp(g.x - side * (catW / 2) * 0.8, lo, hi);
      if (Math.abs(tx - cat.x) <= 2) return this.world.eat(cat, g);
      return cat.walkTo(tx, WALK_SPEED * 4); // a sprint
    }
    if (cat.hunger.starving()) {
      const choice = random.pick([
        ['sit', 22],
        ['walk', 32 * Math.min(1, e * 2)],
      ]);
      if (choice === 'sit') return cat.sit(random.between(2, 7));
      const trot = random.chance(0.2 * e);
      return cat.walkTo(clamp(cat.x + random.between(-MAX_WALK_DISTANCE, MAX_WALK_DISTANCE), lo, hi), WALK_SPEED * (trot ? 3 : 1));
    }
    const options = nav.reachable(cat.x, cat.y, f);
    // Window edges this floor runs out to, within MAX_WALK_DISTANCE.
    const exits = [
      f.x1 <= EDGE && cat.x <= MAX_WALK_DISTANCE ? -1 : 0,
      f.x2 >= W - EDGE && W - cat.x <= MAX_WALK_DISTANCE ? 1 : 0,
    ].filter(Boolean);
    const choice = random.pick([
      ['sit', 22],
      ['walk', 32 * Math.min(1, e * 2)], // only really lazy cats walk less
      ['sleep', 8 / e + 5],
      ['jump', options.length ? 35 * e : 0],
      ['leave', exits.length ? 1.5 : 0],
    ]);
    switch (choice) {
      case 'leave':
        cat.leaving = true;
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
        cat.napNext = true;
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

  // The nearest fish on the cat's floor, within MAX_WALK_DISTANCE. Once it has picked one it
  // sticks with it: standing at one fish of a cluster can make another the nearest, and it
  // would trot back and forth between them for ever.
  fishFor(c: Cat): Fish | null {
    if (!c.hunger.canEat()) return null;
    const here = this.world.pond.fish.filter(
      (g) => g.landed && !g.eater && !g.fade && g.floor === c.floor && Math.abs(g.x - c.x) <= MAX_WALK_DISTANCE && !this.claimedByAnotherCat(g, c)
    );
    if (c.goingFor && here.includes(c.goingFor)) return c.goingFor;
    return here.sort((a, b) => Math.abs(a.x - c.x) - Math.abs(b.x - c.x))[0] || null;
  }

  private claimedByAnotherCat(g: Fish, c: Cat): boolean {
    return this.world.cats.some((other) => other !== c && other.goingFor === g);
  }

  // A nap: shorter the more energy the cat has.
  private napTime(cat: Cat): number {
    return this.world.random.between(12, 35) / cat.energy;
  }
}
