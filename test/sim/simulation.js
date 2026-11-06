// Runs the cats on a schedule of VS Code sessions and records what they do. Shared by run.js
// (statistics and snapshots) and trace.js (the exact event log).
'use strict';

const fs = require('fs');
const path = require('path');
const { fork } = require('child_process');
const { loadWorld } = require('../../scripts/bundle');
const { createSession, FRAME_MS } = require('./session');
const { layout } = require('./layouts');
const { Recorder } = require('./recorder');
const { createFeeder } = require('./feeders');

const ROOT = path.join(__dirname, '..', '..');
const CATS_FILE = path.join(ROOT, 'inject', 'cats.json');
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const worlds = new Map(); // srcDir -> Promise<the World module>, so each process bundles once
const worldFrom = (srcDir) => {
  if (!worlds.has(srcDir)) worlds.set(srcDir, loadWorld(srcDir));
  return worlds.get(srcDir);
};
const WEEK_START_MS = Date.UTC(2026, 0, 5); // a fixed clock: Monday 5 January 2026, 00:00 UTC
const WORKDAYS = 5; // Monday to Friday; VS Code stays closed at the weekend

/**
 * What to run. `hours` (one session, always open) wins over `days` + `open` (VS Code open on
 * weekdays between those hours). `srcDir`: the cat script's sources (a copy of src/ to
 * try out a change). `trace`: also return the event log.
 */
const DEFAULTS = {
  days: 5,
  open: [9, 17],
  hours: null,
  feeder: 'attentive',
  srcDir: path.join(ROOT, 'src'),
  trace: false,
};

/** When VS Code is open: [{start, end}] in ms. */
function sessions(opts) {
  const [from, to] = opts.open;
  if (opts.hours !== null) return [{ start: WEEK_START_MS + from * HOUR_MS, end: WEEK_START_MS + from * HOUR_MS + opts.hours * HOUR_MS }];
  const out = [];
  for (let d = 0; d < opts.days; d++) {
    if (d % 7 >= WORKDAYS) continue;
    const day = WEEK_START_MS + d * DAY_MS;
    out.push({ start: day + from * HOUR_MS, end: day + to * HOUR_MS });
  }
  return out;
}

const scheduleLabel = (opts) => (opts.hours !== null ? `${opts.hours} h open` : `${opts.days} days, open weekdays ${opts.open.join('-')}`);

/**
 * One seed, every session in turn. Each session is a fresh World (see session.js); they share
 * localStorage, where the cats' meal deadlines and trust are kept. The run starts as a fresh
 * install: nothing saved yet.
 */
async function simulate({ seed, opts }) {
  const cats = JSON.parse(fs.readFileSync(CATS_FILE, 'utf8'));
  const api = await worldFrom(opts.srcDir);
  const storage = new Map();
  const recorder = new Recorder({ catNames: cats.map((c) => c.name), trace: opts.trace ? [] : null });
  const feeder = createFeeder(opts.feeder, cats.length);
  const errors = [];
  let fishThrown = 0;

  for (const [i, session] of sessions(opts).entries()) {
    const run = createSession({ api, layout, seed: seed * 1000 + i, startMs: session.start, storage, cats });
    const T = () => (run.now - WEEK_START_MS) / 1000;
    recorder.startSession(T(), session.start);
    feeder.startSession(session.start, session.end, WEEK_START_MS);
    const frames = Math.round((session.end - session.start) / FRAME_MS);
    let k = null;
    for (let f = 1; f <= frames; f++) {
      run.step();
      const s = run.view();
      if (!s.shown) continue; // still starting up (it polls the status bar)
      k = s.constants;
      for (let n = feeder.fishNow(s); n > 0; n--) {
        run.clickFish();
        fishThrown++;
      }
      recorder.sample(s, T(), FRAME_MS / 1000);
    }
    if (!k) errors.push(`Session ${i + 1}: the cats never came out.`);
    else recorder.endSession(T(), run.now, k);
    recorder.dropFish();
    errors.push(...run.errors.map((e) => `session ${i + 1}: ${e}`));
  }
  return { ...recorder.finish(fishThrown), errors };
}

/** Runs every seed, each in its own process when `parallel`. Results come back in seed order. */
async function runSeeds(seeds, opts, { parallel = true, onDone = () => {} } = {}) {
  const one = async (seed) => {
    const t0 = Date.now();
    const r = parallel ? await inWorker(seed, opts) : await simulate({ seed, opts });
    onDone(seed, (Date.now() - t0) / 1000);
    return r;
  };
  if (!parallel) {
    const results = [];
    for (const seed of seeds) results.push(await one(seed));
    return results;
  }
  return Promise.all(seeds.map(one));
}

function inWorker(seed, opts) {
  return new Promise((resolve, reject) => {
    const child = fork(path.join(__dirname, 'worker.js'), [JSON.stringify({ seed, opts })]);
    let result = null;
    child.on('message', (r) => (result = r));
    child.on('error', reject);
    child.on('exit', (code) => (result ? resolve(result) : reject(new Error(`seed ${seed}: worker exited with ${code} and no result`))));
  });
}

/** Violations and errors of all seeds, as {rule: {count, examples}}. */
function gatherViolations(results, seeds) {
  const violations = {};
  results.forEach((r, i) => {
    for (const [rule, v] of Object.entries(r.violations)) {
      const all = (violations[rule] ||= { count: 0, examples: [] });
      all.count += v.count;
      all.examples.push(...v.examples.map((e) => `seed ${seeds[i]}: ${e}`));
    }
    for (const e of r.errors) {
      const all = (violations['cat script error'] ||= { count: 0, examples: [] });
      all.count++;
      all.examples.push(`seed ${seeds[i]}: ${e}`);
    }
  });
  return violations;
}

function printViolations(violations) {
  const rules = Object.keys(violations);
  if (!rules.length) return false;
  console.log('\nFAIL:');
  for (const rule of rules) {
    console.log(`  ${rule}: ${violations[rule].count}x`);
    for (const e of violations[rule].examples.slice(0, 5)) console.log(`    ${e}`);
  }
  return true;
}

module.exports = { DEFAULTS, ROOT, HOUR_MS, sessions, scheduleLabel, simulate, runSeeds, gatherViolations, printViolations, layout, FRAME_MS };
