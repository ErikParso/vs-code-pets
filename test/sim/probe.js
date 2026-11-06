// A read-only view of the world for the recorder: browser.js splices this text into
// inject/world.js, just before it starts, so it can read the variables inside world.js's
// closure (cats, floors, fishes, ...). It is not a module and is never run on its own. If
// world.js renames one of the names used here, the run fails with a ReferenceError naming it.

const __fishIds = new WeakMap();
let __nextFishId = 1;
const __visitIds = new WeakMap(); // each time a cat comes into the window it is a new object
let __nextVisitId = 1;

window.PixelCatProbe = function probe() {
  const floorOf = (f) => f && { x1: f.x1, x2: f.x2, y: f.y };
  return {
    constants: {
      WALK_SPEED,
      MAX_WALK_DISTANCE,
      EDGE,
      MAX_FISH,
      NEXT_MEAL_AFTER,
      EAT_AFTER,
      ASK_BEFORE,
      catW: catW(),
      catH: catH(),
    },
    now: Date.now(),
    W,
    H,
    shown,
    floors: floors.map(floorOf),
    walls: walls.map((w) => ({ ...w })),
    cats: cats.map((c) => {
      if (!__visitIds.has(c)) __visitIds.set(c, __nextVisitId++);
      return {
        visit: __visitIds.get(c),
        name: c.name,
        energy: c.energy,
        state: c.state,
        t: c.t,
        dur: c.dur,
        x: c.x,
        y: c.y,
        tx: c.tx,
        speed: c.speed,
        floor: floorOf(c.floor),
        leaving: !!c.leaving,
        toFriend: !!c.napNext,
        toWall: !!c.route,
        toFish: !!c.goingFor,
        trust: c.trust,
        nextMealAt: c.nextMealAt,
      };
    }),
    fishes: fishes.map((g) => {
      if (!__fishIds.has(g)) __fishIds.set(g, __nextFishId++);
      return {
        id: __fishIds.get(g),
        x: g.x,
        y: g.y,
        floor: floorOf(g.floor),
        landed: landed(g),
        eater: g.eater ? g.eater.name : null,
        fading: !!g.fade,
        falling: !!g.falling,
      };
    }),
  };
};
