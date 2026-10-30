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
  const WALK_SPEED = 40;
  const RUN_SPEED = 130;
  const MAX_RISE = 170; // highest ledge it will jump up to
  const MAX_GAP = 220; // widest gap it will jump across
  const MAX_DROP = 200; // deepest it will jump down; further down it slides down a wall
  const EDGE = 3; // tolerance when matching edges, px

  // The cats, from inject/cats.json (passed in by the extension). While a cat is out, the
  // extension shows its marker in the status bar. Personality: sleep = how readily it naps,
  // nap = how long, energy = how readily it runs, jumps and climbs (below 0.5 it also walks
  // less). Likes: how much it likes other
  // cats, 1 = a lot, negative = can't stand them.
  const CATS = (window.PixelCatConfig && window.PixelCatConfig.cats) || [];

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
  // Title strips whose bottom edge is a ledge too: editor tab bars, sidebar and panel headers.
  const LEDGES = [
    '.part.editor .editor-group-container > .title',
    '.part.sidebar > .title',
    '.part.auxiliarybar > .title',
    '.part.panel > .title',
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
  let debug = false; // 🐞 in the status bar: time runs faster and the layout is drawn
  const DEBUG_SPEED = 5;
  let ink = '#888';
  /** @type {number[] | null} */
  let dirty = null; // device-pixel box drawn last frame

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
    dirty = null;
    layoutKey = '';
    relayout();
  }

  // ---- reading the workbench layout -------------------------------------

  function scan() {
    const rectsOf = (selectors) => {
      const rects = [];
      for (const sel of selectors) {
        for (const el of document.querySelectorAll(sel)) {
          const r = el.getBoundingClientRect();
          if (r.width > 4 && r.height > 4) rects.push(r);
        }
      }
      return rects;
    };

    let fs = [];
    let ws = [];
    // Floors need room for the cat above them (its ear tips may poke past the window top)
    // and enough width to stand on.
    const addFloor = (r, y) => {
      if (y >= catH() * 0.8 && r.width >= catW() * 0.6) {
        fs.push({ x1: Math.round(r.left), x2: Math.round(r.right), y: Math.round(y) });
      }
    };
    for (const r of rectsOf(PARTS)) {
      addFloor(r, r.top);
      ws.push({ x: Math.round(r.left), y1: Math.round(r.top), y2: Math.round(r.bottom) });
      ws.push({ x: Math.round(r.right), y1: Math.round(r.top), y2: Math.round(r.bottom) });
    }
    for (const r of rectsOf(LEDGES)) addFloor(r, r.bottom);
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

  function relayout() {
    const next = scan();
    const key = JSON.stringify(next);
    if (key === layoutKey) return;
    layoutKey = key;
    floors = next.floors;
    walls = next.walls;
    for (const c of cats) {
      cat = c;
      reattach();
    }
  }

  const onWall = () => cat.state === 'wallhop' || cat.state === 'cling' || cat.state === 'slide';

  // Re-find what the cat was standing on (or clinging to) after the layout moved.
  function reattach() {
    if (cat.state === 'air') return;
    if (onWall()) {
      const w = walls.find((w) => Math.abs(w.x - cat.wall.x) <= EDGE && w.y1 - EDGE <= cat.y && cat.y <= w.y2 + EDGE);
      if (w) cat.wall = w;
      else leapOffWall();
      return;
    }
    const f = floors.find((f) => Math.abs(f.y - cat.y) <= EDGE && touches(f, cat.x));
    if (!f) return fall(0, 0);
    cat.floor = f;
    if (cat.state === 'walk' || cat.state === 'run') decide();
  }

  // ---- behaviour ---------------------------------------------------------

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
    cat = { x: 0, y: 0, vx: 0, vy: 0, dir: 1, state: 'walk', t: 0, dur: 0, floor: null, ...def };
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
    walkTo(rand(lo, hi), 'walk');
  }

  function walkTo(tx, mode) {
    cat.tx = tx;
    cat.dir = tx >= cat.x ? 1 : -1;
    setState(mode);
  }

  function fall(vx, vy) {
    cat.vx = vx;
    cat.vy = vy;
    cat.floor = null;
    cat.grab = null;
    cat.targetY = -Infinity; // a free fall lands on the first floor below
    setState('air');
  }

  // Ballistic arc that lands exactly on (tx, ty).
  function arc(tx, ty, lift) {
    const apex = Math.min(cat.y, ty) - lift;
    const vy = -Math.sqrt(2 * GRAVITY * (cat.y - apex));
    const time = -vy / GRAVITY + Math.sqrt((2 * (ty - apex)) / GRAVITY);
    return { vx: (tx - cat.x) / time, vy };
  }

  function launch(tx, ty) {
    cat.launch = { ...arc(tx, ty, rand(20, 40)), ty };
    cat.dir = tx >= cat.x ? 1 : -1;
    setState('crouch', 0.16);
  }

  function land(f) {
    cat.grab = null;
    cat.y = f.y;
    cat.floor = f;
    cat.vx = cat.vy = 0;
    setState('land', 0.14);
  }

  // ---- getting around ----------------------------------------------------------------
  //
  // One rule: wherever the cat is, on a floor or on a wall, it looks at what is within jump
  // range (floors to land on, walls to grab) and may jump to one of them. On a wall it can
  // also leap higher up that wall or slide down it. A cat that jumped onto a wall from
  // above always slides down.

  const WALL_LEAP = 80; // one leap up a wall
  const feetRange = (w) => [w.y1 + catW(), w.y2]; // where the cat's feet can be on a wall

  // The heights on wall w the cat can grab when jumping from height y, or null.
  function grabRange(w, y) {
    const [lo, hi] = feetRange(w);
    const top = Math.max(lo, y - MAX_RISE * 0.9);
    const bottom = Math.min(hi, y + MAX_DROP * 0.5);
    return top <= bottom ? [top, bottom] : null;
  }

  // Everything within jump range of (x, y). `away` is the side a cat on a wall pushes off
  // towards (it can't jump through the wall it holds); 0 on a floor.
  function inReach(x, y, { floor = null, wall = null, away = 0 } = {}) {
    const options = [];
    for (const f of floors) {
      const [lo, hi] = range(f);
      if (f === floor || hi - lo < 4 || Math.abs(f.y - y) <= EDGE) continue;
      if (y - f.y > MAX_RISE || f.y - y > MAX_DROP) continue;
      const tx = away > 0 ? clamp(Math.max(lo, x) + rand(10, 60), lo, hi)
        : away < 0 ? clamp(Math.min(hi, x) - rand(10, 60), lo, hi)
        : clamp(x + rand(-80, 80), lo, hi);
      if (Math.abs(tx - x) > MAX_GAP || (tx - x) * away < 0) continue;
      options.push({ tx, ty: f.y });
    }
    for (const w of walls) {
      if (w === wall || (w.x - x) * away < 0) continue;
      const s = x >= w.x ? 1 : -1; // the side of the wall the cat jumps from
      const contact = w.x + s * halfW(); // its centre while holding the wall
      if (contact < halfW() - EDGE || contact > W - halfW() + EDGE || Math.abs(contact - x) > MAX_GAP) continue;
      const r = grabRange(w, y);
      if (r) options.push({ tx: contact, ty: rand(r[0], r[1]), wall: w, side: s > 0 ? 'left' : 'right' });
    }
    return options;
  }

  // What the cat can reach from where it is now.
  function reachable() {
    if (!onWall()) return inReach(cat.x, cat.y, { floor: cat.floor });
    const away = cat.side === 'left' ? 1 : -1;
    return inReach(cat.wall.x + away * halfW(), cat.y, { wall: cat.wall, away });
  }

  // Jump to a floor or onto a wall.
  function jumpTo(o) {
    const fromWall = onWall();
    if (fromWall) {
      const away = cat.side === 'left' ? 1 : -1;
      cat.x = clamp(cat.wall.x + away * halfW(), halfW(), W - halfW());
    }
    const dir = o.wall ? (o.side === 'left' ? -1 : 1) : o.tx >= cat.x ? 1 : -1;
    cat.dir = dir;
    cat.headingUp = o.ty < cat.y;
    cat.grab = o.wall ? { wall: o.wall, side: o.side, tx: o.tx, dir } : null;
    cat.launch = { ...arc(o.tx, o.ty, rand(15, 35)), ty: o.ty };
    cat.floor = null;
    if (!fromWall) return setState('crouch', 0.16);
    cat.vx = cat.launch.vx;
    cat.vy = cat.launch.vy;
    cat.targetY = o.ty;
    setState('air');
  }

  function attach(w, side, y) {
    const [lo, hi] = feetRange(w);
    cat.wall = w;
    cat.side = side; // the wall is on the cat's left or right
    cat.y = clamp(y, lo, hi);
    cat.floor = null;
    cat.grab = null;
    cat.vx = cat.vy = 0;
    setState('cling', holdOn());
  }

  // How long the cat holds still on the wall before its next move, looking around.
  // Debug mode fast-forwards time, so stretch the pause there to keep it visible.
  const holdOn = () => rand(0.4, 0.7) * (debug ? DEBUG_SPEED : 1);

  // On the wall. Came down onto it from above: slide down. Came up onto it: leap higher,
  // jump to something above in reach, now and then something else in reach, or (rarely)
  // slide down.
  function wallDecide() {
    if (!cat.headingUp) return startSlide();
    const lo = feetRange(cat.wall)[0];
    const options = reachable();
    const above = options.filter((o) => o.ty < cat.y);
    const choice = pick([
      ['leap', cat.y - lo > WALL_LEAP * 0.4 ? 6 : 0],
      ['jumpUp', above.length ? 6 : 0],
      ['jump', options.length ? 0.3 : 0],
      ['slide', 0.4],
    ]);
    if (choice === 'leap') {
      cat.hopFrom = cat.y;
      cat.hopTo = Math.max(lo, cat.y - WALL_LEAP);
      return setState('wallhop', 0.35);
    }
    if (choice === 'jumpUp') return jumpTo(any(above));
    if (choice === 'jump') return jumpTo(any(options));
    startSlide();
  }

  // Slide down to just above the floor below the cat, then hop onto it.
  function startSlide() {
    const w = cat.wall;
    const below = floors
      .filter((g) => g.y > cat.y + catH() * 0.5 && g.y <= w.y2 + catH() && touches(g, w.x))
      .sort((a, b) => a.y - b.y)[0];
    cat.slideFloor = below || null;
    cat.slideTo = below ? Math.max(cat.y, below.y - rand(15, 30)) : w.y2;
    cat.vy = 0;
    setState('slide');
  }

  function endSlide() {
    const w = cat.wall;
    const g = cat.slideFloor && floors.find((f) => Math.abs(f.y - cat.slideFloor.y) <= EDGE && touches(f, w.x));
    let away = cat.side === 'left' ? 1 : -1;
    if (g && (away > 0 ? g.x2 <= w.x + halfW() : g.x1 >= w.x - halfW())) away = -away;
    cat.dir = away;
    cat.x = clamp(w.x + away * halfW(), halfW(), W - halfW());
    if (!g) return fall(away * 60, 0);
    const [lo, hi] = range(g);
    const tx = clamp(cat.x + away * rand(10, 40), lo, hi);
    const { vx, vy } = arc(tx, g.y, rand(8, 16)); // a small hop onto the floor
    cat.floor = null;
    cat.vx = vx;
    cat.vy = vy;
    cat.targetY = g.y;
    setState('air');
  }

  // Fallback when the layout changed under the cat: push off and land wherever.
  function leapOffWall() {
    const away = cat.side === 'left' ? 1 : -1;
    cat.dir = away;
    cat.x = clamp(cat.wall.x + away * halfW(), halfW(), W - halfW());
    fall(away * rand(90, 170), -rand(150, 320));
  }

  // How much this cat likes another (0 = indifferent, negative = can't stand it).
  const feeling = (other) => (cat.likes && cat.likes[other.name]) || 0;

  // Pick the next thing to do on a floor, in keeping with the cat's personality and who
  // else is around.
  function decide() {
    const f = cat.floor;
    const p = cat.personality;
    const [lo, hi] = range(f);
    // Its favourite cat that's out, and the nearest cat it can't stand on this floor.
    const friend = cats.filter((c) => c !== cat && feeling(c) > 0).sort((a, b) => feeling(b) - feeling(a))[0];
    const love = friend ? feeling(friend) : 0;
    const near = friend && friend.floor === f; // the friend is on the same floor
    const foe = cats.find((c) => c !== cat && feeling(c) < 0 && c.floor === f && Math.abs(c.x - cat.x) < 200);
    if (cat.napNext) {
      // Walked over to the sleeping friend: curl up facing it.
      cat.napNext = false;
      if (near) cat.dir = friend.x > cat.x ? 1 : -1;
      return setState('sleep', rand(12, 35) * p.nap);
    }
    if (near && Math.abs(friend.x - cat.x) < catW() * 1.5 && Math.random() < 0.3 * love) mark('heart');
    if (foe && Math.random() < 0.5) mark('angry');
    const options = reachable();
    // Away from its friend, a cat is keener to go looking than to nap alone.
    const missing = friend && !near ? 1 + love : 1;
    const choice = pick([
      ['sit', 22],
      ['walk', 26 * Math.min(1, p.energy * 2)], // only really lazy cats walk less
      ['run', 6 * p.energy],
      ['sleep', ((f.y > H - 60 ? 22 : 5) * p.sleep) / missing], // its favourite bed is the status bar
      ['jump', options.length ? 35 * p.energy * missing : 0],
      ['snuggle', near && friend.state === 'sleep' ? 60 * love : 0],
      ['avoid', foe ? 80 * -feeling(foe) : 0],
    ]);
    switch (choice) {
      case 'sit':
        return setState('sit', rand(2, 7));
      case 'sleep':
        return setState('sleep', rand(12, 35) * p.nap);
      case 'walk': {
        const tx = near && Math.random() < 0.7 * love ? friend.x + rand(-60, 60) : cat.x + rand(-250, 250);
        return walkTo(clamp(tx, lo, hi), 'walk');
      }
      case 'run':
        return walkTo(any([lo, hi]), 'run');
      case 'jump':
        return jumpTo(friend ? towards(friend, options, 1) : any(options));
      case 'snuggle':
        cat.napNext = true;
        return walkTo(clamp(friend.x + (cat.x < friend.x ? -1 : 1) * catW() * 0.9, lo, hi), 'walk');
      case 'avoid':
        // Get away: jump somewhere far from the foe, or run off along the floor.
        if (options.length && Math.random() < 0.5) return jumpTo(towards(foe, options, -1));
        return walkTo(clamp(cat.x + Math.sign(cat.x - foe.x || 1) * rand(200, 400), lo, hi), 'run');
    }
  }

  // A jump option, preferring the ones that land close to (sign 1) or far from (sign -1)
  // another cat.
  function towards(other, options, sign) {
    return pick(options.map((o) => {
      const d = Math.hypot(o.tx - other.x, o.ty - other.y) / 100;
      return [o, sign > 0 ? 1 / (1 + d) ** 3 : (1 + d) ** 2];
    }));
  }

  // A heart or an angry mark floating up from the cat.
  function mark(kind) {
    zs.push({ x: cat.x - 2 * (px / dpr), y: cat.y - SP.height * (px / dpr) - 4, t: 0, kind });
  }

  function update(dt) {
    cat.t += dt;
    switch (cat.state) {
      case 'sit':
      case 'land':
        if (cat.t >= cat.dur) decide();
        break;
      case 'sleep':
        if (Math.floor((cat.t - dt) / 1.6) !== Math.floor(cat.t / 1.6)) {
          zs.push({ x: cat.x + cat.dir * 7 * (px / dpr), y: cat.y - 9 * (px / dpr), t: 0 });
        }
        if (cat.t >= cat.dur) setState('sit', rand(1, 3));
        break;
      case 'walk':
      case 'run': {
        const step = (cat.state === 'run' ? RUN_SPEED : WALK_SPEED) * dt;
        if (Math.abs(cat.tx - cat.x) <= step) {
          cat.x = cat.tx;
          decide();
        } else {
          cat.x += cat.dir * step;
        }
        break;
      }
      case 'crouch':
        if (cat.t >= cat.dur) {
          cat.vx = cat.launch.vx;
          cat.vy = cat.launch.vy;
          cat.floor = null;
          // An aimed jump passes floors above its target, e.g. down from a panel's top
          // edge onto the tab bar below it.
          cat.targetY = cat.launch.ty;
          setState('air');
        }
        break;
      case 'air': {
        const prevY = cat.y;
        cat.vy += GRAVITY * dt;
        cat.x += cat.vx * dt;
        cat.y += cat.vy * dt;
        // Leaping at a wall: grab it on reaching it.
        const g = cat.grab;
        if (g && (cat.x - g.tx) * g.dir >= 0) {
          return attach(g.wall, g.side, cat.y);
        }
        if (cat.x < halfW() || cat.x > W - halfW()) {
          cat.x = clamp(cat.x, halfW(), Math.max(halfW(), W - halfW()));
          cat.vx = 0;
          if (g) return attach(g.wall, g.side, cat.y);
        }
        if (cat.vy > 0) {
          const f = floors.find(
            (f) => f.y >= cat.targetY - EDGE && prevY <= f.y && cat.y >= f.y && cat.x >= f.x1 && cat.x <= f.x2
          );
          if (f) land(f);
          else if (cat.y > H + 100) walkIn();
        }
        break;
      }
      case 'wallhop': {
        // A quick spring up the wall that eases out at the top.
        const k = Math.min(1, cat.t / cat.dur);
        cat.y = cat.hopFrom + (cat.hopTo - cat.hopFrom) * (1 - (1 - k) * (1 - k));
        if (k >= 1) setState('cling', holdOn());
        break;
      }
      case 'slide':
        // Claws on the wall: picks up speed, but never free-falls.
        cat.vy = Math.min(cat.vy + 500 * dt, 230);
        cat.y += cat.vy * dt;
        if (cat.y >= cat.slideTo) {
          cat.y = cat.slideTo;
          endSlide();
        }
        break;
      case 'cling':
        if (cat.t >= cat.dur) wallDecide();
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
        return cycle(['walkA', 'walkB', 'walkA', 'walkD'], 7);
      case 'run':
        return cycle(['walkB', 'walkA', 'walkD', 'walkA'], 14);
      case 'wallhop':
        return cat.t < cat.dur * 0.5 ? 'climbReach' : 'climbPull';
      case 'cling':
        return 'climbReach';
      case 'slide':
        return 'climbPull'; // paws gathered in, braking
      case 'sleep':
        return cycle(['sleep1', 'sleep2'], 1.1);
      case 'crouch':
      case 'land':
        return 'crouch';
      case 'air':
        return cat.vy < 0 ? 'leap' : 'walkA';
      default:
        if (cat.t % 4 > 3.85) return 'sitBlink';
        return Math.floor(cat.t * 2) % 6 === 0 ? 'sitTail' : 'sit';
    }
  }

  function grow(x, y, w, h) {
    const box = [Math.floor(x) - 1, Math.floor(y) - 1, Math.ceil(w) + 2, Math.ceil(h) + 2];
    if (!dirty) {
      dirty = box;
      return;
    }
    const x1 = Math.min(dirty[0], box[0]);
    const y1 = Math.min(dirty[1], box[1]);
    const x2 = Math.max(dirty[0] + dirty[2], box[0] + box[2]);
    const y2 = Math.max(dirty[1] + dirty[3], box[1] + box[3]);
    dirty = [x1, y1, x2 - x1, y2 - y1];
  }

  const Z = ['KKKK', '..K.', '.K..', 'KKKK'];
  const MARKS = {
    heart: { shape: ['KK.KK', 'KKKKK', '.KKK.', '..K..'], color: SP.palette.P },
    angry: { shape: ['K...K', '.K.K.', '..K..', '.K.K.', 'K...K'], color: '#e05050' },
  };

  // Debug overlay: what the cat thinks the room looks like.
  function drawDebug() {
    // Walls the cat can jump onto from some floor.
    const usable = new Set();
    for (const w of walls) {
      const near = (f) => Math.max(range(f)[0] - w.x, w.x - range(f)[1], 0) <= MAX_GAP + halfW();
      if (floors.some((f) => near(f) && grabRange(w, f.y))) usable.add(w);
    }
    const t = Math.max(2, Math.round(2 * dpr));
    ctx.globalAlpha = 0.85;
    for (const w of walls) {
      ctx.fillStyle = usable.has(w) ? '#ff9f1c' : '#888888';
      ctx.fillRect(Math.round(w.x * dpr) - t / 2, Math.round(w.y1 * dpr), t, Math.round((w.y2 - w.y1) * dpr));
    }
    ctx.fillStyle = '#2ec4b6';
    for (const f of floors) {
      ctx.fillRect(Math.round(f.x1 * dpr), Math.round(f.y * dpr) - t, Math.round((f.x2 - f.x1) * dpr), t);
    }
    ctx.globalAlpha = 1;

    const font = Math.round(11 * dpr);
    ctx.font = `${font}px monospace`;
    const legend = [
      [`Pixel Cat debug, time x${DEBUG_SPEED}`, ink],
      ['floors', '#2ec4b6'],
      ['walls in reach', '#ff9f1c'],
      ['walls out of reach', '#888888'],
    ];
    const lx = Math.round(W * dpr) - font * 18;
    const ly = Math.round(H * dpr * 0.35);
    legend.forEach(([text, color], i) => {
      ctx.fillStyle = color;
      ctx.fillText(text, lx, ly + i * font * 1.4);
    });
    ctx.fillStyle = ink;
    ctx.textAlign = 'center';
    for (const c of cats) {
      cat = c;
      const next = cat.grab ? 'grab wall' : cat.state === 'slide' ? 'floor below' : null;
      const label = `${cat.name}: ${next ? `${cat.state} → ${next}` : cat.state}`;
      const lxCat = Math.round((onWall() ? cat.wall.x : cat.x) * dpr);
      const lyCat = Math.round((cat.y - (onWall() ? catW() : catH())) * dpr) - font;
      ctx.fillText(label, lxCat, lyCat);
    }
    ctx.textAlign = 'start';
  }

  // Everything is drawn in device pixels so the sprite stays crisp at any zoom level.
  function draw() {
    if (debug) ctx.clearRect(0, 0, canvas.width, canvas.height);
    else if (dirty) ctx.clearRect(dirty[0], dirty[1], dirty[2], dirty[3]);
    dirty = null;
    if (!shown || !cats.length) return;
    if (debug) {
      drawDebug();
      dirty = [0, 0, canvas.width, canvas.height];
    }
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
    let cx;
    let cy;
    let rot = 0;
    let flip = cat.dir < 0;
    if (onWall()) {
      // Seen from behind, hugging the border: centred on the wall line.
      cx = cat.wall.x * dpr;
      cy = (cat.y - h / dpr / 2) * dpr;
      flip = false;
    } else {
      cx = cat.x * dpr;
      cy = (cat.y - catH() / 2) * dpr;
    }
    cx = Math.round(cx);
    cy = Math.round(cy);
    ctx.save();
    ctx.translate(cx, cy);
    if (rot) ctx.rotate(rot);
    if (flip) ctx.scale(-1, 1);
    ctx.drawImage(img, -w / 2, -h / 2);
    ctx.restore();
    const r = Math.max(w, h) / 2;
    grow(cx - r, cy - r, r * 2, r * 2);
  }

  // Floating Zs over sleeping cats, and hearts.
  function drawZs() {
    const zp = Math.max(1, px - Math.round(dpr));
    for (const z of zs) {
      const shape = z.kind ? MARKS[z.kind].shape : Z;
      ctx.fillStyle = z.kind ? MARKS[z.kind].color : ink;
      ctx.globalAlpha = 0.8 * (1 - z.t / 2.4);
      const zx = Math.round((z.x + Math.sin(z.t * 3) * 3) * dpr);
      const zy = Math.round(z.y * dpr);
      shape.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) {
          if (row[x] === 'K') ctx.fillRect(zx + x * zp, zy + y * zp, zp, zp);
        }
      });
      grow(zx, zy, zp * 5, zp * 4);
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

  // Click-through overlay, so clicks are only observed, never swallowed.
  function onPointerDown(e) {
    if (!shown) return;
    for (const c of cats) {
      cat = c;
      if (onWall() || cat.state === 'air') continue;
      const hit = Math.abs(e.clientX - cat.x) < halfW() && e.clientY < cat.y && e.clientY > cat.y - catH();
      if (!hit) continue;
      if (cat.state === 'sleep') setState('sit', rand(2, 4));
      else if (cat.state === 'sit' || cat.state === 'walk') launch(cat.x, cat.y);
      return;
    }
  }

  let last = 0;
  function frame(now) {
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0);
    last = now;
    // Fast-forward in small steps so jumps and landings stay accurate.
    const steps = debug ? DEBUG_SPEED : 1;
    for (let i = 0; i < steps; i++) {
      if (shown) {
        for (const c of cats) {
          cat = c;
          update(dt);
        }
      }
      updateZs(dt);
    }
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
    window.addEventListener('pointerdown', onPointerDown, { capture: true, passive: true });
    setInterval(poll, 700);
    requestAnimationFrame(frame);
  }

  start();
})();
