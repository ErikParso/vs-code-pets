// The person at the keyboard: when they click the 🐈‍⬛ in the status bar. Each feeder is a fixed
// rule (no randomness), so every run feeds the same way and only the cats' side varies by seed.
// A feeder sees what the person would see (which cats are asking for fish) and the clock, and
// says how many fish to throw this frame.
'use strict';

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

const ATTENTIVE_DELAY_MIN = 10; // notices a cat asking this long after it starts, then every so often
const DAILY_AT_HOURS = [10, 13, 16]; // the times of day a regular feeder throws a fish to each cat
const FORGETFUL_DAYS = [0, 2, 4]; // days of the week (0 = Monday) a forgetful feeder remembers
const SPAM_EVERY_MIN = 10;

const asking = (s, c) => s.now >= c.nextMealAt - s.constants.ASK_BEFORE;

/** Throws a fish every `everyMin` minutes of open time, whatever the cats want. */
function every(everyMin) {
  let next = null;
  return {
    startSession(startMs) {
      next = startMs + everyMin * MIN;
    },
    fishNow(s) {
      if (s.now < next) return 0;
      next += everyMin * MIN;
      return 1;
    },
  };
}

/** Throws a fish ATTENTIVE_DELAY_MIN after a cat starts asking, and again as long as one is. */
function attentive() {
  let next = null;
  return {
    startSession() {
      next = null;
    },
    fishNow(s) {
      if (!s.cats.some((c) => asking(s, c))) {
        next = null;
        return 0;
      }
      if (next === null) next = s.now + ATTENTIVE_DELAY_MIN * MIN;
      if (s.now < next) return 0;
      next = s.now + ATTENTIVE_DELAY_MIN * MIN;
      return 1;
    },
  };
}

/** At set times of day, one fish for each cat, on the days given (by weekday, 0 = Monday). */
function atTimes(catCount, hours, days) {
  let times = [];
  return {
    startSession(startMs, endMs, startOfWeekMs) {
      const dayStart = startMs - ((startMs - startOfWeekMs) % DAY);
      const weekday = Math.floor((dayStart - startOfWeekMs) / DAY) % 7;
      times = days.includes(weekday) ? hours.map((h) => dayStart + h * HOUR).filter((t) => t >= startMs && t < endMs) : [];
    },
    fishNow(s) {
      if (!times.length || s.now < times[0]) return 0;
      times.shift();
      return catCount;
    },
  };
}

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const FEEDERS = {
  attentive: () => attentive(),
  daily: (catCount) => atTimes(catCount, DAILY_AT_HOURS, ALL_DAYS),
  forgetful: (catCount) => atTimes(catCount, DAILY_AT_HOURS, FORGETFUL_DAYS),
  spammer: () => every(SPAM_EVERY_MIN),
  none: () => ({ startSession() {}, fishNow: () => 0 }),
};

function createFeeder(name, catCount) {
  if (!FEEDERS[name]) throw new Error(`No feeder '${name}' (have: ${Object.keys(FEEDERS).join(', ')})`);
  return FEEDERS[name](catCount);
}

module.exports = { createFeeder, every, FEEDER_NAMES: Object.keys(FEEDERS) };
