// A cat's hunger and trust: when its next meal is due, and how far it trusts you. Hunger is
// the only thing that changes them: a meal on time earns trust, a late one costs it, and each
// meal sets the next deadline.
import { ASK_BEFORE, EAT_AFTER, HOUR, NEXT_MEAL_AFTER, TRUST_LATE, TRUST_ON_TIME, TRUST_START } from './config';
import type { Clock } from './clock';
import { clamp } from './math';

/** What is kept of a cat between windows and sessions. */
export interface Care {
  nextMealAt: number; // ms, like Date.now
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
    private deadline: number,
    private trustLevel: number
  ) {}

  /** A cat's hunger as it was saved, or a fresh one (a day before its first meal). */
  static restore(clock: Clock, saved?: Partial<Care>): Hunger {
    const nextMealAt = typeof saved?.nextMealAt === 'number' ? saved.nextMealAt : clock.now() + NEXT_MEAL_AFTER;
    const trust = typeof saved?.trust === 'number' ? saved.trust : TRUST_START;
    return new Hunger(clock, nextMealAt, trust);
  }

  get nextMealAt(): number {
    return this.deadline;
  }

  get trust(): number {
    return this.trustLevel;
  }

  care(): Care {
    return { nextMealAt: this.deadline, trust: this.trustLevel };
  }

  /** Not just fed: it would eat a fish now. */
  canEat(): boolean {
    return this.deadline <= this.clock.now() + NEXT_MEAL_AFTER - EAT_AFTER;
  }

  /** In the last hours before its deadline it asks for a fish. */
  asking(): boolean {
    return this.clock.now() >= this.deadline - ASK_BEFORE;
  }

  starving(): boolean {
    return this.clock.now() >= this.deadline;
  }

  /** 0 just fed .. 1 at the deadline. */
  level(): number {
    return clamp(1 - (this.deadline - this.clock.now()) / NEXT_MEAL_AFTER, 0, 1);
  }

  /** It has eaten a fish. Returns whether that was on time (not starving). */
  eat(): boolean {
    const wasStarving = this.starving();
    this.trustLevel = clamp(this.trustLevel + (wasStarving ? -TRUST_LATE : TRUST_ON_TIME), 0, 1);
    this.deadline = this.clock.now() + NEXT_MEAL_AFTER;
    return !wasStarving;
  }

  /** Debug: moves the deadline by `hours`, keeping it between now and a full meal away. */
  shiftDeadline(hours: number): void {
    this.deadline = clamp(this.deadline + hours * HOUR, this.clock.now(), this.clock.now() + NEXT_MEAL_AFTER);
  }

  /** Debug: adds `delta` to trust, keeping it between 0 and 1. */
  addTrust(delta: number): void {
    this.trustLevel = clamp(this.trustLevel + delta, 0, 1);
  }
}
