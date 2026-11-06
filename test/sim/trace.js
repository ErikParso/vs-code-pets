#!/usr/bin/env node
// The exact check: runs a fixed scenario and compares its event log, line by line, with the
// recorded reference in test/sim/traces/. Every action a cat starts (with where it is and where
// it's heading), every meal and every fish is a line. Same code, same seeds: same log. A
// change that is meant to leave behaviour alone (a refactor) must keep the log identical; the
// first line that differs is where behaviour changed. It also fails on any broken invariant.
//
//   node test/sim/trace.js              check against the reference
//   node test/sim/trace.js --record     record a new reference (after a behaviour change you meant)
//   node test/sim/trace.js --inject <dir>   check a copy of inject/ instead
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const sim = require('./simulation');

const TRACES = path.join(__dirname, 'traces');
// Two short working days: enough for every move, the first meals (on day 2) and a session
// change, in about a minute.
const SCENARIO = { days: 2, open: [9, 13], hours: null, feeder: 'attentive' };
const SEEDS = [1, 2];
const CONTEXT_LINES = 3;

const traceFile = (seed) => path.join(TRACES, `seed-${seed}.txt`);
const scenarioLabel = (seed) => `${sim.scheduleLabel(SCENARIO)}, feeder ${SCENARIO.feeder}, seed ${seed}`;
const body = (text) => text.split('\n').filter((l) => l && !l.startsWith('#'));

function header(seed) {
  let from = '?';
  try {
    from = execSync('git rev-parse --short HEAD', { cwd: sim.ROOT }).toString().trim();
  } catch (e) {
    // not a git checkout: recorded from an unknown commit
  }
  const version = JSON.parse(fs.readFileSync(path.join(sim.ROOT, 'package.json'), 'utf8')).version;
  return `# Pixel Cat event log: ${scenarioLabel(seed)}. Recorded from ${from} (v${version}).\n# Each line: seconds since Monday 00:00, then what happened. See test/sim/trace.js.\n`;
}

/** The first line where `actual` departs from `expected`, with the lines before it; null if equal. */
function firstDifference(expected, actual) {
  const n = Math.max(expected.length, actual.length);
  for (let i = 0; i < n; i++) {
    if (expected[i] !== actual[i]) return { line: i, before: expected.slice(Math.max(0, i - CONTEXT_LINES), i), expected: expected[i], actual: actual[i] };
  }
  return null;
}

async function main() {
  const args = process.argv.slice(2);
  const record = args.includes('--record');
  const injectAt = args.indexOf('--inject');
  const opts = { ...sim.DEFAULTS, ...SCENARIO, trace: true };
  if (injectAt >= 0) opts.injectDir = path.resolve(args[injectAt + 1]);

  console.log(`Event log of ${sim.scheduleLabel(SCENARIO)}, feeder ${SCENARIO.feeder}, seeds ${SEEDS.join(', ')}${record ? ' (recording)' : ''}`);
  const results = await sim.runSeeds(SEEDS, opts, { onDone: (seed, s) => console.log(`  seed ${seed}: ${s.toFixed(1)} s`) });
  const violations = sim.gatherViolations(results, SEEDS);
  if (sim.printViolations(violations)) {
    console.log(record ? '\nNot recorded: the run broke invariants.' : '');
    process.exitCode = 1;
    return;
  }

  if (record) {
    fs.mkdirSync(TRACES, { recursive: true });
    SEEDS.forEach((seed, i) => fs.writeFileSync(traceFile(seed), header(seed) + results[i].trace.join('\n') + '\n'));
    console.log(`\nRecorded ${SEEDS.map((s, i) => `seed ${s}: ${results[i].trace.length} lines`).join(', ')} in ${path.relative(sim.ROOT, TRACES)}`);
    return;
  }

  let same = true;
  SEEDS.forEach((seed, i) => {
    const file = traceFile(seed);
    if (!fs.existsSync(file)) throw new Error(`No reference ${path.relative(sim.ROOT, file)}; record one with --record`);
    const expected = body(fs.readFileSync(file, 'utf8'));
    const actual = results[i].trace;
    const diff = firstDifference(expected, actual);
    if (!diff) {
      console.log(`  seed ${seed}: identical (${actual.length} lines)`);
      return;
    }
    same = false;
    console.log(`\n  seed ${seed}: differs at line ${diff.line + 1} of ${expected.length} (now ${actual.length} lines)`);
    for (const l of diff.before) console.log(`      ${l}`);
    console.log(`    - ${diff.expected ?? '(end of reference)'}`);
    console.log(`    + ${diff.actual ?? '(end of run)'}`);
  });
  if (same) console.log('\nPASS: behaviour identical to the reference, no invariant broken.');
  else {
    console.log('\nFAIL: behaviour changed. If you meant it, record a new reference: npm run sim:trace:record');
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exitCode = 1;
});
