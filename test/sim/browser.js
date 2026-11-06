// A stand-in for the VS Code window that inject/world.js runs in: a virtual clock, a seeded
// Math.random, the workbench parts of the layout, Web Locks, localStorage and a canvas that
// draws nothing. world.js runs unchanged inside it (in a vm context), so the cats behave as
// they do in VS Code, only as fast as Node can step them.
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const DEFAULT_INJECT = path.join(__dirname, '..', '..', 'inject');
const FRAME_MS = 1000 / 60; // VS Code repaints at the display rate; 60 Hz is the common case
const POLL_LABEL = 'Pixel Cat: throw a fish to ';

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

/** Timers driven by the simulation, not the wall clock. */
class Clock {
  constructor(startMs) {
    this.now = startMs;
    this.timers = [];
    this.nextId = 1;
  }
  add(fn, ms, repeat) {
    const id = this.nextId++;
    this.timers.push({ id, fn, at: this.now + ms, every: repeat ? Math.max(1, ms) : 0 });
    return id;
  }
  clear(id) {
    this.timers = this.timers.filter((t) => t.id !== id);
  }
  /** Moves time forward, firing timers that come due on the way, in order. */
  advance(ms, onError) {
    const end = this.now + ms;
    for (;;) {
      const due = this.timers.filter((t) => t.at <= end).sort((a, b) => a.at - b.at)[0];
      if (!due) break;
      this.now = due.at;
      if (due.every) due.at += due.every;
      else this.clear(due.id);
      try {
        due.fn();
      } catch (e) {
        onError(e);
      }
    }
    this.now = end;
  }
}

// world.js ends by starting itself; probe.js goes in just before that, inside its closure.
const START_CALL = /\r?\n {2}start\(\);\r?\n\}\)\(\);\s*$/;

/** world.js with probe.js spliced in, so the recorder can read the world. */
function withProbe(world) {
  const at = world.search(START_CALL);
  if (at < 0) throw new Error("Can't add the probe: world.js no longer ends with `  start();` and `})();`");
  const probe = fs.readFileSync(path.join(__dirname, 'probe.js'), 'utf8');
  return world.slice(0, at) + '\n' + probe + world.slice(at);
}

/** A drawing context that accepts every call and draws nothing. */
function nullContext() {
  return new Proxy({}, { get: (target, key) => (key in target ? target[key] : () => {}), set: (target, key, v) => ((target[key] = v), true) });
}

/**
 * Builds the window. `layout.parts` maps a workbench selector (as world.js queries it) to the
 * rectangles of the elements it matches. `storage` is localStorage: pass the same Map to every
 * window of a run, as VS Code keeps it between sessions.
 */
function createBrowser({ layout, seed, startMs, storage, cats, injectDir = DEFAULT_INJECT }) {
  const clock = new Clock(startMs);
  const errors = [];
  const onError = (e) => errors.push(e && e.stack ? e.stack : String(e));

  class Element {
    constructor(tag, rect) {
      this.tagName = tag;
      this.rect = rect || { left: 0, top: 0, width: 0, height: 0 };
      this.style = {};
      this.children = [];
      this.attributes = {};
      this.textContent = '';
    }
    getBoundingClientRect() {
      const r = this.rect;
      return { left: r.left, top: r.top, width: r.width, height: r.height, right: r.left + r.width, bottom: r.top + r.height };
    }
    getContext() {
      return nullContext();
    }
    appendChild(child) {
      this.children.push(child);
      return child;
    }
    replaceChildren(...children) {
      this.children = children;
    }
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    }
    getAttribute(name) {
      return name in this.attributes ? this.attributes[name] : null;
    }
    addEventListener() {}
    closest(selector) {
      return selector === '.statusbar-item' && this.attributes.class === 'statusbar-item' ? this : null;
    }
  }

  const parts = Object.fromEntries(Object.entries(layout.parts).map(([sel, rects]) => [sel, rects.map((r) => new Element('div', r))]));
  const workbench = new Element('div', { left: 0, top: 0, width: layout.width, height: layout.height });
  // The 🐟 the extension puts in the status bar while cats are out.
  const fishItem = new Element('div', layout.fishButton);
  fishItem.setAttribute('class', 'statusbar-item');
  fishItem.setAttribute('aria-label', POLL_LABEL + cats.map((c) => c.name).join(', '));
  fishItem.textContent = '🐟';

  const clickListeners = [];
  const document = {
    body: new Element('body'),
    createElement: (tag) => new Element(tag),
    querySelectorAll: (sel) => parts[sel] || [],
    querySelector(sel) {
      if (sel === '.monaco-workbench .part.statusbar') return (parts['.part.statusbar'] || [])[0] || null;
      if (sel === '.monaco-workbench') return workbench;
      if (sel.startsWith('.part.statusbar .statusbar-item[aria-label^=')) return fishItem;
      return null;
    },
    addEventListener: (type, fn) => type === 'click' && clickListeners.push(fn),
  };

  const localStorage = {
    getItem: (k) => (storage.has(k) ? storage.get(k) : null),
    setItem: (k, v) => storage.set(k, String(v)),
  };

  // One window: a cat that walks out is handed straight back to it, as Web Locks do when no
  // other VS Code window is waiting.
  const navigator = { locks: { request: (name, cb) => Promise.resolve().then(cb) } };

  let frameCallback = null;
  const sandbox = {
    document,
    localStorage,
    navigator,
    Element,
    innerWidth: layout.width,
    innerHeight: layout.height,
    devicePixelRatio: 1,
    addEventListener() {},
    getComputedStyle: () => ({ getPropertyValue: () => '#cccccc' }),
    requestAnimationFrame: (fn) => {
      frameCallback = fn;
      return 1;
    },
    setTimeout: (fn, ms) => clock.add(fn, ms || 0, false),
    setInterval: (fn, ms) => clock.add(fn, ms || 0, true),
    clearTimeout: (id) => clock.clear(id),
    clearInterval: (id) => clock.clear(id),
    console: { info() {}, log() {}, warn: (...a) => onError('console.warn: ' + a.join(' ')), error: (...a) => onError('console.error: ' + a.join(' ')) },
  };
  sandbox.window = sandbox;
  const context = vm.createContext(sandbox);

  // Pin the environment: this context's own Math.random and Date.now.
  context.__random = seededRandom(seed);
  context.__now = () => clock.now;
  vm.runInContext('Math.random = __random; Date.now = __now;', context);

  const sprites = fs.readFileSync(path.join(injectDir, 'sprites.js'), 'utf8');
  vm.runInContext(sprites, context, { filename: 'sprites.js' });
  context.PixelCatConfig = { scale: 2, cats };
  vm.runInContext(withProbe(fs.readFileSync(path.join(injectDir, 'world.js'), 'utf8')), context, { filename: 'world.js' });

  return {
    errors,
    get now() {
      return clock.now;
    },
    probe: () => (context.PixelCatProbe ? context.PixelCatProbe() : null),
    /** One display frame: timers first, then the animation frame, as a browser does. */
    async step() {
      clock.advance(FRAME_MS, onError);
      const fn = frameCallback;
      frameCallback = null;
      if (fn) {
        try {
          fn(clock.now);
        } catch (e) {
          onError(e);
        }
      }
      await null; // let promise callbacks (Web Locks) run, as between real frames
    },
    /** Clicks the 🐟 in the status bar. */
    clickFish() {
      const event = { target: fishItem, ctrlKey: false, altKey: false, shiftKey: false };
      for (const fn of clickListeners) {
        try {
          fn(event);
        } catch (e) {
          onError(e);
        }
      }
    },
  };
}

module.exports = { createBrowser, FRAME_MS };
