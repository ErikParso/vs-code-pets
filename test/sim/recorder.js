// Watches the world frame by frame (through World.view, see session.js) and turns it into
// statistics and invariant violations. It only reads the view; it never reaches into the World.
//
// A run is one or more sessions (VS Code open). Behaviour is measured over open time; hunger
// and trust over all time, since a cat's hunger keeps running while VS Code is closed.
'use strict';

const { floorName } = require('./layouts');

const MAX_ACTION_S = 180; // nothing a cat does should last this long (the longest nap is ~117 s)
const MAX_ABSENT_S = 5; // a cat that walks out of the only window walks straight back in
const HEAT_BINS = 20; // where along each floor the cats spend their time
const MAX_EXAMPLES = 5; // violations kept per rule; the rest are only counted
const DAY_S = 24 * 3600;
const HOUR_MS = 3600 * 1000;
const PHASES = ['fed', 'normal', 'asking', 'starving'];

// What a walk is for, read from the cat's flags when it sets off.
function walkLabel(c, firstSight, k) {
  if (firstSight) return 'arrive';
  if (c.leaving) return 'leave';
  if (c.toFish) return 'fish sprint';
  if (c.toYarn) return 'to yarn';
  if (c.toFriend) return 'to friend';
  if (c.toWall) return 'to wall';
  return c.speed > k.WALK_SPEED * 1.5 ? 'trot' : 'stroll';
}

// How far each kind of walk may go: MAX_WALK_DISTANCE plus where the cat ends up relative to
// its target (beside a friend or fish, just past the window edge).
const walkLimit = (label, k) => k.MAX_WALK_DISTANCE + (label === 'stroll' || label === 'trot' || label === 'to wall' ? 0 : k.catW) + 1;

// Where a cat is in its meal cycle: fed (ignores fish), normal (would eat), asking, starving.
// Each phase starts at a fixed time after its last meal.
function phaseStarts(fedAt, k) {
  return { normal: fedAt + k.EAT_AFTER, asking: fedAt + k.ASK_AFTER, starving: fedAt + k.STARVE_AFTER };
}
function phaseAt(fedAt, now, k) {
  const p = phaseStarts(fedAt, k);
  if (now >= p.starving) return 'starving';
  if (now >= p.asking) return 'asking';
  if (now >= p.normal) return 'normal';
  return 'fed';
}
/** Seconds in each phase between two times, with no meal in between (VS Code closed). */
function phaseSpans(fedAt, fromMs, toMs, k) {
  const p = phaseStarts(fedAt, k);
  const edges = [[-Infinity, p.normal, 'fed'], [p.normal, p.asking, 'normal'], [p.asking, p.starving, 'asking'], [p.starving, Infinity, 'starving']];
  const out = {};
  for (const [a, b, phase] of edges) out[phase] = Math.max(0, Math.min(b, toMs) - Math.max(a, fromMs)) / 1000;
  return out;
}

const n2 = (v) => (v === undefined || v === null ? '-' : v.toFixed(2));

class Recorder {
  /** `trace`: an array to append the run's event log to (see trace.js), or null. */
  constructor({ catNames, trace = null }) {
    this.catNames = catNames;
    this.trace = trace;
    this.T = 0; // seconds since the run started, open or closed
    this.open = 0; // seconds VS Code has been open
    this.sessionStart = 0;
    this.lastSession = null; // {T, now, k} when the last session ended
    this.cats = Object.fromEntries(catNames.map((n) => [n, newCatStats()]));
    this.fish = new Map(); // id -> {thrownAt, landedAt, eatAt, last}
    this.fishDone = { eaten: 0, fell: 0, pushedOut: 0, waits: [] };
    this.yarn = new Map(); // id -> {landedAt, plays, last}
    this.yarnDone = { fell: 0, pushedOut: 0, plays: [], lifetimes: [] };
    this.violations = {};
  }

  // One line of the event log: the time, then what happened.
  log(text) {
    if (this.trace) this.trace.push(`${this.T.toFixed(3)} ${text}`);
  }

  violate(rule, detail) {
    const v = (this.violations[rule] ||= { count: 0, examples: [] });
    v.count++;
    if (v.examples.length < MAX_EXAMPLES) v.examples.push(`t=${fmtTime(this.T)} ${detail}`);
  }

  /** VS Code opens: a new window at `T` seconds into the run. */
  startSession(T, nowMs) {
    this.T = T;
    this.sessionStart = T;
    this.log('open');
    const last = this.lastSession;
    if (!last) return;
    // While it was closed, each cat's hunger ran on.
    for (const st of Object.values(this.cats)) {
      if (!st.care) continue;
      const spans = phaseSpans(st.care.fedAt, last.now, nowMs, last.k);
      for (const phase of PHASES) st.hungerAll[phase] += spans[phase];
      st.expectCare = st.care; // it should come back exactly as saved
    }
  }

  /** VS Code closes: every cat's visit ends with the window. */
  endSession(T, nowMs, k) {
    this.T = T;
    this.log('close');
    for (const [name, st] of Object.entries(this.cats)) {
      if (st.prev) {
        st.care = { fedAt: st.prev.fedAt, trust: st.prev.trust };
        this.endVisit(st);
      }
      if (st.care) this.log(`${name} care deadline=${(st.care.fedAt + k.STARVE_AFTER).toFixed(0)} trust=${st.care.trust.toFixed(4)}`);
      if (st.care) st.timeline.push({ day: +(T / DAY_S).toFixed(3), trust: +st.care.trust.toFixed(3), mealInH: +((st.care.fedAt + k.STARVE_AFTER - nowMs) / HOUR_MS).toFixed(2) });
    }
    this.lastSession = { T, now: nowMs, k };
  }

  /** One frame: `s` is the session's view, `T` seconds since the start, `dt` the frame length. */
  sample(s, T, dt) {
    this.T = T;
    this.open += dt;
    const k = s.constants;
    const here = new Set();
    for (const c of s.cats) {
      here.add(c.name);
      this.sampleCat(c, s, k, dt);
    }
    for (const name of this.catNames) {
      const st = this.cats[name];
      if (here.has(name)) continue;
      if (st.prev) {
        st.care = { fedAt: st.prev.fedAt, trust: st.prev.trust };
        this.endVisit(st);
      }
      if (T - Math.max(st.lastSeen, this.sessionStart) > MAX_ABSENT_S && !st.absentReported) {
        st.absentReported = true;
        this.violate('cat missing', `${name} not in the window for over ${MAX_ABSENT_S}s`);
      }
    }
    this.sampleFish(s, T);
    this.sampleYarn(s, T);
  }

  // Walked out of the window (it may already be back, as a new visit).
  endVisit(st) {
    this.endAction(st);
    st.visits.push(this.T - st.visitStart);
    st.prev = null;
    st.action = null;
  }

  sampleCat(c, s, k, dt) {
    const st = this.cats[c.name];
    if (st.prev && st.prev.visit !== c.visit) {
      st.care = { fedAt: st.prev.fedAt, trust: st.prev.trust };
      this.endVisit(st);
    }
    const p = st.prev;
    st.lastSeen = this.T;
    st.absentReported = false;
    if (!p) {
      st.visitStart = this.T;
      this.checkCareKept(c, st);
    }
    if (st.trustStart === null) st.trustStart = c.trust;

    // A new action: a new state, or the same state started over: its clock went back, or did
    // not move on while the walk changed (a walk can end and the next start in one frame,
    // both at t=0).
    const restarted = c.t < p?.t - 1e-9 || (c.t <= p?.t && (c.tx !== p.tx || c.speed !== p.speed || c.leaving !== p.leaving));
    if (!p || c.state !== p.state || restarted) {
      this.endAction(st);
      const label = this.startAction(st, c, p, s, k);
      st.action = { label, state: c.state, start: this.T, reported: false };
      this.log(`${c.name} ${label} state=${c.state} x=${n2(c.x)} y=${n2(c.y)} tx=${n2(c.tx)} dur=${n2(c.dur)}`);
    }

    // Where the time goes.
    const timeLabel = st.action.label;
    st.time[timeLabel] = (st.time[timeLabel] || 0) + dt;
    const where = c.floor ? floorName(c.floor.y) : 'wall or air';
    st.floorTime[where] = (st.floorTime[where] || 0) + dt;
    if (c.floor) {
      const bins = (st.heat[where] ||= new Array(HEAT_BINS).fill(0));
      const i = Math.min(HEAT_BINS - 1, Math.max(0, Math.floor(((c.x - c.floor.x1) / (c.floor.x2 - c.floor.x1)) * HEAT_BINS)));
      bins[i] += dt;
    }
    const phase = phaseAt(c.fedAt, s.now, k);
    st.hungerOpen[phase] += dt;
    st.hungerAll[phase] += dt;

    this.checkCat(c, s, k, st);
    this.checkCare(c, p, s, k);
    if (p && finished(p, c, 'play') && c.trust !== p.trust) st.rewardedPlays++;
    st.prev = c;
  }

  // Counts what just started and returns the label its time is booked under.
  startAction(st, c, p, s, k) {
    const count = (name) => (st.counts[name] = (st.counts[name] || 0) + 1);
    const prevLabel = st.action ? st.action.label : null;
    switch (c.state) {
      case 'walk': {
        const label = walkLabel(c, !p, k);
        count(label);
        // Arriving, it starts off-screen at the window edge; tx is where it stops.
        const d = Math.abs(c.tx - c.x);
        (st.dist[label] ||= []).push(d);
        if (d > walkLimit(label, k)) this.violate('walk too far', `${c.name} ${label} ${d.toFixed(0)}px (limit ${walkLimit(label, k).toFixed(0)})`);
        return label;
      }
      case 'sleep': {
        const label = prevLabel === 'to friend' ? 'nap snuggled' : 'nap alone';
        count(label);
        return label;
      }
      case 'crouch':
        if (!c.floor) {
          count('jump');
          return 'jump';
        }
        // Landing: booked with whatever brought it here.
        return prevLabel === 'climb' || prevLabel === 'slide' ? prevLabel : 'jump';
      case 'air':
        if (p && p.state === 'wallhop') {
          count('climb up');
          return 'climb';
        }
        return prevLabel === 'climb' ? 'climb' : 'jump';
      case 'wallhop':
        if (!p || p.state !== 'wallhop') count('climb');
        return 'climb';
      case 'slide':
        if (p && p.state === 'wallhop') {
          count('climb give-up');
          return 'climb';
        }
        count('slide down');
        return 'slide';
      case 'eat':
        count('meal');
        this.recordMeal(st, c, s, k);
        return 'eat';
      case 'play':
        count('play');
        return 'play';
      default:
        return c.state; // sit
    }
  }

  // A meal starts: was it on time, and how long had the cat been asking?
  recordMeal(st, c, s, k) {
    const phase = phaseAt(c.fedAt, s.now, k);
    if (phase === 'fed') this.violate('ate while fed', `${c.name} ate ${((s.now - c.fedAt) / HOUR_MS).toFixed(1)}h after its last meal`);
    if (phase === 'starving') st.lateMeals++;
    this.log(`${c.name} meal ${phase} deadline=${(c.fedAt + k.STARVE_AFTER).toFixed(0)} trust=${c.trust.toFixed(4)}`);
    const askingSince = phaseStarts(c.fedAt, k).asking;
    if (s.now >= askingSince) st.askWaits.push((s.now - askingSince) / HOUR_MS);
    else st.mealsBeforeAsking++;
  }

  endAction(st) {
    const a = st.action;
    if (!a) return;
    if (a.state === 'sleep') st.naps.push(this.T - a.start);
  }

  // A cat coming into a new window has the last meal and trust it had when it left.
  checkCareKept(c, st) {
    const want = st.expectCare;
    st.expectCare = null;
    if (!want) return;
    if (c.fedAt !== want.fedAt || Math.abs(c.trust - want.trust) > 1e-9) {
      this.violate('care not kept', `${c.name} came back fed at ${c.fedAt}, trust ${c.trust}; left with ${want.fedAt}, ${want.trust}`);
    }
  }

  checkCare(c, p, s, k) {
    if (!(c.trust >= 0 && c.trust <= 1)) this.violate('trust out of range', `${c.name} trust ${c.trust}`);
    if (c.fedAt > s.now + 1000) {
      this.violate('fed in the future', `${c.name} fed ${((c.fedAt - s.now) / HOUR_MS).toFixed(1)}h from now`);
    }
    // The last meal changes only when a meal is finished; trust also when a play is.
    if (!p) return;
    const ate = finished(p, c, 'eat');
    if (!ate && p.fedAt !== c.fedAt) {
      this.violate('fed without a meal', `${c.name} fed at ${p.fedAt}->${c.fedAt}`);
    }
    if (!ate && !finished(p, c, 'play') && p.trust !== c.trust) {
      this.violate('trust changed without a meal or play', `${c.name} trust ${p.trust}->${c.trust}`);
    }
  }

  checkCat(c, s, k, st) {
    const name = c.name;
    for (const key of ['x', 'y', 't']) {
      if (!Number.isFinite(c[key])) this.violate('not a number', `${name}.${key} = ${c[key]}`);
    }
    if (c.x < -k.catW - 1 || c.x > s.W + k.catW + 1) this.violate('outside window', `${name} at x=${c.x.toFixed(0)} (${c.state})`);
    if (c.floor) {
      if (Math.abs(c.y - c.floor.y) > 0.5) this.violate('off its floor', `${name} y=${c.y.toFixed(1)} on floor y=${c.floor.y}`);
      if (!s.floors.some((f) => f.y === c.floor.y && f.x1 === c.floor.x1 && f.x2 === c.floor.x2)) {
        this.violate('on a floor that is not there', `${name} on ${JSON.stringify(c.floor)}`);
      }
      const label = st.action.label;
      const offEnd = c.x < c.floor.x1 - k.EDGE - 1 || c.x > c.floor.x2 + k.EDGE + 1;
      if (offEnd && label !== 'arrive' && label !== 'leave') {
        this.violate('past the end of its floor', `${name} x=${c.x.toFixed(0)} floor ${c.floor.x1}..${c.floor.x2} (${label})`);
      }
    }
    const a = st.action;
    if (!a.reported && this.T - a.start > MAX_ACTION_S) {
      a.reported = true;
      this.violate('stuck', `${name} has been '${a.label}' for over ${MAX_ACTION_S}s`);
    }
  }

  sampleFish(s, T) {
    const seen = new Set();
    for (const g of s.fishes) {
      seen.add(g.id);
      let f = this.fish.get(g.id);
      if (!f) {
        this.fish.set(g.id, (f = { thrownAt: T, landedAt: null, eatAt: null, last: g }));
        this.log(`fish ${g.id} thrown`);
      }
      if (g.landed && f.landedAt === null) {
        f.landedAt = T;
        this.log(`fish ${g.id} landed x=${n2(g.x)} y=${n2(g.y)}`);
      }
      if (g.eater && f.eatAt === null) f.eatAt = T;
      if (!Number.isFinite(g.x) || !Number.isFinite(g.y)) this.violate('not a number', `fish ${g.id} at ${g.x},${g.y}`);
      f.last = g;
    }
    for (const [id, f] of this.fish) {
      if (seen.has(id)) continue;
      this.fish.delete(id);
      if (f.last.eater) {
        this.fishDone.eaten++;
        if (f.landedAt !== null) this.fishDone.waits.push(f.eatAt - f.landedAt);
        this.log(`fish ${id} eaten by ${f.last.eater}`);
      } else if (f.last.falling) {
        this.fishDone.fell++;
        this.log(`fish ${id} fell off`);
      } else if (f.last.fading) {
        this.fishDone.pushedOut++;
        this.log(`fish ${id} pushed out`);
      } else this.violate('fish vanished', `fish ${id} disappeared without being eaten or fading`);
    }
  }

  // Balls of yarn: how often each is played with, and how long it lasts before it rolls off the
  // end of its floor (or is pushed out by newer ones).
  sampleYarn(s, T) {
    const seen = new Set();
    for (const g of s.yarns) {
      seen.add(g.id);
      let y = this.yarn.get(g.id);
      if (!y) {
        this.yarn.set(g.id, (y = { landedAt: null, plays: 0, last: g }));
        this.log(`yarn ${g.id} thrown`);
      }
      if (g.landed && y.landedAt === null) {
        y.landedAt = T;
        this.log(`yarn ${g.id} landed x=${n2(g.x)} y=${n2(g.y)}`);
      }
      if (g.player && !y.last.player) {
        y.plays++;
        this.log(`yarn ${g.id} played with by ${g.player}`);
      }
      if (!Number.isFinite(g.x) || !Number.isFinite(g.y)) this.violate('not a number', `yarn ${g.id} at ${g.x},${g.y}`);
      y.last = g;
    }
    for (const [id, y] of this.yarn) {
      if (seen.has(id)) continue;
      this.yarn.delete(id);
      this.yarnDone.plays.push(y.plays);
      if (y.landedAt !== null) this.yarnDone.lifetimes.push(T - y.landedAt);
      if (y.last.falling) {
        this.yarnDone.fell++;
        this.log(`yarn ${id} fell off`);
      } else if (y.last.fading) {
        this.yarnDone.pushedOut++;
        this.log(`yarn ${id} pushed out`);
      } else this.violate('yarn vanished', `yarn ${id} disappeared without falling off or fading`);
    }
  }

  /** The fish (and yarn) left lying when VS Code closes go with the window. */
  dropFish() {
    this.fishLeftAtClose = (this.fishLeftAtClose || 0) + this.fish.size;
    this.fish.clear();
    this.yarnLeftAtClose = (this.yarnLeftAtClose || 0) + this.yarn.size;
    for (const y of this.yarn.values()) this.yarnDone.plays.push(y.plays);
    this.yarn.clear();
  }

  /** The statistics of the run, as {group: {metric: number|null}}, plus per-cat timelines. */
  finish(fishThrown, yarnThrown = null) {
    const hours = this.open / 3600;
    const metrics = {};
    const heatmaps = {};
    const timelines = {};
    const pct = (v) => (100 * v) / this.open;
    const perHour = (v) => (v || 0) / hours;
    const mean = (list) => (list && list.length ? list.reduce((a, b) => a + b, 0) / list.length : null);

    for (const name of this.catNames) {
      const st = this.cats[name];
      this.endAction(st);
      const m = {};
      for (const label of TIME_LABELS) m[`time % ${label}`] = pct(st.time[label] || 0);
      const asleep = (st.time['nap alone'] || 0) + (st.time['nap snuggled'] || 0);
      m['time % asleep (all)'] = pct(asleep);
      m['time % on the move'] = pct(MOVING.reduce((sum, l) => sum + (st.time[l] || 0), 0));
      m['snuggled share of sleep %'] = asleep ? (100 * (st.time['nap snuggled'] || 0)) / asleep : null;
      for (const label of COUNT_LABELS) m[`per hour: ${label}`] = perHour(st.counts[label]);
      m['climb success %'] = st.counts.climb ? (100 * (st.counts['climb up'] || 0)) / st.counts.climb : null;
      for (const label of WALK_LABELS) m[`mean px: ${label}`] = mean(st.dist[label]);
      for (const label of WALK_LABELS) m[`max px: ${label}`] = st.dist[label] && st.dist[label].length ? Math.max(...st.dist[label]) : null;
      m['mean nap s'] = mean(st.naps);
      m['mean visit min'] = st.visits.length ? mean(st.visits) / 60 : null;
      for (const [floor, t] of Object.entries(st.floorTime)) m[`floor % ${floor}`] = pct(t);

      // Hunger and trust.
      const allTime = PHASES.reduce((sum, ph) => sum + st.hungerAll[ph], 0);
      const meals = st.counts.meal || 0;
      for (const ph of PHASES) m[`care: % of all time ${ph}`] = allTime ? (100 * st.hungerAll[ph]) / allTime : null;
      m['care: % of open time asking'] = pct(st.hungerOpen.asking);
      m['care: % of open time starving'] = pct(st.hungerOpen.starving);
      m['care: meals'] = meals;
      m['care: meals per day'] = allTime ? meals / (allTime / DAY_S) : null;
      m['care: late meals %'] = meals ? (100 * st.lateMeals) / meals : null;
      m['care: meals before asking'] = st.mealsBeforeAsking;
      m['care: mean h asking before fed'] = mean(st.askWaits);
      m['care: max h asking before fed'] = st.askWaits.length ? Math.max(...st.askWaits) : null;
      const trustEnd = st.care ? st.care.trust : st.prev ? st.prev.trust : st.trustStart;
      m['care: rewarded plays'] = st.rewardedPlays;
      m['care: trust start'] = st.trustStart;
      m['care: trust end'] = trustEnd;
      m['care: trust change'] = st.trustStart === null ? null : trustEnd - st.trustStart;
      metrics[name] = m;
      heatmaps[name] = Object.fromEntries(Object.entries(st.heat).map(([f, bins]) => [f, bins.map((v) => +pct(v).toFixed(2))]));
      timelines[name] = st.timeline;
    }

    const done = this.fishDone;
    const ended = done.eaten + done.fell + done.pushedOut;
    const share = (v) => (ended ? (100 * v) / ended : null);
    const waits = done.waits.slice().sort((a, b) => a - b);
    metrics.fish = {
      thrown: fishThrown,
      'eaten %': share(done.eaten),
      'fell off %': share(done.fell),
      'pushed out %': share(done.pushedOut),
      'left when VS Code closed': this.fishLeftAtClose || 0,
      'still out at end': this.fish.size,
      'mean s landing to eaten': mean(waits),
      'median s landing to eaten': waits.length ? waits[waits.length >> 1] : null,
    };
    if (yarnThrown !== null) {
      const y = this.yarnDone;
      const gone = y.fell + y.pushedOut;
      metrics.yarn = {
        thrown: yarnThrown,
        'fell off %': gone ? (100 * y.fell) / gone : null,
        'pushed out %': gone ? (100 * y.pushedOut) / gone : null,
        'left when VS Code closed': this.yarnLeftAtClose || 0,
        'plays per ball': mean(y.plays),
        'mean min landing to gone': y.lifetimes.length ? mean(y.lifetimes) / 60 : null,
      };
    }
    return { metrics, heatmaps, timelines, violations: this.violations, trace: this.trace };
  }
}

const TIME_LABELS = ['sit', 'stroll', 'trot', 'to wall', 'to friend', 'fish sprint', 'to yarn', 'arrive', 'leave', 'nap alone', 'nap snuggled', 'eat', 'play', 'jump', 'climb', 'slide'];
const MOVING = ['stroll', 'trot', 'to wall', 'to friend', 'fish sprint', 'to yarn', 'arrive', 'leave', 'jump', 'climb', 'slide'];
const WALK_LABELS = ['stroll', 'trot', 'to wall', 'to friend', 'fish sprint', 'to yarn', 'arrive', 'leave'];
const COUNT_LABELS = [...WALK_LABELS, 'nap alone', 'nap snuggled', 'jump', 'climb', 'climb up', 'climb give-up', 'slide down', 'meal', 'play'];

/** The cat was in `state` last sample and has left it now. */
function finished(p, c, state) {
  return p.state === state && c.state !== state;
}

function newCatStats() {
  return {
    prev: null,
    action: null,
    time: {},
    counts: {},
    dist: {},
    naps: [],
    visits: [],
    visitStart: 0,
    lastSeen: 0,
    absentReported: false,
    floorTime: {},
    heat: {},
    hungerOpen: { fed: 0, normal: 0, asking: 0, starving: 0 },
    hungerAll: { fed: 0, normal: 0, asking: 0, starving: 0 },
    lateMeals: 0,
    mealsBeforeAsking: 0,
    rewardedPlays: 0, // plays that earned trust
    askWaits: [],
    trustStart: null,
    care: null, // {fedAt, trust} as last seen, kept while the cat is away
    expectCare: null,
    timeline: [],
  };
}

function fmtTime(s) {
  const d = Math.floor(s / DAY_S);
  const h = Math.floor((s % DAY_S) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${d ? d + 'd' : ''}${h}h${String(m).padStart(2, '0')}m${(s % 60).toFixed(1).padStart(4, '0')}s`;
}

module.exports = { Recorder };
