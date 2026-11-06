#!/usr/bin/env node
// Compares two snapshots from run.js: what changed in how the cats behave.
//
//   node test/sim/compare.js [before] [after] [--all]
//
// before/after are snapshot names (test/sim/snapshots/<name>.json); by default the two most
// recent. A change is marked * when it is larger than the run-to-run noise between seeds
// (more than twice its standard error). --all also lists what did not change.
'use strict';

const fs = require('fs');
const path = require('path');

const SNAPSHOTS = path.join(__dirname, 'snapshots');
const NOISE_SIGMAS = 2;

function load(name) {
  const file = path.join(SNAPSHOTS, name.endsWith('.json') ? name : `${name}.json`);
  if (!fs.existsSync(file)) throw new Error(`No snapshot ${file}`);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function latestTwo() {
  const all = fs
    .readdirSync(SNAPSHOTS)
    .filter((f) => f.endsWith('.json'))
    .map((f) => load(f))
    .sort((a, b) => a.meta.createdAt.localeCompare(b.meta.createdAt));
  if (all.length < 2) throw new Error(`Need two snapshots in ${SNAPSHOTS} to compare; found ${all.length}`);
  return all.slice(-2);
}

/** Mean and standard error of the per-seed values (nulls left out). */
function stats(values) {
  const v = (values || []).filter((x) => x !== null);
  if (!v.length) return null;
  const mean = v.reduce((a, b) => a + b, 0) / v.length;
  const variance = v.length > 1 ? v.reduce((a, b) => a + (b - mean) ** 2, 0) / (v.length - 1) : 0;
  return { mean, se: Math.sqrt(variance / v.length) };
}

const fmt = (v) => (v === null || v === undefined ? '-' : Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(1));

function main() {
  const args = process.argv.slice(2);
  const all = args.includes('--all');
  const names = args.filter((a) => !a.startsWith('--'));
  const [a, b] = names.length >= 2 ? [load(names[0]), load(names[1])] : latestTwo();

  const describe = (s) =>
    `${s.meta.name} (${s.meta.version}, ${s.meta.commit || '?'}${s.meta.dirty ? '+changes' : ''}; ${s.meta.schedule || s.meta.hours + ' h'}, feeder ${s.meta.feeder || '-'}, ${s.meta.seeds.length} seeds)`;
  console.log(`before: ${describe(a)}\nafter:  ${describe(b)}`);
  for (const key of ['window', 'schedule', 'feeder']) {
    if (a.meta[key] !== b.meta[key]) console.log(`  note: ${key} differs (${a.meta[key]} vs ${b.meta[key]}), so not all changes are the code's`);
  }

  const groups = [...new Set([...Object.keys(a.metrics), ...Object.keys(b.metrics)])];
  let shown = 0;
  let changed = 0;
  for (const group of groups) {
    const rows = [];
    const metricNames = [...new Set([...Object.keys(a.metrics[group] || {}), ...Object.keys(b.metrics[group] || {})])];
    for (const name of metricNames) {
      const sa = stats((a.metrics[group] || {})[name]);
      const sb = stats((b.metrics[group] || {})[name]);
      if (!sa && !sb) continue;
      const delta = sa && sb ? sb.mean - sa.mean : null;
      const noise = sa && sb ? NOISE_SIGMAS * Math.sqrt(sa.se ** 2 + sb.se ** 2) : 0;
      // With identical code and seeds the runs are identical, so any difference then is real.
      const significant = delta === null ? true : Math.abs(delta) > noise && Math.abs(delta) > 1e-9;
      if (significant) changed++;
      if (!significant && !all) continue;
      const rel = sa && sb && Math.abs(sa.mean) > 1e-9 ? ` (${delta >= 0 ? '+' : ''}${((100 * delta) / Math.abs(sa.mean)).toFixed(0)}%)` : '';
      rows.push(
        `  ${significant ? '*' : ' '} ${name.padEnd(30)} ${fmt(sa && sa.mean).padStart(8)} -> ${fmt(sb && sb.mean).padStart(8)}   ${delta === null ? '' : (delta >= 0 ? '+' : '') + fmt(delta)}${rel}`
      );
    }
    if (!rows.length) continue;
    shown += rows.length;
    console.log(`\n${group}`);
    for (const r of rows) console.log(r);
  }
  if (!shown) console.log('\nNo change beyond noise.');
  else console.log(`\n${changed} metric(s) changed beyond noise (* = more than ${NOISE_SIGMAS} standard errors).`);

  const rules = [...new Set([...Object.keys(a.violations), ...Object.keys(b.violations)])];
  if (rules.length) {
    console.log('\nInvariant violations');
    for (const r of rules) console.log(`  ${r.padEnd(32)} ${String((a.violations[r] || { count: 0 }).count).padStart(6)} -> ${String((b.violations[r] || { count: 0 }).count).padStart(6)}`);
  }
}

try {
  main();
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
}
