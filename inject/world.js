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

  // The cats, from inject/cats.json (passed in by the extension). While a cat is out, the
  // extension shows its marker in the status bar. Personality: sleep = how readily it naps,
  // nap = how long, energy = how readily it trots and jumps (below 0.5 it also walks less).
  // Likes: how much it likes other cats (1 = a lot).
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
  /** @type {{x: number, y: number, t: number}[]} */
  let zs = [];
  /** @type {any[]} */
  let cats = [];
  /** @type {any} */
  let cat = null; // the cat currently being updated or drawn; the behaviour code acts on it
  let shown = false;
  let debug = false; // 🐞 in the status bar: the floors and walls are drawn
  let ink = '#888';

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
      const f = cat.floor && floors.find((g) => Math.abs(g.y - cat.y) <= EDGE && touches(g, cat.x));
      cat.route = null; // the wall it was walking to may have moved
      if (f) {
        cat.floor = f;
        if (cat.state === 'walk') cat.tx = clamp(cat.tx, ...range(f));
        continue;
      }
      if (onWall()) cat.x = clamp(cat.wall.x, halfW(), W - halfW());
      fall();
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

  // A cat comes out: it walks in along the bottom.
  function spawn(def) {
    cat = { x: 0, y: 0, vy: 0, dir: 1, state: 'walk', t: 0, dur: 0, floor: null, ...def };
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

  // Every move through the air is a fixed arc from where the cat is to (tx, ty), so it
  // always lands exactly there, on floor `onto`.
  function fly(tx, ty, lift, onto) {
    const apex = Math.min(cat.y, ty) - lift;
    const vy = -Math.sqrt(2 * GRAVITY * (cat.y - apex));
    const time = Math.max(0.05, -vy / GRAVITY + Math.sqrt((2 * (ty - apex)) / GRAVITY));
    cat.flight = { x0: cat.x, y0: cat.y, vx: (tx - cat.x) / time, vy, time, onto };
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
    const along = (w, g) => w.y1 - catH() <= g.y && g.y <= w.y2 + catH() && touches(g, w.x);
    for (const w of walls) {
      if (!along(w, floor) || w.x < halfW() || w.x > W - halfW() || Math.abs(w.x - x) > MAX_GAP) continue;
      const dests = floors.filter((g) => Math.abs(g.y - y) > EDGE && along(w, g));
      if (dests.length) options.push({ tx: clamp(w.x, ...range(floor)), wall: w, dest: any(dests) });
    }
    return options;
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

  // How much this cat likes another (0 = not at all).
  const feeling = (other) => (cat.likes && cat.likes[other.name]) || 0;

  // Pick the next thing to do on a floor, in keeping with the cat's personality. Now and
  // then it curls up next to a friend sleeping on the same floor.
  function decide() {
    const f = cat.floor;
    const p = cat.personality;
    const [lo, hi] = range(f);
    if (cat.napNext) {
      // Walked over to the sleeping friend (so it faces it): curl up.
      cat.napNext = false;
      return setState('sleep', rand(12, 35) * p.nap);
    }
    if (cat.route) {
      // Walked over to the wall: up or down it goes.
      const o = cat.route;
      cat.route = null;
      return climb(o);
    }
    const friend = cats.find((c) => c !== cat && c.floor === f && c.state === 'sleep' && feeling(c) > 0);
    const options = reachable();
    const choice = pick([
      ['sit', 22],
      ['walk', 32 * Math.min(1, p.energy * 2)], // only really lazy cats walk less
      ['sleep', (f.y > H - 60 ? 22 : 5) * p.sleep], // its favourite bed is the status bar
      ['jump', options.length ? 35 * p.energy : 0],
      ['snuggle', friend ? 15 * feeling(friend) : 0],
    ]);
    switch (choice) {
      case 'sit':
        return setState('sit', rand(2, 7));
      case 'sleep':
        return setState('sleep', rand(12, 35) * p.nap);
      case 'walk': {
        const trot = Math.random() < 0.2 * p.energy;
        return walkTo(clamp(cat.x + rand(-250, 250), lo, hi), WALK_SPEED * (trot ? 3 : 1));
      }
      case 'jump': {
        const o = any(options);
        if (!o.wall) return jumpTo(o);
        cat.route = o;
        return walkTo(o.tx, WALK_SPEED);
      }
      case 'snuggle':
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
      case 'sleep':
        if (Math.floor((cat.t - dt) / 1.6) !== Math.floor(cat.t / 1.6)) {
          zs.push({ x: cat.x + cat.dir * 7 * (px / dpr), y: cat.y - 9 * (px / dpr), t: 0 });
        }
        if (cat.t >= cat.dur) setState('sit', rand(1, 3));
        break;
      case 'walk': {
        const step = cat.speed * dt;
        if (Math.abs(cat.tx - cat.x) <= step) {
          cat.x = cat.tx;
          decide();
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
        const t = Math.min(cat.t, fl.time);
        cat.x = fl.x0 + fl.vx * t;
        cat.y = fl.y0 + fl.vy * t + (GRAVITY * t * t) / 2;
        if (cat.t >= fl.time) land(fl.onto);
        break;
      }
      case 'wallhop': {
        const k = clamp((cat.t - WIND_UP) / HOP_TIME, 0, 1);
        const sink = cat.t < WIND_UP ? px / dpr : 0; // one sprite pixel
        cat.y = cat.hopFrom + (cat.hopTo - cat.hopFrom) * (1 - (1 - k) * (1 - k)) + sink;
        if (cat.t >= cat.dur) wallStep();
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

  function updateZs(dt) {
    for (const z of zs) {
      z.t += dt;
      z.y -= 12 * dt;
    }
    zs = zs.filter((z) => z.t < 2.4);
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
      case 'air':
        return cat.flight.vy + GRAVITY * cat.t < 0 ? 'leap' : 'walkA';
      default:
        if (cat.t % 4 > 3.85) return 'sitBlink';
        return Math.floor(cat.t * 2) % 6 === 0 ? 'sitTail' : 'sit';
    }
  }

  const Z = ['KKKK', '..K.', '.K..', 'KKKK'];

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
    if (!shown || !cats.length) return;
    if (debug) drawDebug();
    for (const c of cats) {
      cat = c;
      drawCat();
    }
    drawZs();
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

  // Floating Zs over sleeping cats.
  function drawZs() {
    const zp = Math.max(1, px - Math.round(dpr));
    ctx.fillStyle = ink;
    for (const z of zs) {
      ctx.globalAlpha = 0.8 * (1 - z.t / 2.4);
      const zx = Math.round((z.x + Math.sin(z.t * 3) * 3) * dpr);
      const zy = Math.round(z.y * dpr);
      Z.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) {
          if (row[x] === 'K') ctx.fillRect(zx + x * zp, zy + y * zp, zp, zp);
        }
      });
    }
    ctx.globalAlpha = 1;
  }

  // ---- wiring ------------------------------------------------------------

  // The extension shows each cat's marker in the status bar while that cat is out (and the
  // extension is enabled), plus a 🐞 in debug mode. No markers means: no cats.
  function statusText() {
    const bar = document.querySelector('.part.statusbar');
    return (bar && bar.textContent) || '';
  }

  // Which cats are out. Erik's 🐈‍⬛ contains Jexit's 🐈, so longer markers are matched (and
  // removed) first.
  function catsOut(text) {
    const out = new Set();
    let rest = text;
    for (const def of [...CATS].sort((a, b) => b.marker.length - a.marker.length)) {
      if (rest.includes(def.marker)) out.add(def.name);
      rest = rest.split(def.marker).join('');
    }
    return out;
  }

  function poll() {
    const text = statusText();
    const out = catsOut(text);
    const allowed = out.size > 0;
    debug = text.includes('🐞');
    if (allowed !== shown) console.info(`[pixel-cat] ${allowed ? 'showing' : 'hiding'} the cats`);
    if (allowed && !shown) {
      ink = getComputedStyle(document.querySelector('.monaco-workbench') || document.body)
        .getPropertyValue('--vscode-foreground')
        .trim() || '#888';
    }
    shown = allowed;
    if (!shown) return;
    relayout();
    cats = cats.filter((c) => out.has(c.name));
    for (const def of CATS) if (out.has(def.name) && !cats.some((c) => c.name === def.name)) spawn(def);
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
    }
    updateZs(dt);
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
    setInterval(poll, 700);
    requestAnimationFrame(frame);
  }

  start();
})();
