// One VS Code session for the simulation: a World (src/world/world.ts) driven by the same Driver
// (src/world/driver.ts) as in VS Code's window, without the window. A virtual clock moves on
// one display frame at a time; every POLL_MS the Driver polls the status bar (which shows the
// cats, and lets them in); each frame it steps the world; a cat that is let in (or walks out and
// is let straight back in, as Web Locks do with one window) comes in after the frame. Same code,
// same seed: the same run. (test/sim/smoke.js runs the real script in a fake window.)
'use strict';

const FRAME_MS = 1000 / 60; // VS Code repaints at the display rate; 60 Hz is the common case
const SCALE = 2; // pixelCat.scale's default
const DPR = 1; // device pixels per CSS pixel
const LABEL = 'Pixel Cat: throw a fish to '; // the start of the 🐟's label while cats are out

/** Small, fast, seedable PRNG (mulberry32), so a run is repeatable. */
function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A rectangle as getBoundingClientRect() gives it. */
const boundingRect = (r) => ({ left: r.left, top: r.top, width: r.width, height: r.height, right: r.left + r.width, bottom: r.top + r.height });

/**
 * A session starting at `startMs`. `api` is the World's module (see scripts/bundle.js's
 * loadWorld), `storage` a Map shared by the sessions of a run (VS Code's localStorage).
 */
function createSession({ api, layout, seed, startMs, storage, cats }) {
  const errors = [];
  let now = startMs;
  const world = new api.World({
    random: new api.Random(seededRandom(seed)),
    clock: { now: () => now },
    careStore: api.storageCareStore(() => ({ getItem: (k) => (storage.has(k) ? storage.get(k) : null), setItem: (k, v) => storage.set(k, String(v)) })),
  });
  const guard = (fn) => {
    try {
      fn();
    } catch (e) {
      errors.push(e && e.stack ? e.stack : String(e));
    }
  };

  // Cats let in during a frame come in after it, as when Web Locks hand a cat to the window:
  // the promise callbacks all run before the next frame.
  let waiting = [];

  // The workbench parts, in the order the cat script reads them.
  const scan = () => {
    const rects = api.PARTS.flatMap((sel) => (layout.parts[sel] || []).map(boundingRect));
    return api.layoutFromRects(rects, layout.width, layout.height, world.catW, world.catH);
  };
  const driver = new api.Driver({ world, cats, layout: scan, letIn: (w, defs) => waiting.push(...defs) });
  const label = LABEL + cats.map((c) => c.name).join(', ');

  guard(() => {
    world.resize(layout.width, Math.max(1, Math.round(SCALE * DPR)), DPR);
    driver.relayout();
  });
  let nextPoll = startMs + api.POLL_MS;

  return {
    errors,
    get now() {
      return now;
    },
    /** One display frame: polls that come due, the frame, then the cats let in during it. */
    step() {
      const end = now + FRAME_MS;
      while (nextPoll <= end) {
        now = nextPoll;
        guard(() => driver.poll(label));
        nextPoll += api.POLL_MS;
      }
      now = end;
      guard(() => driver.frame(now));
      const coming = waiting;
      waiting = [];
      for (const def of coming) guard(() => world.spawn(def, () => waiting.push(def)));
    },
    /** What the recorder reads: the world's view, plus the window and the numbers it checks against. */
    view() {
      const v = world.view();
      const c = api.config;
      return {
        now: v.now,
        width: v.width,
        floors: v.floors,
        walls: v.walls,
        cats: v.cats,
        fishes: v.fishes,
        constants: {
          WALK_SPEED: c.WALK_SPEED,
          MAX_WALK_DISTANCE: c.MAX_WALK_DISTANCE,
          EDGE: c.EDGE,
          MAX_FISH: c.MAX_FISH,
          NEXT_MEAL_AFTER: c.NEXT_MEAL_AFTER,
          EAT_AFTER: c.EAT_AFTER,
          ASK_BEFORE: c.ASK_BEFORE,
          catW: world.catW,
          catH: world.catH,
        },
        W: v.width,
        H: layout.height,
        shown: driver.shown,
      };
    },
    /** Clicks the 🐟 in the status bar. */
    clickFish() {
      if (!driver.shown) return;
      const r = boundingRect(layout.fishButton);
      guard(() => world.throwFish(r.left + r.width / 2, r.top));
    },
  };
}

module.exports = { createSession, seededRandom, FRAME_MS };
