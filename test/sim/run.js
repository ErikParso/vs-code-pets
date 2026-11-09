#!/usr/bin/env node
// The statistical baseline: runs the cats in a VS Code window (layouts.js) on a virtual clock,
// checks they never break the rules of their world, prints what they did, and saves it as a
// snapshot to compare against after the next change (see compare.js).
//
// By default: a work week. VS Code is open Monday to Friday, 9:00-17:00, and closed the rest
// of the time (the clock runs on, so the cats get hungry overnight). An attentive person
// feeds them. 10 seeds, each in its own process, side by side.
//
//   node test/sim/run.js [--days 5] [--open 9-17]   a week of working days (Mon-Fri open)
//                        [--hours 4]                instead: one session this long, always open
//                        [--feeder attentive|daily|forgetful|spammer|none]
//                        [--yarn 30]                also throw a ball of yarn every 30 min open (default: none)
//                        [--seeds 10] [--serial] [--name v0.1.36] [--no-snapshot]
//                        [--src <dir>]              a copy of src/ to run instead, to try out a change
//
// Exits 1 if any invariant was broken or the cat script threw.
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { FEEDER_NAMES } = require('./feeders');
const sim = require('./simulation');

const SNAPSHOTS = path.join(__dirname, 'snapshots');
const DEFAULT_SEEDS = 10;

function parseArgs(argv) {
  const version = JSON.parse(fs.readFileSync(path.join(sim.ROOT, 'package.json'), 'utf8')).version;
  const opts = { ...sim.DEFAULTS, seeds: DEFAULT_SEEDS, parallel: true, name: `v${version}`, snapshot: true, version };
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
    else if (arg === '--yarn') opts.yarn = Number(value());
    else if (arg === '--seeds') opts.seeds = Number(value());
    else if (arg === '--serial') opts.parallel = false;
    else if (arg === '--name') opts.name = value();
    else if (arg === '--no-snapshot') opts.snapshot = false;
    else if (arg === '--src') opts.srcDir = path.resolve(value());
    else throw new Error(`Unknown option ${arg}`);
  }
  const [from, to] = opts.open;
  if (!(from >= 0 && to <= 24 && from < to)) throw new Error(`--open must be like 9-17, got ${opts.open.join('-')}`);
  if (opts.hours !== null && !(opts.hours > 0)) throw new Error(`--hours must be positive, got ${opts.hours}`);
  if (!(opts.days >= 1) || !(opts.seeds >= 1)) throw new Error(`Bad options: ${JSON.stringify(opts)}`);
  if (!FEEDER_NAMES.includes(opts.feeder)) throw new Error(`No feeder '${opts.feeder}' (have: ${FEEDER_NAMES.join(', ')})`);
  if (opts.yarn !== null && !(opts.yarn > 0)) throw new Error(`--yarn must be minutes, got ${opts.yarn}`);
  return opts;
}

function gitInfo() {
  try {
    const commit = execSync('git rev-parse --short HEAD', { cwd: sim.ROOT }).toString().trim();
    const dirty = execSync('git status --porcelain -- src/world src/browser', { cwd: sim.ROOT }).toString().trim() !== '';
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
  const groups = Object.keys(metrics).filter((g) => g !== 'fish' && g !== 'yarn');
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
  if (!metrics.yarn) return;
  console.log('\nyarn');
  for (const [name, values] of Object.entries(metrics.yarn)) console.log('  ' + name.padEnd(width - 2) + fmt(mean(values)).padStart(9));
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
  const openHours = sim.sessions(opts).reduce((h, s) => h + (s.end - s.start) / sim.HOUR_MS, 0);
  console.log(
    `Simulating ${sim.scheduleLabel(opts)} (${openHours} h open), feeder '${opts.feeder}'${opts.yarn ? `, a ball of yarn every ${opts.yarn} min` : ''}, ${seeds.length} seeds${opts.parallel ? ' in parallel' : ''}, ${sim.layout.width}x${sim.layout.height} window`
  );

  const results = await sim.runSeeds(seeds, opts, { parallel: opts.parallel, onDone: (seed, s) => console.log(`  seed ${seed}: ${s.toFixed(1)} s`) });
  const metrics = collect(results);
  console.log(`\nMeans over ${seeds.length} seeds (time % of open time; counts per open hour; distances in px; care over all time)`);
  printTable(metrics);
  printTimelines(results);
  const violations = sim.gatherViolations(results, seeds);

  if (opts.snapshot) {
    fs.mkdirSync(SNAPSHOTS, { recursive: true });
    const file = path.join(SNAPSHOTS, `${opts.name}.json`);
    const snapshot = {
      meta: {
        name: opts.name,
        version: opts.version,
        ...gitInfo(),
        createdAt: new Date().toISOString(),
        window: `${sim.layout.width}x${sim.layout.height}`,
        schedule: sim.scheduleLabel(opts),
        feeder: opts.feeder,
        ...(opts.yarn ? { yarnEveryMin: opts.yarn } : {}),
        seeds,
        frameHz: Math.round(1000 / sim.FRAME_MS),
        src: opts.srcDir === sim.DEFAULTS.srcDir ? 'src' : opts.srcDir,
      },
      violations,
      metrics,
      timelines: Object.fromEntries(seeds.map((s, i) => [`seed ${s}`, results[i].timelines])),
      heatmaps: Object.fromEntries(seeds.map((s, i) => [`seed ${s}`, results[i].heatmaps])),
    };
    fs.writeFileSync(file, JSON.stringify(snapshot, null, 1) + '\n');
    console.log(`\nSnapshot: ${path.relative(sim.ROOT, file)}`);
  }

  if (sim.printViolations(violations)) process.exitCode = 1;
  else console.log('\nPASS: no invariant broken, no errors.');
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
