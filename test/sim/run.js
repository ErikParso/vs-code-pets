#!/usr/bin/env node
// Runs the cats in a VS Code window (layouts.js) on a virtual clock, checks they never break
// the rules of their world, prints what they did, and saves it as a snapshot to compare
// against after the next change (see compare.js).
//
// By default: a work week. VS Code is open Monday to Friday, 9:00-17:00, and closed the rest
// of the time (the clock runs on, so the cats get hungry overnight). An attentive person
// feeds them. Every seed runs in its own process, side by side.
//
//   node test/sim/run.js [--days 5] [--open 9-17]   a week of working days (Mon-Fri open)
//                        [--hours 4]                instead: one session this long, always open
//                        [--feeder attentive|daily|forgetful|spammer|none]
//                        [--seeds 3] [--serial] [--name v0.1.36] [--no-snapshot]
//                        [--inject <dir>]           a copy of inject/ to run instead, to try out a change
//
// Exits 1 if any invariant was broken or world.js threw.
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync, fork } = require('child_process');
const { createBrowser, FRAME_MS } = require('./browser');
const { layout } = require('./layouts');
const { Recorder } = require('./recorder');
const { createFeeder, FEEDER_NAMES } = require('./feeders');

const ROOT = path.join(__dirname, '..', '..');
const SNAPSHOTS = path.join(__dirname, 'snapshots');
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const WEEK_START_MS = Date.UTC(2026, 0, 5); // a fixed clock: Monday 5 January 2026, 00:00 UTC
const WORKDAYS = 5; // Monday to Friday; VS Code stays closed at the weekend

function parseArgs(argv) {
  const version = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;
  const opts = {
    days: 5,
    open: [9, 17],
    hours: null,
    feeder: 'attentive',
    seeds: 3,
    parallel: true,
    name: `v${version}`,
    snapshot: true,
    version,
    injectDir: path.join(ROOT, 'inject'),
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const value = () => {
      const v = argv[++i];
      if (v === undefined) throw new Error(`${arg} needs a value`);
      return v;
    };
    if (arg === '--days') opts.days = Number(value());
    else if (arg === '--open') opts.open = value().split('-').map(Number);
    else if (arg === '--hours') opts.hours = Number(value());
    else if (arg === '--feeder') opts.feeder = value();
    else if (arg === '--seeds') opts.seeds = Number(value());
    else if (arg === '--serial') opts.parallel = false;
    else if (arg === '--name') opts.name = value();
    else if (arg === '--no-snapshot') opts.snapshot = false;
    else if (arg === '--inject') opts.injectDir = path.resolve(value());
    else throw new Error(`Unknown option ${arg}`);
  }
  const [from, to] = opts.open;
  if (!(from >= 0 && to <= 24 && from < to)) throw new Error(`--open must be like 9-17, got ${opts.open.join('-')}`);
  if (opts.hours !== null && !(opts.hours > 0)) throw new Error(`--hours must be positive, got ${opts.hours}`);
  if (!(opts.days >= 1) || !(opts.seeds >= 1)) throw new Error(`Bad options: ${JSON.stringify(opts)}`);
  if (!FEEDER_NAMES.includes(opts.feeder)) throw new Error(`No feeder '${opts.feeder}' (have: ${FEEDER_NAMES.join(', ')})`);
  return opts;
}

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
 * One run: one seed, every session in turn. Each session is a fresh VS Code window; they share
 * localStorage, where the cats' meal deadlines and trust are kept. The run starts as a fresh
 * install: nothing saved yet.
 */
async function simulate({ seed, opts }) {
  const cats = JSON.parse(fs.readFileSync(path.join(opts.injectDir, 'cats.json'), 'utf8'));
  const storage = new Map();
  const recorder = new Recorder({ catNames: cats.map((c) => c.name) });
  const feeder = createFeeder(opts.feeder, cats.length);
  const errors = [];
  let fishThrown = 0;

  for (const [i, session] of sessions(opts).entries()) {
    const browser = createBrowser({ layout, seed: seed * 1000 + i, startMs: session.start, storage, cats, injectDir: opts.injectDir });
    const T = () => (browser.now - WEEK_START_MS) / 1000;
    recorder.startSession(T(), session.start);
    feeder.startSession(session.start, session.end, WEEK_START_MS);
    const frames = Math.round((session.end - session.start) / FRAME_MS);
    let k = null;
    for (let f = 1; f <= frames; f++) {
      await browser.step();
      const s = browser.probe();
      if (!s || !s.shown) continue; // still starting up (it polls the status bar)
      k = s.constants;
      for (let n = feeder.fishNow(s); n > 0; n--) {
        browser.clickFish();
        fishThrown++;
      }
      recorder.sample(s, T(), FRAME_MS / 1000);
    }
    if (!k) errors.push(`Session ${i + 1}: the cats never came out (PixelCatProbe never showed them).`);
    else recorder.endSession(T(), browser.now, k);
    recorder.dropFish();
    errors.push(...browser.errors.map((e) => `session ${i + 1}: ${e}`));
  }
  return { ...recorder.finish(fishThrown), errors };
}

/** Runs every seed, each in its own process when parallel. */
async function runSeeds(seeds, opts) {
  if (!opts.parallel) {
    const results = [];
    for (const seed of seeds) results.push(await timed(seed, () => simulate({ seed, opts })));
    return results;
  }
  return Promise.all(
    seeds.map((seed) =>
      timed(
        seed,
        () =>
          new Promise((resolve, reject) => {
            const child = fork(__filename, ['--worker', JSON.stringify({ seed, opts })]);
            let result = null;
            child.on('message', (r) => (result = r));
            child.on('error', reject);
            child.on('exit', (code) => (result ? resolve(result) : reject(new Error(`seed ${seed}: worker exited with ${code} and no result`))));
          })
      )
    )
  );
}

async function timed(seed, fn) {
  const t0 = Date.now();
  const r = await fn();
  console.log(`  seed ${seed}: ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  return r;
}

function gitInfo() {
  try {
    const commit = execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim();
    const dirty = execSync('git status --porcelain -- inject', { cwd: ROOT }).toString().trim() !== '';
    return { commit, dirty };
  } catch (e) {
    return { commit: null, dirty: null };
  }
}

/** Per-seed results -> {group: {metric: [value per seed]}}. */
function collect(results) {
  const out = {};
  results.forEach((r, i) => {
    for (const [group, metrics] of Object.entries(r.metrics)) {
      for (const [name, v] of Object.entries(metrics)) {
        const row = ((out[group] ||= {})[name] ||= new Array(results.length).fill(null));
        row[i] = v === null ? null : +v.toFixed(3);
      }
    }
  });
  return out;
}

function mean(values) {
  const v = values.filter((x) => x !== null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

const fmt = (v) => (v === null ? '-' : Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) < 1 && v !== 0 ? v.toFixed(2) : v.toFixed(1));

/** The statistics: {group: {metric: [value per seed]}}, groups being the cats and 'fish'. */
function printTable(metrics) {
  const groups = Object.keys(metrics).filter((g) => g !== 'fish');
  const names = [...new Set(groups.flatMap((g) => Object.keys(metrics[g])))].filter((n) => !n.startsWith('max px'));
  const width = Math.max(...names.map((n) => n.length)) + 2;
  console.log(''.padEnd(width) + groups.map((g) => g.padStart(9)).join(''));
  let section = '';
  for (const name of names) {
    const head = name.split(/[:%]/)[0];
    if (head !== section) {
      section = head;
      console.log('');
    }
    console.log(name.padEnd(width) + groups.map((g) => fmt(mean((metrics[g] || {})[name] || [null])).padStart(9)).join(''));
  }
  console.log('\nfish');
  for (const [name, values] of Object.entries(metrics.fish)) console.log('  ' + name.padEnd(width - 2) + fmt(mean(values)).padStart(9));
}

/** Trust and hours to the next meal deadline at the end of each session, averaged over seeds. */
function printTimelines(results) {
  const cats = Object.keys(results[0].timelines);
  const rows = results[0].timelines[cats[0]].length;
  if (rows < 2) return;
  console.log('\nAt the end of each day (trust / hours to next meal deadline; mean over seeds)');
  console.log('day'.padEnd(6) + cats.map((c) => c.padStart(16)).join(''));
  for (let i = 0; i < rows; i++) {
    const cell = (c) => {
      const pts = results.map((r) => r.timelines[c][i]).filter(Boolean);
      return `${mean(pts.map((p) => p.trust)).toFixed(2)} / ${mean(pts.map((p) => p.mealInH)).toFixed(1)}h`.padStart(16);
    };
    console.log(String(Math.floor(results[0].timelines[cats[0]][i].day) + 1).padEnd(6) + cats.map(cell).join(''));
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const seeds = Array.from({ length: opts.seeds }, (_, i) => i + 1);
  const openHours = sessions(opts).reduce((h, s) => h + (s.end - s.start) / HOUR_MS, 0);
  console.log(`Simulating ${scheduleLabel(opts)} (${openHours} h open), feeder '${opts.feeder}', ${seeds.length} seeds${opts.parallel ? ' in parallel' : ''}, ${layout.width}x${layout.height} window`);

  const results = await runSeeds(seeds, opts);
  const metrics = collect(results);
  console.log(`\nMeans over ${seeds.length} seeds (time % of open time; counts per open hour; distances in px; care over all time)`);
  printTable(metrics);
  printTimelines(results);

  // Invariants and errors, over all seeds.
  const violations = {};
  results.forEach((r, i) => {
    for (const [rule, v] of Object.entries(r.violations)) {
      const all = (violations[rule] ||= { count: 0, examples: [] });
      all.count += v.count;
      all.examples.push(...v.examples.map((e) => `seed ${seeds[i]}: ${e}`));
    }
    for (const e of r.errors) {
      const all = (violations['world.js error'] ||= { count: 0, examples: [] });
      all.count++;
      all.examples.push(`seed ${seeds[i]}: ${e}`);
    }
  });

  if (opts.snapshot) {
    fs.mkdirSync(SNAPSHOTS, { recursive: true });
    const file = path.join(SNAPSHOTS, `${opts.name}.json`);
    const snapshot = {
      meta: {
        name: opts.name,
        version: opts.version,
        ...gitInfo(),
        createdAt: new Date().toISOString(),
        window: `${layout.width}x${layout.height}`,
        schedule: scheduleLabel(opts),
        feeder: opts.feeder,
        seeds,
        frameHz: Math.round(1000 / FRAME_MS),
        inject: opts.injectDir === path.join(ROOT, 'inject') ? 'inject' : opts.injectDir,
      },
      violations,
      metrics,
      timelines: Object.fromEntries(seeds.map((s, i) => [`seed ${s}`, results[i].timelines])),
      heatmaps: Object.fromEntries(seeds.map((s, i) => [`seed ${s}`, results[i].heatmaps])),
    };
    fs.writeFileSync(file, JSON.stringify(snapshot, null, 1) + '\n');
    console.log(`\nSnapshot: ${path.relative(ROOT, file)}`);
  }

  const rules = Object.keys(violations);
  if (!rules.length) {
    console.log('\nPASS: no invariant broken, no errors.');
    return;
  }
  console.log('\nFAIL:');
  for (const rule of rules) {
    console.log(`  ${rule}: ${violations[rule].count}x`);
    for (const e of violations[rule].examples.slice(0, 5)) console.log(`    ${e}`);
  }
  process.exitCode = 1;
}

// A worker runs one seed and hands its result back to the main process.
if (process.argv[2] === '--worker') {
  const { seed, opts } = JSON.parse(process.argv[3]);
  simulate({ seed, opts })
    .then((r) => process.send(r, () => process.exit(0)))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
} else {
  main().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
}
