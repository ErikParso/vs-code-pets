// The time of day the cats' hunger is measured against (in ms, like Date.now). In VS Code the
// system clock; in the tests a virtual one.

export interface Clock {
  now(): number;
}

export const systemClock: Clock = { now: () => Date.now() };
