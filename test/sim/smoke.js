#!/usr/bin/env node
// The smoke test: the real cat script, bundled as the extension injects it, in a fake VS Code
// window (browser.js) for half an hour, with a fish thrown now and then, the second half in debug
// mode (with the care panel and the 🐟's modifier-clicks). The simulations drive
// the World directly (session.js), so this is what checks the browser side: reading the
// workbench, drawing, the 🐟, Web Locks and localStorage. It fails if the script throws, never
// draws a cat, or never saves the cats' hunger and trust.
//
//   node test/sim/smoke.js [--src <copy of src/>]
'use strict';

const fs = require('fs');
const path = require('path');
const { bundle, SRC } = require('../../scripts/bundle');
const { createBrowser } = require('./browser');
const { FRAME_MS } = require('./session');
const { layout } = require('./layouts');

const ROOT = path.join(__dirname, '..', '..');
const MINUTES = 30;
const FISH_EVERY_MIN = 5;
const START_MS = Date.UTC(2026, 0, 5, 9); // Monday 09:00 UTC
const SEED = 1;

async function main() {
  const srcAt = process.argv.indexOf('--src');
  const srcDir = srcAt >= 0 ? path.resolve(process.argv[srcAt + 1]) : SRC;
  const cats = JSON.parse(fs.readFileSync(path.join(ROOT, 'inject', 'cats.json'), 'utf8'));
  // As buildScript in src/extension.ts puts it together (the config is set on the window).
  const script = `'use strict';\n${await bundle(srcDir)}`;
  const storage = new Map();
  const browser = createBrowser({ layout, seed: SEED, startMs: START_MS, storage, cats, script });

  const frames = Math.round((MINUTES * 60 * 1000) / FRAME_MS);
  const fishEvery = Math.round((FISH_EVERY_MIN * 60 * 1000) / FRAME_MS);
  // The second half in debug mode: floors, walls and meters drawn, the care panel shown, and the
  // 🐟's modifier-clicks (trust and meal deadline) tried too.
  const DEBUG_CLICKS = [{ ctrlKey: true }, { ctrlKey: true, shiftKey: true }, { altKey: true }, { shiftKey: true }];
  for (let f = 1; f <= frames; f++) {
    if (f === Math.floor(frames / 2)) browser.setDebug(true);
    await browser.step();
    if (f % fishEvery === 0) browser.clickFish();
    if (f > frames / 2 && f % fishEvery === Math.floor(fishEvery / 2)) for (const keys of DEBUG_CLICKS) browser.clickFish(keys);
  }

  const saved = JSON.parse(storage.get('pixelCat.care') || '{}');
  const problems = [...browser.errors];
  if (!browser.drawn.images) problems.push('Nothing was drawn: the cats never came out.');
  for (const c of cats) if (!saved[c.name]) problems.push(`${c.name}'s hunger and trust were never saved.`);

  console.log(`Smoke: the cat script in a fake ${layout.width}x${layout.height} window for ${MINUTES} min; ${browser.drawn.images} images and ${browser.drawn.rects} rectangles drawn`);
  if (!problems.length) return console.log('PASS: it runs, draws the cats and saves them.');
  console.log('FAIL:');
  for (const p of problems) console.log(`  ${p}`);
  process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
