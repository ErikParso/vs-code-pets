// A cat's hunger and trust: when it last ate, and how far it trusts you. Hunger is the only
// thing that changes them: a meal on time earns trust, a late one costs it.
import { ASK_AFTER, EAT_AFTER, HOUR, STARVE_AFTER, TRUST_LATE, TRUST_ON_TIME, TRUST_START } from './config';
import type { Clock } from './clock';
import { clamp } from './math';

/** What is kept of a cat between windows and sessions. */
export interface Care {
  fedAt: number; // ms, like Date.now
  trust: number; // 0..1
  packed?: boolean; // shut in its box (see boxes.ts): it does not roam
}

/** Where every cat's Care is kept, by name. */
export interface CareStore {
  load(): Record<string, Partial<Care>>;
  save(all: Record<string, Partial<Care>>): void;
}

export class Hunger {
  private constructor(
    private readonly clock: Clock,
    private lastFed: number,
    private trustLevel: number
  ) {}

  /** A cat's hunger as it was saved, or a fresh one (just fed). */
  static restore(clock: Clock, saved?: Partial<Care>): Hunger {
    const fedAt = typeof saved?.fedAt === 'number' ? saved.fedAt : clock.now();
    const trust = typeof saved?.trust === 'number' ? saved.trust : TRUST_START;
    return new Hunger(clock, fedAt, trust);
  }

  get fedAt(): number {
    return this.lastFed;
  }

  get trust(): number {
    return this.trustLevel;
  }

  care(): Care {
    return { fedAt: this.lastFed, trust: this.trustLevel };
  }

  /** Time since its last meal, in ms. */
  sinceFed(): number {
    return this.clock.now() - this.lastFed;
  }

  /** Not just fed: it would eat a fish now. */
  canEat(): boolean {
    return this.sinceFed() >= EAT_AFTER;
  }

  /** Some hours after a meal it starts asking for a fish. */
  asking(): boolean {
    return this.sinceFed() >= ASK_AFTER;
  }

  starving(): boolean {
    return this.sinceFed() >= STARVE_AFTER;
  }

  /** 0 just fed .. 1 starving. */
  level(): number {
    return clamp(this.sinceFed() / STARVE_AFTER, 0, 1);
  }

  /** It has eaten a fish. Returns whether that was on time (not starving). */
  eat(): boolean {
    const wasStarving = this.starving();
    this.trustLevel = clamp(this.trustLevel + (wasStarving ? -TRUST_LATE : TRUST_ON_TIME), 0, 1);
    this.lastFed = this.clock.now();
    return !wasStarving;
  }

  /** Debug: moves its last meal by `hours` (back: hungrier), keeping it between a starving cat's and now. */
  shiftFedAt(hours: number): void {
    this.lastFed = clamp(this.lastFed + hours * HOUR, this.clock.now() - STARVE_AFTER, this.clock.now());
  }

  /** Debug: adds `delta` to trust, keeping it between 0 and 1. */
  addTrust(delta: number): void {
    this.trustLevel = clamp(this.trustLevel + delta, 0, 1);
  }
}
