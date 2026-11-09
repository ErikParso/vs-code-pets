#!/usr/bin/env node
// The smoke test: the real cat script, bundled as the extension injects it, in a fake VS Code
// window (browser.js) for half an hour, with a fish thrown from the 🐈‍⬛'s menu now and then, the
// second half in debug mode (with the care panel and the 🐈‍⬛'s modifier-clicks), the cat boxes
// opened from the menu for a while, and a cat packed in its box from them and let out again.
// The simulations drive
// the World directly (session.js), so this is what checks the browser side: reading the
// workbench, drawing, the 🐈‍⬛, Web Locks and localStorage. It fails if the script throws, never
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
  // 🐈‍⬛'s modifier-clicks (trust and last meal) tried too.
  const DEBUG_CLICKS = [{ ctrlKey: true }, { ctrlKey: true, shiftKey: true }, { altKey: true }, { shiftKey: true }];
  // Fish are thrown from the 🐈‍⬛'s menu. The cat boxes: opened from it too, a quarter of the way
  // in; the next click on the 🐈‍⬛ (to throw a fish) closes them.
  // While open, a click on the first cat's box packs it (it goes from the window into its box);
  // the panel is opened again a few minutes later and the same click lets it out.
  const boxesAt = Math.floor(frames / 4);
  const unpackAt = boxesAt + Math.floor(fishEvery * 0.7); // before the 🐈‍⬛ closes the panel again
  const FIRST_BOX = { x: 72, y: 76 }; // the middle of the first box, CSS px on the panel (scale 2)
  const first = cats[0].name;
  const packAt = boxesAt + 20;
  const settle = Math.ceil(1500 / FRAME_MS); // a poll (700 ms) and then some, for a click to show
  let boxesShown = false;
  let boxesLabel = null;
  let packedLabel = null;
  let mostWhilePacked = 0; // the most cats drawn in a frame while the first one was packed
  let mostAfter = 0; // ... and after it was let out
  let menuClosedOnFish = false; // the fish button is for throwing fish after fish: it must stay
  let closedByX = false; // the cat boxes' X closed them
  for (let f = 1; f <= frames; f++) {
    if (f === Math.floor(frames / 2)) browser.setDebug(true);
    if (f === boxesAt || f === unpackAt) browser.choose('box');
    await browser.step();
    if (f === boxesAt + 10) {
      boxesShown = browser.boxesOpen();
      boxesLabel = browser.boxesLabel();
    }
    if (f === packAt) browser.clickBoxesPanel(FIRST_BOX.x, FIRST_BOX.y);
    if (f === packAt + 10) packedLabel = browser.boxesLabel();
    if (f > packAt + settle && f <= unpackAt + 10) mostWhilePacked = Math.max(mostWhilePacked, browser.drawn.catsInFrame);
    if (f === unpackAt + 10) browser.clickBoxesPanel(FIRST_BOX.x, FIRST_BOX.y);
    if (f === unpackAt + 20) {
      browser.clickBoxesClose();
      closedByX = !browser.boxesOpen();
    }
    if (f > unpackAt + 10 + settle) mostAfter = Math.max(mostAfter, browser.drawn.catsInFrame);
    if (f % fishEvery === 0) {
      browser.choose('fish');
      if (!browser.menuOpen()) menuClosedOnFish = true;
    }
    if (f > frames / 2 && f % fishEvery === Math.floor(fishEvery / 2)) for (const keys of DEBUG_CLICKS) browser.clickFish(keys);
  }

  const saved = JSON.parse(storage.get('pixelCat.care') || '{}');
  const problems = [...browser.errors];
  if (!browser.drawn.images) problems.push('Nothing was drawn: the cats never came out.');
  for (const c of cats) if (!saved[c.name]) problems.push(`${c.name}'s hunger and trust were never saved.`);
  if (!browser.drawn.fish) problems.push("The fish in the 🐈‍⬛'s menu never threw a fish.");
  if (menuClosedOnFish) problems.push("The 🐈‍⬛'s menu closed when its fish was clicked.");
  if (!boxesShown) problems.push("The box in the 🐈‍⬛'s menu did not open the cat boxes.");
  for (const c of cats) if (!(boxesLabel || '').includes(`${c.name}:`)) problems.push(`${c.name} was not in the cat boxes (${boxesLabel}).`);
  if (!closedByX) problems.push("The cat boxes' X did not close them.");
  if (browser.boxesOpen()) problems.push('A click elsewhere did not close the cat boxes.');
  if (!(packedLabel || '').includes(`${first} (packed):`)) problems.push(`Clicking ${first}'s box did not pack it (${packedLabel}).`);
  if (mostWhilePacked !== cats.length - 1) problems.push(`While ${first} was packed, up to ${mostWhilePacked} cats were out (not ${cats.length - 1}).`);
  if (mostAfter !== cats.length) problems.push(`After ${first} was let out, up to ${mostAfter} cats were out (not ${cats.length}).`);
  if (Object.values(saved).some((c) => c.packed)) problems.push('A cat is still packed at the end.');

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
