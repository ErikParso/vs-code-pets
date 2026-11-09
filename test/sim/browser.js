// A stand-in for the VS Code window that the cat script runs in, for the smoke test (smoke.js):
// a virtual clock, a seeded Math.random, the workbench parts of the layout, Web Locks,
// localStorage and a canvas that draws nothing but counts what is drawn. The real script (as the
// extension injects it) runs unchanged inside it, in a vm context. The simulations drive the
// World directly instead (session.js).
'use strict';

const vm = require('vm');
const { seededRandom, FRAME_MS } = require('./session');

const POLL_LABEL = 'Pixel Cat: throw a fish to ';

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

/**
 * A drawing context that accepts every call and draws nothing; it counts images and rectangles in
 * `drawn`, the cats among the images in this frame, and the fish (a fish's sprite is twice as wide
 * as tall; a cat's is not).
 */
function nullContext(drawn) {
  const drawImage = (img) => {
    drawn.images++;
    if (img && img.height > img.width / 2) drawn.catsInFrame++;
    else drawn.fish++;
  };
  const fillRect = () => drawn.rects++;
  return new Proxy(
    {},
    {
      get: (target, key) => (key === 'drawImage' ? drawImage : key === 'fillRect' ? fillRect : key in target ? target[key] : () => {}),
      set: (target, key, v) => ((target[key] = v), true),
    }
  );
}

/**
 * Builds the window and runs `script` in it. `layout.parts` maps a workbench selector (as
 * app.ts queries it) to the rectangles of the elements it matches. `storage` is localStorage.
 */
function createBrowser({ layout, seed, startMs, storage, script }) {
  const clock = new Clock(startMs);
  const errors = [];
  const onError = (e) => errors.push(e && e.stack ? e.stack : String(e));
  const drawn = { images: 0, rects: 0, catsInFrame: 0, fish: 0 };

  class Element {
    constructor(tag, rect) {
      this.tagName = tag;
      this.rect = rect || { left: 0, top: 0, width: 0, height: 0 };
      this.style = {};
      this.children = [];
      this.attributes = {};
      this.listeners = {};
      this.textContent = '';
    }
    getBoundingClientRect() {
      const r = this.rect;
      return { left: r.left, top: r.top, width: r.width, height: r.height, right: r.left + r.width, bottom: r.top + r.height };
    }
    getContext() {
      return nullContext(drawn);
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
    addEventListener(type, fn) {
      (this.listeners[type] = this.listeners[type] || []).push(fn);
    }
    dispatch(type, event) {
      for (const fn of this.listeners[type] || []) {
        try {
          fn(event);
        } catch (e) {
          onError(e);
        }
      }
    }
    closest(selector) {
      return selector === '.statusbar-item' && this.attributes.class === 'statusbar-item' ? this : null;
    }
    contains(other) {
      return other === this || this.children.some((c) => c.contains && c.contains(other));
    }
  }

  const parts = Object.fromEntries(Object.entries(layout.parts).map(([sel, rects]) => [sel, rects.map((r) => new Element('div', r))]));
  const workbench = new Element('div', { left: 0, top: 0, width: layout.width, height: layout.height });
  // The 🐈‍⬛ the extension puts in the status bar while cats are out.
  const fishItem = new Element('div', layout.fishButton);
  fishItem.setAttribute('class', 'statusbar-item');
  fishItem.setAttribute('aria-label', POLL_LABEL + 'your cats');
  fishItem.textContent = '🐈‍⬛';
  // And the 📦 next to it, for the cat boxes.

  const clickListeners = [];
  const click = (event) => {
    for (const fn of clickListeners) {
      try {
        fn(event);
      } catch (e) {
        onError(e);
      }
    }
  };
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

  // As the extension injects it.
  vm.runInContext(script, context, { filename: 'pixel-cat.js' });

  return {
    errors,
    drawn,
    /** Clicks the X at the cat boxes panel's top right (scale 2: two CSS px per sprite px). */
    clickBoxesClose() {
      const panel = document.body.children.find((c) => c.className === 'pixel-cat-boxes');
      const canvas = panel && panel.children[0];
      if (canvas) canvas.dispatch('click', { offsetX: parseFloat(canvas.style.width) - 20, offsetY: 20, target: canvas });
    },
    /** Clicks the cat boxes panel at (x, y), CSS px from its top left. */
    clickBoxesPanel(x, y) {
      const panel = document.body.children.find((c) => c.className === 'pixel-cat-boxes');
      if (panel) panel.children[0].dispatch('click', { offsetX: x, offsetY: y, target: panel.children[0] });
    },
    /** One display frame: timers first, then the animation frame, as a browser does. */
    async step() {
      clock.advance(FRAME_MS, onError);
      const fn = frameCallback;
      frameCallback = null;
      if (fn) {
        drawn.catsInFrame = 0;
        try {
          fn(clock.now);
        } catch (e) {
          onError(e);
        }
      }
      await new Promise((resolve) => setImmediate(resolve)); // promise callbacks (Web Locks) all run before the next frame, as in a browser
    },
    /** Turns the extension's debug mode on or off (it says so in the 🐈‍⬛'s label). */
    setDebug(on) {
      fishItem.setAttribute('aria-label', POLL_LABEL + 'your cats' + (on ? ' (debug)' : ''));
    },
    /** Clicks the 🐈‍⬛ in the status bar, holding the modifier keys in `keys` ({ctrlKey, altKey, shiftKey}). */
    clickFish(keys = {}) {
      click({ target: fishItem, ctrlKey: !!keys.ctrlKey, altKey: !!keys.altKey, shiftKey: !!keys.shiftKey });
    },
    /** Clicks `button` ('fish', 'yarn' or 'box') in the 🐈‍⬛'s menu (its first, second or last button), first opening it with the 🐈‍⬛ if it is closed. */
    choose(button) {
      const menu = document.body.children.find((c) => c.className === 'pixel-cat-menu');
      if (!menu) return;
      if (menu.style.display !== 'flex') this.clickFish();
      if (menu.style.display !== 'flex') return;
      const canvas = menu.children[button === 'fish' ? 0 : button === 'yarn' ? 1 : menu.children.length - 1];
      canvas.dispatch('click', { target: canvas });
    },
    /** The cat boxes panel's description of the cats (its canvas's aria-label), or null if it never drew. */
    boxesLabel() {
      const panel = document.body.children.find((c) => c.className === 'pixel-cat-boxes');
      return panel ? panel.children[0].getAttribute('aria-label') : null;
    },
    /** Whether the 🐈‍⬛'s menu is showing. */
    menuOpen() {
      const menu = document.body.children.find((c) => c.className === 'pixel-cat-menu');
      return !!menu && menu.style.display === 'flex';
    },
    /** Whether the cat boxes panel is showing. */
    boxesOpen() {
      const panel = document.body.children.find((c) => c.className === 'pixel-cat-boxes');
      return !!panel && panel.style.display === 'block';
    },
  };
}

module.exports = { createBrowser };
