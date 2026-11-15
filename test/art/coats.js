#!/usr/bin/env node
// The exact check on how every coat looks: draws each coat through the real drawing code and
// compares every pixel's colour with the snapshot recorded in test/art/snapshots/. Colours are
// compared, not the art's letters, so the art can be reorganised freely as long as every cat
// still looks the same. For each coat it draws:
// - every cat frame as the renderer builds it, without its collar and with the coat's collar on;
// - its cat peeking out of an open box in the cat boxes panel, eyes open and blinking, with and
//   without a collar;
// - its card in the collection, found and not yet found.
// Fish and yarn do not depend on the coat; they are checked once, in _props.json.
//
//   node test/art/coats.js              check against the snapshots
//   node test/art/coats.js --record     record new snapshots (after a change to a coat you meant)
'use strict';

const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..', '..');
const SNAPSHOTS = path.join(__dirname, 'snapshots');
const PROPS_FILE = '_props';
// The legend's letters, one per colour in an image ('.' is see-through).
const LETTERS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!#$%&*+-/:;<=>?@^_~|';
// The box panel's blink is about 0.15 s in a period of 3-5 s; stepping at a hundredth catches it.
const BLINK_STEP = 0.01;
const BLINK_SPAN = 6;

const ART_API = `
export { Renderer } from './renderer';
export { paintPanel, panelSize, lookKey } from './box-art';
export { paintCollection, collectionSize } from './collection-art';
export { COATS } from '../world/coats';
export { CAT_FRAMES, PROPS } from '../world/sprites';
`;

/** The drawing code, bundled from src as the extension bundles it, loaded as a module. */
async function loadArt() {
  const result = await esbuild.build({
    stdin: { contents: ART_API, resolveDir: path.join(ROOT, 'src', 'browser'), loader: 'ts', sourcefile: 'art-api.ts' },
    bundle: true,
    target: 'es2022',
    format: 'cjs',
    platform: 'node',
    write: false,
    logLevel: 'warning',
  });
  const module = { exports: {} };
  new Function('module', 'exports', result.outputFiles[0].text)(module, module.exports);
  return module.exports;
}

/** A w x h image: one colour (or null, see-through) per pixel, row by row. */
function blank(w, h) {
  return Array.from({ length: h }, () => new Array(w).fill(null));
}

/** Paints into `image`, one sprite pixel to one image pixel, cropped to it as a canvas crops. */
function painterOn(image) {
  return (x, y, w, h, color) => {
    for (let yy = Math.max(0, y); yy < Math.min(image.length, y + h); yy++) {
      for (let xx = Math.max(0, x); xx < Math.min(image[yy].length, x + w); xx++) image[yy][xx] = color;
    }
  };
}

// The renderer's canvases, as images: just enough of a canvas for building sprites.
function fakeCanvas() {
  const canvas = {
    width: 0,
    height: 0,
    style: {},
    image: null,
    getContext: () => ctx,
  };
  const ctx = {
    fillStyle: null,
    fillRect(x, y, w, h) {
      canvas.image ??= blank(canvas.width, canvas.height);
      painterOn(canvas.image)(x, y, w, h, ctx.fillStyle);
    },
  };
  return canvas;
}

function imageOf(canvas) {
  return canvas.image ?? blank(canvas.width, canvas.height);
}

/** `top` over `bottom`, as the renderer draws a collar over its cat. */
function over(bottom, top) {
  return bottom.map((row, y) => row.map((c, x) => top[y][x] ?? c));
}

function rendererOf(art) {
  globalThis.document = { createElement: fakeCanvas, body: { appendChild() {} } };
  return new art.Renderer(1); // one device pixel per sprite pixel
}

/** The box panel with just `coat`'s cat, open-eyed and blinking. */
function boxImages(art, coat, collar) {
  const box = {
    id: 'snapshot',
    name: 'Snapshot',
    coat: coat.id,
    halfHearts: 4,
    fish: 3,
    packed: false,
    collar,
    button: { kind: 'friend', why: null },
  };
  const keys = new Map(); // look key -> the first t it is seen at
  for (let i = 0; i * BLINK_STEP < BLINK_SPAN; i++) {
    const t = i * BLINK_STEP;
    const key = art.lookKey([box], 1, t);
    if (!keys.has(key)) keys.set(key, t);
  }
  if (keys.size !== 2) throw new Error(`expected the box panel to look two ways (open, blinking); it looked ${keys.size}`);
  const [open, blink] = [...keys.values()]; // it starts open-eyed
  const paint = (t) => {
    const { width, height } = art.panelSize(1, 1);
    const image = blank(width, height);
    art.paintPanel(painterOn(image), [box], 0, 1, t, 1);
    return image;
  };
  return { open: paint(open), blink: paint(blink) };
}

function collectionImage(art, coat, found) {
  const { width, height } = art.collectionSize(1);
  const image = blank(width, height);
  art.paintCollection(painterOn(image), [coat], () => found, 1);
  return image;
}

/** Every image of `coat`, by name. */
function coatImages(art, renderer, coat) {
  const images = {};
  for (const frame of art.CAT_FRAMES) {
    const cat = imageOf(renderer.spriteFor(coat.id, frame));
    images[`frame ${frame}`] = cat;
    const collar = renderer.collarFor(coat.id, coat.collar, frame);
    if (collar) images[`frame ${frame} + collar`] = over(cat, imageOf(collar));
  }
  for (const collar of [null, coat.collar]) {
    const { open, blink } = boxImages(art, coat, collar);
    const suffix = collar ? ' + collar' : '';
    images[`box open${suffix}`] = open;
    images[`box blink${suffix}`] = blink;
  }
  images['collection found'] = collectionImage(art, coat, true);
  images['collection unseen'] = collectionImage(art, coat, false);
  return images;
}

function propImages(art, renderer) {
  return Object.fromEntries(Object.keys(art.PROPS).map((p) => [`frame ${p}`, imageOf(renderer.propFor(p))]));
}

// A snapshot file: a legend of letters for its colours, then each image as rows of letters.
function encode(images) {
  const legend = {};
  const letterOf = new Map();
  const rows = {};
  for (const [name, image] of Object.entries(images)) {
    rows[name] = image.map((row) =>
      row
        .map((c) => {
          if (c === null) return '.';
          if (!letterOf.has(c)) {
            if (letterOf.size >= LETTERS.length) throw new Error(`more than ${LETTERS.length} colours in one snapshot`);
            const letter = LETTERS[letterOf.size];
            letterOf.set(c, letter);
            legend[letter] = c;
          }
          return letterOf.get(c);
        })
        .join('')
    );
  }
  return { legend, images: rows };
}

function decode({ legend, images }) {
  return Object.fromEntries(Object.entries(images).map(([name, rows]) => [name, rows.map((r) => [...r].map((ch) => (ch === '.' ? null : legend[ch])))]));
}

/** The first difference between two sets of images, as a sentence; null if they are the same. */
function firstDifference(expected, actual) {
  for (const name of Object.keys(expected)) {
    if (!(name in actual)) return `"${name}" is no longer drawn`;
  }
  for (const name of Object.keys(actual)) {
    if (!(name in expected)) return `"${name}" is new (not in the snapshot)`;
  }
  for (const [name, want] of Object.entries(expected)) {
    const got = actual[name];
    if (want.length !== got.length || want[0].length !== got[0].length) {
      return `"${name}" is ${got[0].length}x${got.length}, was ${want[0].length}x${want.length}`;
    }
    for (let y = 0; y < want.length; y++) {
      for (let x = 0; x < want[y].length; x++) {
        if (want[y][x] !== got[y][x]) return `"${name}" pixel ${x},${y} is ${got[y][x] ?? 'see-through'}, was ${want[y][x] ?? 'see-through'}`;
      }
    }
  }
  return null;
}

async function main() {
  const record = process.argv.includes('--record');
  const art = await loadArt();
  const renderer = rendererOf(art);
  const sets = new Map(art.COATS.map((coat) => [coat.id, coatImages(art, renderer, coat)]));
  sets.set(PROPS_FILE, propImages(art, renderer));
  const file = (name) => path.join(SNAPSHOTS, `${name}.json`);

  if (record) {
    fs.rmSync(SNAPSHOTS, { recursive: true, force: true });
    fs.mkdirSync(SNAPSHOTS, { recursive: true });
    for (const [name, images] of sets) fs.writeFileSync(file(name), JSON.stringify(encode(images), null, 1) + '\n');
    const count = [...sets.values()].reduce((n, images) => n + Object.keys(images).length, 0);
    console.log(`coat snapshots: recorded ${count} images in ${sets.size} files in ${path.relative(ROOT, SNAPSHOTS)}`);
    return;
  }

  const failures = [];
  const recorded = fs.existsSync(SNAPSHOTS) ? fs.readdirSync(SNAPSHOTS).map((f) => path.basename(f, '.json')) : [];
  for (const name of recorded) if (!sets.has(name)) failures.push(`${name}: in the snapshots, but there is no such coat`);
  for (const [name, images] of sets) {
    if (!fs.existsSync(file(name))) {
      failures.push(`${name}: no snapshot (record one with --record)`);
      continue;
    }
    const diff = firstDifference(decode(JSON.parse(fs.readFileSync(file(name), 'utf8'))), images);
    if (diff) failures.push(`${name}: ${diff}`);
  }
  if (failures.length) {
    console.error(`coat snapshots: ${failures.length} of ${sets.size} differ\n  ${failures.join('\n  ')}`);
    process.exit(1);
  }
  console.log(`coat snapshots: all ${sets.size} match`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
