// Pixel Cat, running inside VS Code's own window (the extension injects this file).
// The cat lives on a click-through overlay and treats the edges of the workbench parts
// (sidebar, editor, panel, status bar, ...) as floors it walks on and walls it climbs.
(function () {
  'use strict';
  if (window.__pixelCatRunning) return;
  window.__pixelCatRunning = true;

  const SP = window.PixelCatSprites;
  const SCALE = (window.PixelCatConfig && window.PixelCatConfig.scale) || 2;
  const GRAVITY = 1500; // px/s²
  const WALK_SPEED = 40; // px/s; now and then a cat trots at three times this
  const MAX_RISE = 170; // highest ledge it will jump up to
  const MAX_GAP = 220; // widest gap it will jump across
  const MAX_DROP = 200; // deepest it will jump down; further down it slides down a wall
  const EDGE = 3; // tolerance when matching edges, px
  const WALL_LEAP = 80; // one leap up a wall

  // The cats, from inject/cats.json (passed in by the extension); which window each is in is
  // settled by Web Locks (see roam). Energy (1 = an everyday cat): the more it has, the more it
  // walks, trots and jumps, and the less often and less long it naps.
  const CATS = (window.PixelCatConfig && window.PixelCatConfig.cats) || [];

  // Workbench parts whose edges are floors (top edge) and walls (side edges).
  const PARTS = [
    '.part.titlebar',
    '.part.banner',
    '.part.activitybar',
    '.part.sidebar',
    '.part.editor',
    '.part.editor .editor-group-container',
    '.part.panel',
    '.part.auxiliarybar',
    '.part.statusbar',
  ];

  /** @type {HTMLCanvasElement} */
  let canvas;
  /** @type {CanvasRenderingContext2D} */
  let ctx;
  let dpr = 1;
  let px = SCALE; // device pixels per sprite pixel
  let W = 0;
  let H = 0;
  /** @type {{x1: number, x2: number, y: number}[]} */
  let floors = [];
  /** @type {{x: number, y1: number, y2: number}[]} */
  let walls = [];
  let layoutKey = '';
  /** @type {Record<string, Record<string, HTMLCanvasElement>>} */
  let sprites = {};
  /** @type {{kind: 'z' | 'heart' | 'fish', x: number, y: number, t: number, dir?: number}[]} */
  let emotions = [];
  /** @type {any[]} */
  let fishes = []; // fish thrown to the cats, oldest first
  /** @type {any[]} */
  let cats = [];
  /** @type {any} */
  let cat = null; // the cat currently being updated or drawn; the behaviour code acts on it
  let shown = false;
  let debug = false; // debug mode: the floors, walls and hunger are drawn
  let ink = '#888';
  let carePanel;
  let carePanelOpen = false;

  const catW = () => (SP.width * px) / dpr;
  const catH = () => (SP.height * px) / dpr;
  const halfW = () => catW() / 2;
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const any = (list) => list[Math.floor(Math.random() * list.length)];
  const touches = (f, x) => f.x1 - EDGE <= x && x <= f.x2 + EDGE;

  /** @param {[string, number][]} options */
  function pick(options) {
    let r = Math.random() * options.reduce((sum, [, w]) => sum + w, 0);
    for (const [value, w] of options) {
      if ((r -= w) < 0) return value;
    }
    return options[0][0];
  }

  // ---- overlay and sprites ----------------------------------------------

  // One set of frames per coat (sprites[coat][frame]).
  function buildSprites() {
    sprites = {};
    for (const [coatName, coat] of Object.entries(SP.coats)) {
      const palette = { ...SP.palette, ...coat };
      const set = {};
      for (const [name, rows] of Object.entries(SP.frames)) {
        const c = document.createElement('canvas');
        c.width = rows[0].length * px; // most frames are 24x16; climbing ones are 16x24
        c.height = rows.length * px;
        const g = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d'));
        rows.forEach((row, y) => {
          for (let x = 0; x < row.length; x++) {
            const color = palette[row[x]];
            if (!color) continue;
            g.fillStyle = color;
            g.fillRect(x * px, y * px, px, px);
          }
        });
        set[name] = c;
      }
      sprites[coatName] = set;
    }
  }

  function createOverlay() {
    canvas = document.createElement('canvas');
    canvas.className = 'pixel-cat-overlay';
    Object.assign(canvas.style, {
      position: 'fixed',
      left: '0',
      top: '0',
      pointerEvents: 'none',
      zIndex: '999',
    });
    document.body.appendChild(canvas);
    ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));

    carePanel = document.createElement('div');
    Object.assign(carePanel.style, {
      position: 'fixed', right: '16px', top: '36px', zIndex: '1000', display: 'none',
      minWidth: '310px', padding: '10px', border: '1px solid var(--vscode-editorWidget-border, #555)',
      background: 'var(--vscode-editorWidget-background, #252526)', color: 'var(--vscode-editorWidget-foreground, #ccc)',
      fontFamily: 'var(--vscode-font-family, sans-serif)', fontSize: '12px', pointerEvents: 'auto',
    });
    document.body.appendChild(carePanel);
  }

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    if (ratio !== dpr || !Object.keys(sprites).length) {
      dpr = ratio;
      px = Math.max(1, Math.round(SCALE * dpr));
      buildSprites();
    }
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.imageSmoothingEnabled = false;
    layoutKey = '';
    relayout();
  }

  // ---- reading the workbench layout -------------------------------------

  function scan() {
    let fs = [];
    let ws = [];
    for (const sel of PARTS) {
      for (const el of document.querySelectorAll(sel)) {
        const r = el.getBoundingClientRect();
        if (r.width <= 4 || r.height <= 4) continue;
        // Floors need room for the cat above them (its ear tips may poke past the window
        // top) and enough width to stand on.
        if (r.top >= catH() * 0.8 && r.width >= catW() * 0.6) {
          fs.push({ x1: Math.round(r.left), x2: Math.round(r.right), y: Math.round(r.top) });
        }
        ws.push({ x: Math.round(r.left), y1: Math.round(r.top), y2: Math.round(r.bottom) });
        ws.push({ x: Math.round(r.right), y1: Math.round(r.top), y2: Math.round(r.bottom) });
      }
    }
    if (!fs.some((f) => f.y > H - 40)) fs.push({ x1: 0, x2: W, y: H });

    // Edges of neighbouring parts line up; merge them so the cat walks across seamlessly.
    fs.sort((a, b) => a.y - b.y || a.x1 - b.x1);
    const mergedFloors = [];
    for (const f of fs) {
      const prev = mergedFloors[mergedFloors.length - 1];
      if (prev && Math.abs(prev.y - f.y) <= 1 && f.x1 <= prev.x2 + 2) prev.x2 = Math.max(prev.x2, f.x2);
      else mergedFloors.push({ ...f });
    }
    ws.sort((a, b) => a.x - b.x || a.y1 - b.y1);
    const mergedWalls = [];
    for (const w of ws) {
      const prev = mergedWalls[mergedWalls.length - 1];
      if (prev && Math.abs(prev.x - w.x) <= 1 && w.y1 <= prev.y2 + 2) prev.y2 = Math.max(prev.y2, w.y2);
      else mergedWalls.push({ ...w });
    }
    // Nothing below the lowest floor (the status bar) is part of the cat's world.
    const bottom = Math.max(...mergedFloors.map((f) => f.y));
    for (const w of mergedWalls) w.y2 = Math.min(w.y2, bottom);
    return { floors: mergedFloors, walls: mergedWalls.filter((w) => w.y2 - w.y1 > catW()) };
  }

  // After the layout changed, a cat still standing on a floor stays put; every other cat
  // (on a wall, in the air, or whose floor is gone) drops onto the floor below it.
  function relayout() {
    const next = scan();
    const key = JSON.stringify(next);
    if (key === layoutKey) return;
    layoutKey = key;
    floors = next.floors;
    walls = next.walls;
    for (const c of cats) {
      cat = c;
      if (cat.leaving) continue; // on its way out of the window anyway
      const f = cat.floor && floors.find((g) => Math.abs(g.y - cat.y) <= EDGE && touches(g, cat.x));
      cat.route = null; // the wall it was walking to may have moved
      if (f) {
        cat.floor = f;
        if (cat.state === 'walk') cat.tx = clamp(cat.tx, ...range(f));
        continue;
      }
      if (onWall()) cat.x = clamp(cat.wall.x, halfW(), W - halfW());
      leaveMeal();
      fall();
    }
    // Fish on a floor that is gone fade away.
    for (const g of fishes) {
      if (!g.floor) continue; // fading away already
      g.floor = floors.find((f) => Math.abs(f.y - g.floor.y) <= EDGE && touches(f, g.x));
      if (!g.floor) g.fade ||= 0.001;
    }
  }

  // ---- behaviour ---------------------------------------------------------

  const onWall = () => cat.state === 'wallhop' || cat.state === 'slide';

  function setState(state, dur = Infinity) {
    cat.state = state;
    cat.t = 0;
    cat.dur = dur;
  }

  /** Horizontal range the cat's centre may use on floor f. */
  function range(f) {
    const lo = Math.max(f.x1, halfW());
    const hi = Math.min(f.x2, W - halfW());
    return lo <= hi ? [lo, hi] : [(lo + hi) / 2, (lo + hi) / 2];
  }

  // A cat comes out: it walks in along the bottom. `done` lets it go to another window.
  function spawn(def, done) {
    const care = saved()[def.name];
    cat = { x: 0, y: 0, vy: 0, dir: 1, state: 'walk', t: 0, dur: 0, floor: null, ...def, done };
    cat.nextMealAt = typeof care?.nextMealAt === 'number' ? care.nextMealAt : Date.now() + NEXT_MEAL_AFTER;
    cat.trust = typeof care?.trust === 'number' ? care.trust : TRUST_START;
    cats.push(cat);
    walkIn();
  }

  // The cat arrives by walking in along the lowest floor (the status bar), from a window edge.
  function walkIn() {
    const f = floors.reduce((low, g) => (g.y > low.y ? g : low));
    const [lo, hi] = range(f);
    cat.floor = f;
    cat.y = f.y;
    cat.x = Math.random() < 0.5 ? -halfW() : W + halfW();
    walkTo(rand(lo, hi), WALK_SPEED);
  }

  function walkTo(tx, speed) {
    cat.tx = tx;
    cat.speed = speed;
    cat.dir = tx >= cat.x ? 1 : -1;
    setState('walk');
  }

  // A fixed arc from (x0, y0) that lands exactly on (tx, ty), rising `lift` above the higher
  // of the two.
  function arc(x0, y0, tx, ty, lift, gravity = GRAVITY) {
    const apex = Math.min(y0, ty) - lift;
    const vy = -Math.sqrt(2 * gravity * (y0 - apex));
    const time = Math.max(0.05, -vy / gravity + Math.sqrt((2 * (ty - apex)) / gravity));
    return { x0, y0, vx: (tx - x0) / time, vy, time, gravity };
  }
  const along = (a, t) => [a.x0 + a.vx * t, a.y0 + a.vy * t + (a.gravity * t * t) / 2];

  // Every move through the air is an arc, landing on floor `onto`.
  function fly(tx, ty, lift, onto) {
    cat.flight = { ...arc(cat.x, cat.y, tx, ty, lift), onto };
    cat.floor = null;
    setState('air');
  }

  // Drop straight down onto the floor below (after the layout changed).
  function fall() {
    const below = floors.filter((f) => f.y >= cat.y - EDGE && touches(f, cat.x)).sort((a, b) => a.y - b.y)[0];
    if (!below) return walkIn();
    fly(clamp(cat.x, ...range(below)), below.y, 0, below);
  }

  // Landing: a short crouch, then on to whatever is next.
  function land(f) {
    cat.y = f.y;
    cat.floor = f;
    setState('crouch', 0.14);
  }

  // ---- getting around ----------------------------------------------------------------
  //
  // From a floor the cat jumps to any floor within jump range. To get further up or down it
  // walks to where a wall meets its floor, climbs up in leaps or slides down until it is
  // level with the floor it picked, and steps onto it.

  // Everything within reach of the cat standing on floor `floor`.
  function reachable() {
    const { x, y, floor } = cat;
    const options = [];
    for (const f of floors) {
      const [lo, hi] = range(f);
      if (f === floor || hi - lo < 4 || Math.abs(f.y - y) <= EDGE) continue;
      if (y - f.y > MAX_RISE || f.y - y > MAX_DROP) continue;
      const tx = clamp(x + rand(-80, 80), lo, hi);
      if (Math.abs(tx - x) <= MAX_GAP) options.push({ tx, floor: f });
    }
    // Walls along this floor, and the floors they lead to (which may start a little past
    // their ends), other than this level.
    const leadsTo = (w, g) => w.y1 - catH() <= g.y && g.y <= w.y2 + catH() && touches(g, w.x);
    for (const w of walls) {
      if (!leadsTo(w, floor) || w.x < halfW() || w.x > W - halfW() || Math.abs(w.x - x) > MAX_GAP) continue;
      const dests = floors.filter((g) => Math.abs(g.y - y) > EDGE && leadsTo(w, g));
      if (dests.length) options.push({ tx: clamp(w.x, ...range(floor)), wall: w, dest: any(dests) });
    }
    return options;
  }

  // Take a move from reachable(): jump to the floor, or walk over to the wall.
  function go(o) {
    if (!o.wall) return jumpTo(o);
    cat.route = o;
    walkTo(o.tx, WALK_SPEED);
  }

  function jumpTo(o) {
    cat.dir = o.tx >= cat.x ? 1 : -1;
    fly(o.tx, o.floor.y, rand(15, 35), o.floor);
    setState('crouch', 0.16);
  }

  // At the foot (or top) of the wall: start up or down it.
  function climb(o) {
    cat.wall = o.wall;
    cat.dest = o.dest; // the floor it is heading for
    cat.origin = cat.floor; // the floor it started from
    cat.floor = null;
    cat.x = o.wall.x;
    if (o.dest.y < cat.y) return wallStep();
    cat.vy = 0;
    setState('slide');
  }

  // Up the wall: the cat gathers itself (sinking a little), springs up easing out at the
  // top, then holds on a moment, swishing its tail.
  const WIND_UP = 0.12;
  const HOP_TIME = 0.35;
  function wallStep() {
    // If another leap would take its front paws past the floor's edge, it jumps up instead.
    const paws = SP.frames.climbReach.length * (px / dpr);
    if (cat.y - WALL_LEAP - paws <= cat.dest.y) return jumpOnto(cat.dest);
    cat.hopFrom = cat.y;
    cat.hopTo = cat.y - WALL_LEAP;
    setState('wallhop', WIND_UP + HOP_TIME + rand(0.4, 0.7));
  }

  // Jump up onto floor f, on a side of the wall where it extends.
  function jumpOnto(f) {
    const w = cat.wall;
    const [lo, hi] = range(f);
    const sides = [-1, 1].filter((s) => (s < 0 ? lo < w.x - halfW() : hi > w.x + halfW()));
    cat.dir = sides.length ? any(sides) : (lo + hi) / 2 < w.x ? -1 : 1;
    fly(clamp(w.x + cat.dir * rand(20, 40), lo, hi), f.y, rand(10, 20), f);
  }

  // Slid down level with its destination: step off the wall onto it.
  function arrive() {
    cat.x = clamp(cat.wall.x, ...range(cat.dest));
    land(cat.dest);
  }

  // ---- fish ----------------------------------------------------------------
  //
  // Clicking the 🐟 in the status bar throws a fish from there, landing on a cat's floor. An
  // awake cat on the floor of a fish goes and eats it. Fish stay until eaten; with more
  // than MAX_FISH out, the oldest fades away.

  const MAX_FISH = 10;
  const EAT_TIME = 4;
  const SNIFF = 0.6; // head down at the fish before the first bite
  const CHEW = 0.5; // one bite: head down, then a tug
  const BITES = Math.ceil((EAT_TIME - SNIFF) / CHEW);
  const FADE_TIME = 1.5;
  const FISH_GRAVITY = 1000; // floatier than the cats

  function throwFish(x, y) {
    const near = any(cats.filter((c) => c.floor));
    const f = near ? near.floor : any(floors);
    const [lo, hi] = range(f);
    // Off to one side of the cat (the side with room), so it has to go and get it.
    let tx = rand(lo, hi);
    if (near) {
      const d = rand(100, 350);
      let side = Math.random() < 0.5 ? -1 : 1;
      if (near.x + side * d < lo || near.x + side * d > hi) side = -side;
      tx = clamp(near.x + side * d, lo, hi);
    }
    // A floaty toss, higher the further it goes (but staying in the window).
    const lift = Math.max(0, Math.min(50 + 0.2 * Math.abs(tx - x), Math.min(y, f.y) - 10));
    fishes.push({ ...arc(x, y, tx, f.y, lift, FISH_GRAVITY), x, y, t: 0, floor: f, eater: null, fade: 0 });
    const live = fishes.filter((g) => !g.fade);
    if (live.length > MAX_FISH) live[0].fade = 0.001;
  }

  const landed = (g) => g.t >= g.time;

  function updateFish(dt) {
    for (const g of fishes) {
      const wasFlying = !landed(g);
      g.t += dt;
      if (g.fade) g.fade += dt;
      if (g.falling) {
        g.vy += FISH_GRAVITY * dt;
        g.x += g.hop * g.hopSpeed * dt;
        g.y += g.vy * dt;
      } else if (wasFlying) {
        [g.x, g.y] = along(g, Math.min(g.t, g.time));
      } else if (!g.eater && !g.fade) {
        flop(g, dt);
      }
    }
    fishes = fishes.filter((g) => g.fade < FADE_TIME);
  }

  // Flops come at random: a hop as it lands, then every so often another, each its own
  // height, length and quickness. Each carries it a little way, mostly the same way as the
  // last, and lands it the other way round. Flopped off the end of its floor, it drops out
  // of reach and is gone.
  function flop(g, dt) {
    if (g.flips === undefined || g.t >= g.nextFlop) {
      g.flips = g.flips === undefined ? 0 : g.flips + 1;
      g.flopFrom = g.t;
      g.flopTime = rand(0.25, 0.45);
      g.flopHeight = rand(3, 10);
      g.hop = g.hop && Math.random() < 0.7 ? g.hop : any([-1, 1]);
      g.hopSpeed = rand(8, 30); // px a second while in the air
      g.nextFlop = g.t + g.flopTime + rand(1, 5);
    }
    if (g.t >= g.flopFrom + g.flopTime) return;
    g.x += g.hop * g.hopSpeed * dt;
    if (g.x < Math.max(g.floor.x1, 0) || g.x > Math.min(g.floor.x2, W)) {
      g.falling = true;
      g.vy = -120;
      g.fade = 0.001;
    }
  }

  // The nearest fish on the cat's floor. Once it has picked one it sticks with it: standing
  // at one fish of a cluster can make another the nearest, and it would trot back and forth
  // between them for ever.
  function claimedByAnotherCat(g, c = cat) {
    return cats.some((other) => other !== c && other.goingFor === g);
  }

  function fishFor(c = cat) {
    if (!canEat(c)) return null;
    const here = fishes.filter((g) => landed(g) && !g.eater && !g.fade && g.floor === c.floor && !claimedByAnotherCat(g, c));
    if (here.includes(c.goingFor)) return c.goingFor;
    return here.sort((a, b) => Math.abs(a.x - c.x) - Math.abs(b.x - c.x))[0] || null;
  }

  function eat(g) {
    g.eater = cat;
    cat.meal = g;
    cat.mealLate = Date.now() >= cat.nextMealAt;
    cat.dir = g.x >= cat.x ? 1 : -1;
    setState('eat', EAT_TIME);
  }

  // Interrupted (it fell): the fish is up for grabs again.
  function leaveMeal() {
    if (cat.meal) cat.meal.eater = null;
    cat.meal = null;
    cat.goingFor = null;
  }

  // ---- hunger --------------------------------------------------------------
  //
  // Each fish gives a cat another day before its meal deadline. For the first three hours
  // it ignores fish; in the final six it asks for one now and then.
  const HOUR = 60 * 60 * 1000;
  const NEXT_MEAL_AFTER = 24 * HOUR;
  const EAT_AFTER = 3 * HOUR;
  const ASK_BEFORE = 6 * HOUR;
  const TRUST_START = 0.1;
  const TRUST_ON_TIME = 0.03;
  const TRUST_LATE = 0.05;
  const SAVED = 'pixelCat.care'; // {name: {nextMealAt, trust}}

  function saved() {
    try {
      return JSON.parse(localStorage.getItem(SAVED) || '{}');
    } catch (e) {
      return {};
    }
  }

  function save() {
    const all = saved();
    for (const c of cats) all[c.name] = { nextMealAt: c.nextMealAt, trust: c.trust };
    try {
      localStorage.setItem(SAVED, JSON.stringify(all));
    } catch (e) {
      // No storage: it just starts afresh next time.
    }
  }

  const canEat = (c) => c.nextMealAt <= Date.now() + NEXT_MEAL_AFTER - EAT_AFTER;
  const asking = (c) => Date.now() >= c.nextMealAt - ASK_BEFORE;
  const starving = (c) => Date.now() >= c.nextMealAt;
  const hunger = (c) => clamp(1 - (c.nextMealAt - Date.now()) / NEXT_MEAL_AFTER, 0, 1);

  function mealLabel(c) {
    const left = c.nextMealAt - Date.now();
    if (left <= 0) return 'Starving';
    const hours = Math.floor(left / HOUR);
    const minutes = Math.floor((left % HOUR) / (60 * 1000));
    return `${asking(c) ? 'Hungry' : canEat(c) ? 'Normal' : 'Fed'}: ${hours}h ${minutes}m`;
  }

  function careButton(label, title, action) {
    const button = document.createElement('button');
    button.textContent = label;
    button.title = title;
    button.setAttribute('aria-label', title);
    Object.assign(button.style, {
      minWidth: '38px', marginLeft: '4px', padding: '2px 4px', border: '1px solid var(--vscode-button-border, transparent)',
      background: 'var(--vscode-button-secondaryBackground, #3a3d41)', color: 'var(--vscode-button-secondaryForeground, #fff)',
    });
    button.addEventListener('click', action);
    return button;
  }

  function drawCarePanel() {
    if (!carePanel) return;
    carePanel.style.display = carePanelOpen && shown ? 'block' : 'none';
    if (!carePanelOpen || !shown) return;
    carePanel.replaceChildren();
    const title = document.createElement('strong');
    title.textContent = 'Cat Care';
    carePanel.appendChild(title);
    if (!cats.length) {
      const empty = document.createElement('div');
      empty.textContent = 'No cats are visiting this window.';
      empty.style.marginTop = '8px';
      carePanel.appendChild(empty);
      return;
    }
    for (const c of cats) {
      const row = document.createElement('div');
      Object.assign(row.style, { display: 'flex', alignItems: 'center', marginTop: '8px', whiteSpace: 'nowrap' });
      const details = document.createElement('span');
      details.textContent = `${c.name}: ${mealLabel(c)}, trust ${c.trust.toFixed(2)}`;
      details.style.flex = '1';
      row.appendChild(details);
      const adjust = (hours, trust) => () => {
        c.nextMealAt = clamp(c.nextMealAt + hours * HOUR, Date.now(), Date.now() + NEXT_MEAL_AFTER);
        c.trust = clamp(c.trust + trust, 0, 1);
        save();
        drawCarePanel();
      };
      row.appendChild(careButton('-6h', 'Make the cat six hours hungrier', adjust(-6, 0)));
      row.appendChild(careButton('+6h', 'Give the cat six more hours before its meal', adjust(6, 0)));
      row.appendChild(careButton('-T', 'Subtract 0.1 trust', adjust(0, -0.1)));
      row.appendChild(careButton('+T', 'Add 0.1 trust', adjust(0, 0.1)));
      carePanel.appendChild(row);
    }
  }

  const SNUGGLE_REACH = 600; // furthest it walks to curl up next to a sleeping cat, px

  // A nap: shorter the more energy the cat has.
  const napTime = () => rand(12, 35) / cat.energy;

  function spawnEmotion(kind, c = cat) {
    const fish = kind === 'fish';
    const sleep = kind === 'z';
    emotions.push({
      kind,
      x: c.x + (fish ? c.dir * 7 * (px / dpr) : 0),
      y: c.y - (sleep ? 9 * (px / dpr) : catH() + 4),
      t: 0,
      dir: c.dir,
    });
  }

  // Pick the next thing to do on a floor, in keeping with the cat's energy. Now and then it
  // curls up next to another cat sleeping on the same floor.
  function decide() {
    const f = cat.floor;
    const e = cat.energy;
    const [lo, hi] = range(f);
    if (cat.napNext) {
      // Walked over to the sleeping cat (so it faces it): curl up, with a heart.
      cat.napNext = false;
      spawnEmotion('heart');
      return setState('sleep', napTime());
    }
    if (cat.route) {
      // Walked over to the wall: up or down it goes.
      const o = cat.route;
      cat.route = null;
      return climb(o);
    }
    const g = fishFor();
    if (g) {
      // Trot over and stand with its mouth at the fish, then eat.
      cat.goingFor = g;
      const side = g.x >= cat.x ? 1 : -1;
      const tx = clamp(g.x - side * halfW() * 0.8, lo, hi);
      if (Math.abs(tx - cat.x) <= 2) return eat(g);
      return walkTo(tx, WALK_SPEED * 4); // a sprint
    }
    if (starving(cat)) {
      const choice = pick([
        ['sit', 22],
        ['walk', 32 * Math.min(1, e * 2)],
      ]);
      if (choice === 'sit') return setState('sit', rand(2, 7));
      const trot = Math.random() < 0.2 * e;
      return walkTo(clamp(cat.x + rand(-250, 250), lo, hi), WALK_SPEED * (trot ? 3 : 1));
    }
    // The nearest cat sleeping on this floor, if it is within SNUGGLE_REACH.
    const friend = cats
      .filter((c) => c !== cat && c.floor === f && c.state === 'sleep' && Math.abs(c.x - cat.x) <= SNUGGLE_REACH)
      .sort((a, b) => Math.abs(a.x - cat.x) - Math.abs(b.x - cat.x))[0];
    const options = reachable();
    const exits = [f.x1 <= EDGE ? -1 : 0, f.x2 >= W - EDGE ? 1 : 0].filter(Boolean);
    const choice = pick([
      ['sit', 22],
      ['walk', 32 * Math.min(1, e * 2)], // only really lazy cats walk less
      ['sleep', 8 / e],
      ['jump', options.length ? 35 * e : 0],
      ['snuggle', friend ? 15 : 0],
      ['leave', exits.length ? 1.5 : 0],
    ]);
    switch (choice) {
      case 'leave':
        cat.leaving = true;
        return walkTo(any(exits) < 0 ? -catW() : W + catW(), WALK_SPEED * 2);
      case 'sit':
        return setState('sit', rand(2, 7));
      case 'sleep':
        return setState('sleep', napTime());
      case 'walk': {
        const trot = Math.random() < 0.2 * e;
        return walkTo(clamp(cat.x + rand(-250, 250), lo, hi), WALK_SPEED * (trot ? 3 : 1));
      }
      case 'jump':
        return go(any(options));
      case 'snuggle':
        // Next to it on the side it comes from.
        cat.napNext = true;
        return walkTo(clamp(friend.x + (cat.x < friend.x ? -1 : 1) * catW() * 0.9, lo, hi), WALK_SPEED);
    }
  }

  function update(dt) {
    cat.t += dt;
    switch (cat.state) {
      case 'sit':
        if (cat.t >= cat.dur) decide();
        break;
      case 'eat':
        if (cat.t >= cat.dur) {
          fishes = fishes.filter((g) => g !== cat.meal);
          cat.meal = null;
          cat.goingFor = null;
          cat.trust = clamp(cat.trust + (cat.mealLate ? -TRUST_LATE : TRUST_ON_TIME), 0, 1);
          cat.nextMealAt = Date.now() + NEXT_MEAL_AFTER;
          save();
          spawnEmotion('heart');
          setState('sit', rand(2, 5));
        }
        break;
      case 'sleep':
        if (cat.t >= cat.dur) setState('sit', rand(1, 3));
        break;
      case 'walk': {
        const step = cat.speed * dt;
        if (Math.abs(cat.tx - cat.x) <= step) {
          cat.x = cat.tx;
          if (cat.leaving) leave();
          else decide();
        } else {
          cat.x += cat.dir * step;
        }
        break;
      }
      case 'crouch':
        // Before a jump (no floor any more) or after landing.
        if (cat.t >= cat.dur) cat.floor ? decide() : setState('air');
        break;
      case 'air': {
        const fl = cat.flight;
        [cat.x, cat.y] = along(fl, Math.min(cat.t, fl.time));
        if (cat.t >= fl.time) land(fl.onto);
        break;
      }
      case 'wallhop': {
        const k = clamp((cat.t - WIND_UP) / HOP_TIME, 0, 1);
        const sink = cat.t < WIND_UP ? px / dpr : 0; // one sprite pixel
        cat.y = cat.hopFrom + (cat.hopTo - cat.hopFrom) * (1 - (1 - k) * (1 - k)) + sink;
        if (cat.t >= cat.dur) {
          // Now and then it thinks better of it and slides back down to where it started.
          // Lazier cats give up more often.
          if (Math.random() < 0.05 / cat.energy) {
            cat.dest = cat.origin;
            cat.vy = 0;
            setState('slide');
          } else {
            wallStep();
          }
        }
        break;
      }
      case 'slide':
        // Claws on the wall: picks up speed, but never free-falls.
        cat.vy = Math.min(cat.vy + 500 * dt, 230);
        cat.y += cat.vy * dt;
        if (cat.y >= cat.dest.y) {
          cat.y = cat.dest.y;
          arrive();
        }
        break;
    }
  }

  function updateEmotions(dt) {
    for (const z of emotions) {
      z.t += dt;
      z.y -= 12 * dt;
    }
    emotions = emotions.filter((z) => z.t < 2.4);
  }

  let emotionTime = 0;
  function spawnEmotions(dt) {
    if (!shown) return;
    emotionTime += dt;
    if (emotionTime < 0.5) return;
    emotionTime = 0;
    for (const c of cats) {
      if (c.state === 'sleep') {
        if (Math.random() < 0.25) spawnEmotion('z', c);
      } else if (asking(c)) {
        if (Math.random() < (starving(c) ? 1 / 6 : 1 / 18)) spawnEmotion('fish', c);
      }
    }
  }

  // ---- drawing -----------------------------------------------------------

  const cycle = (frames, fps) => frames[Math.floor(cat.t * fps) % frames.length];

  function frameName() {
    switch (cat.state) {
      case 'walk':
        // Legs move faster when trotting.
        return cycle(['walkA', 'walkB', 'walkA', 'walkD'], (7 * cat.speed) / WALK_SPEED);
      case 'wallhop':
        // Gathered in, pushing off, reaching to grab; then holding on, tail swishing.
        if (cat.t < WIND_UP) return 'climbPull';
        if (cat.t < WIND_UP + HOP_TIME / 2) return 'climbPush';
        if (cat.t < WIND_UP + HOP_TIME) return 'climbReach';
        return cycle(['climbReach', 'climbTail'], 3);
      case 'slide':
        return 'climbPull'; // paws gathered in, braking
      case 'sleep':
        return cycle(['sleep1', 'sleep2'], 1.1);
      case 'crouch':
        return 'crouch';
      case 'eat': {
        // A sniff, then bite after bite: munching, a tug; every third bite the tail flicks.
        if (cat.t < SNIFF) return 'eatDown';
        const n = (cat.t - SNIFF) / CHEW;
        if (n % 1 > 0.6) return 'eatTug';
        return Math.floor(n) % 3 === 1 ? 'eatTail' : 'eatChew';
      }
      case 'air':
        return cat.flight.vy + GRAVITY * cat.t < 0 ? 'leap' : 'walkA';
      default:
        if (cat.t % 4 > 3.85) return 'sitBlink';
        return Math.floor(cat.t * 2) % 6 === 0 ? 'sitTail' : 'sit';
    }
  }

  const Z = ['KKKK', '..K.', '.K..', 'KKKK'];
  const HEART = ['KK.KK', 'KKKKK', '.KKK.', '..K..'];

  // Fish: tumbling through the air (in quarter turns, which keeps the pixels crisp), then
  // flopping about (see flop); off the end of the floor it tumbles away. Being eaten, it
  // loses a chunk with each tug, from the cat's end; pushed out by newer fish, it fades away.
  function drawFish() {
    for (const g of fishes) {
      const since = g.t - g.flopFrom; // into the current flop
      const flopping = landed(g) && !g.eater && !g.falling && since < g.flopTime;
      const tumbling = !landed(g) || g.falling;
      const wiggle = tumbling || flopping ? Math.floor(g.t * 12) % 2 : 0;
      const img = sprites.orange[wiggle ? 'fishB' : 'fishA'];
      const bites = g.eater ? clamp(Math.floor((g.eater.t - SNIFF) / CHEW + 0.4), 0, BITES) : 0;
      const cols = img.width / px;
      const cut = Math.min(cols - 1, Math.round((cols * bites) / BITES)) * px;
      const turn = tumbling ? (Math.floor(g.t * 8) % 4) * (g.vx < 0 ? -1 : 1) : 0;
      const lift = flopping ? Math.sin((Math.PI * since) / g.flopTime) * g.flopHeight : 0;
      const facing = (g.vx < 0 ? -1 : 1) * (g.flips % 2 ? -1 : 1);
      ctx.globalAlpha = g.fade ? 1 - g.fade / FADE_TIME : 1;
      ctx.save();
      ctx.translate(Math.round(g.x * dpr), Math.round((g.y - lift) * dpr - img.height / 2));
      ctx.rotate((turn * Math.PI) / 2);
      if (!tumbling && facing < 0) ctx.scale(-1, 1);
      // The bitten-off end is the one towards the cat, in the fish's own (maybe flipped) frame.
      const sx = g.eater && g.eater.dir * (facing < 0 ? -1 : 1) > 0 ? cut : 0;
      const w = img.width - cut;
      ctx.drawImage(img, sx, 0, w, img.height, sx - Math.round(img.width / 2), -Math.round(img.height / 2), w, img.height);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  // Debug overlay: the floors (teal) and walls (orange) the cats get around on.
  function drawDebug() {
    const t = Math.max(2, Math.round(2 * dpr));
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = '#ff9f1c';
    for (const w of walls) {
      ctx.fillRect(Math.round(w.x * dpr) - t / 2, Math.round(w.y1 * dpr), t, Math.round((w.y2 - w.y1) * dpr));
    }
    ctx.fillStyle = '#2ec4b6';
    for (const f of floors) {
      ctx.fillRect(Math.round(f.x1 * dpr), Math.round(f.y * dpr) - t, Math.round((f.x2 - f.x1) * dpr), t);
    }
    ctx.globalAlpha = 1;
  }

  // Everything is drawn in device pixels so the sprite stays crisp at any zoom level.
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!shown) return;
    if (debug) drawDebug();
    drawFish();
    for (const c of cats) {
      cat = c;
      drawCat();
      if (debug) drawMeters();
    }
    drawEmotions();
  }

  // Debug: bars under the cat. Hunger: teal = full, orange = would eat, red = asking.
  function drawMeters() {
    const t = Math.max(2, Math.round(2 * dpr));
    const w = Math.round(catW() * 0.6 * dpr);
    const x = Math.round((onWall() ? cat.wall.x : cat.x) * dpr - w / 2);
    const y = Math.round((cat.y + 3) * dpr);
    const bars = [
      [hunger(cat), asking(cat) ? '#e63946' : canEat(cat) ? '#ff9f1c' : '#2ec4b6'],
      [cat.trust, SP.palette.P],
    ];
    bars.forEach(([value, color], i) => {
      const by = y + i * 2 * t;
      ctx.fillStyle = ink;
      ctx.globalAlpha = 0.35;
      ctx.fillRect(x, by, w, t);
      ctx.globalAlpha = 1;
      ctx.fillStyle = color;
      ctx.fillRect(x, by, Math.round(w * value), t);
    });
  }

  function drawCat() {
    const img = sprites[cat.coat][frameName()];
    const w = img.width;
    const h = img.height;
    // On a wall: seen from behind, hugging the border, centred on the wall line.
    const cx = Math.round((onWall() ? cat.wall.x : cat.x) * dpr);
    const cy = Math.round((cat.y - (onWall() ? h / dpr : catH()) / 2) * dpr);
    ctx.save();
    ctx.translate(cx, cy);
    if (!onWall() && cat.dir < 0) ctx.scale(-1, 1);
    ctx.drawImage(img, -w / 2, -h / 2);
    ctx.restore();
  }

  // Cat emotions: sleep, affection, and food requests.
  function drawEmotions() {
    const zp = Math.max(1, px - Math.round(dpr));
    for (const z of emotions) {
      ctx.fillStyle = z.kind === 'heart' ? SP.palette.P : ink;
      ctx.globalAlpha = 0.8 * (1 - z.t / 2.4);
      const zx = Math.round((z.x + Math.sin(z.t * 3) * 3) * dpr) - (z.kind === 'fish' ? 5 * zp : 0); // centred
      const zy = Math.round(z.y * dpr);
      const rows = z.kind === 'fish' ? SP.frames.fishA : z.kind === 'heart' ? HEART : Z;
      rows.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) {
          const c = z.dir < 0 ? row[row.length - 1 - x] : row[x];
          if (c === '.') continue;
          if (z.kind === 'fish') ctx.fillStyle = SP.palette[c];
          ctx.fillRect(zx + x * zp, zy + y * zp, zp, zp);
        }
      });
    }
    ctx.globalAlpha = 1;
  }

  // ---- wiring ------------------------------------------------------------

  // While any cats are out, the extension shows its 🐟 in the status bar, labelled (for
  // screen readers, as aria-label) "Pixel Cat: throw a fish to Jexit, Erik", plus
  // " (debug)" in debug mode. No such item means: no cats.
  const LABEL = 'Pixel Cat: throw a fish to ';
  function statusLabel() {
    const item = document.querySelector(`.part.statusbar .statusbar-item[aria-label^="${LABEL}"]`);
    return (item && item.getAttribute('aria-label')) || '';
  }

  // Each cat is a Web Lock shared by all VS Code windows: the window holding it has the cat,
  // until it walks out (or the window closes). Then the next window in line gets it.
  function roam(def) {
    if (!navigator.locks) return spawn(def, () => {});
    const visit = () => new Promise((done) => spawn(def, done));
    navigator.locks.request(`pixelCat.cat.${def.name}`, visit).then(() => roam(def));
  }

  // Walked out of the window: saved for whichever window gets it next (maybe this one).
  function leave() {
    save();
    cats = cats.filter((c) => c !== cat);
    cat.done();
  }

  let roaming = false;
  function poll() {
    const label = statusLabel();
    debug = label.includes(' (debug)');
    carePanelOpen = debug;
    const allowed = !!label;
    if (allowed !== shown) console.info(`[pixel-cat] ${allowed ? 'showing' : 'hiding'} the cats`);
    if (allowed && !shown) {
      ink = getComputedStyle(document.querySelector('.monaco-workbench') || document.body)
        .getPropertyValue('--vscode-foreground')
        .trim() || '#888';
    }
    shown = allowed;
    if (!shown) return drawCarePanel();
    relayout();
    if (!roaming) {
      roaming = true;
      CATS.forEach(roam);
    }
    save();
    drawCarePanel();
  }

  let last = 0;
  function frame(now) {
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0);
    last = now;
    if (shown) {
      for (const c of cats) {
        cat = c;
        update(dt);
      }
      updateFish(dt);
      spawnEmotions(dt);
    }
    updateEmotions(dt);
    draw();
    requestAnimationFrame(frame);
  }

  function start() {
    if (!document.querySelector('.monaco-workbench .part.statusbar')) {
      setTimeout(start, 500);
      return;
    }
    console.info('[pixel-cat] started');
    createOverlay();
    resize();
    window.addEventListener('resize', resize);
    // The 🐟 the extension shows in the status bar: throw a fish from where it is. (In debug
    // mode, modifier+clicks change the cats' meal deadline and trust instead; see hunger.)
    document.addEventListener(
      'click',
      (e) => {
        const item = e.target instanceof Element && e.target.closest('.statusbar-item');
        if (!shown || !item || !(item.textContent || '').includes('🐟')) return;
        if (debug && (e.ctrlKey || e.altKey || e.shiftKey)) {
          for (const c of cats) {
            if (e.ctrlKey) c.trust = clamp(c.trust + (e.shiftKey ? -0.1 : 0.1), 0, 1);
            else c.nextMealAt = clamp(c.nextMealAt + (e.altKey ? -6 : 6) * HOUR, Date.now(), Date.now() + NEXT_MEAL_AFTER);
          }
          save();
          return;
        }
        const r = item.getBoundingClientRect();
        throwFish(r.left + r.width / 2, r.top);
      },
      true
    );
    setInterval(poll, 700);
    requestAnimationFrame(frame);
  }

  start();
})();
