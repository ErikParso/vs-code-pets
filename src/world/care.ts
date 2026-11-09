// A cat's care: when it last ate, how far it trusts you and when it last played. A meal on
// time earns trust, a late one costs it; a play earns some too, at most once every PLAY_REWARD_AFTER.
import { ASK_AFTER, COLLAR_TRUST, EAT_AFTER, HOUR, PLAY_REWARD_AFTER, STARVE_AFTER, TRUST_LATE, TRUST_ON_TIME, TRUST_PLAY, TRUST_START } from './config';
import type { Clock } from './clock';
import { clamp } from './math';

/** What is kept of a cat between windows and sessions. */
export interface SavedCare {
  fedAt: number; // ms, like Date.now
  trust: number; // 0..1
  playedAt?: number; // ms: its last play that earned trust
  packed?: boolean; // shut in its box (see boxes.ts): it does not roam
}

/** Where every cat's saved care is kept, by name. */
export interface CareStore {
  load(): Record<string, Partial<SavedCare>>;
  save(all: Record<string, Partial<SavedCare>>): void;
}

export class Care {
  private constructor(
    private readonly clock: Clock,
    private lastFed: number,
    private trustLevel: number,
    private lastPlayed: number
  ) {}

  /** A cat's care as it was saved, or a fresh one (just fed, its next play earning trust). */
  static restore(clock: Clock, saved?: Partial<SavedCare>): Care {
    const fedAt = typeof saved?.fedAt === 'number' ? saved.fedAt : clock.now();
    const trust = typeof saved?.trust === 'number' ? saved.trust : TRUST_START;
    const playedAt = typeof saved?.playedAt === 'number' ? saved.playedAt : 0;
    return new Care(clock, fedAt, trust, playedAt);
  }

  get fedAt(): number {
    return this.lastFed;
  }

  get trust(): number {
    return this.trustLevel;
  }

  get playedAt(): number {
    return this.lastPlayed;
  }

  /** It trusts you enough to wear its collar (and loses it again if its trust drops). */
  wearsCollar(): boolean {
    return this.trustLevel >= COLLAR_TRUST - 1e-9; // the epsilon is for float noise, as with the hearts
  }

  saved(): SavedCare {
    return { fedAt: this.lastFed, trust: this.trustLevel, playedAt: this.lastPlayed };
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

  /** It has played with a ball. Returns whether that earned trust (at most once every PLAY_REWARD_AFTER). */
  played(): boolean {
    const now = this.clock.now();
    if (now - this.lastPlayed < PLAY_REWARD_AFTER) return false;
    this.lastPlayed = now;
    this.addTrust(TRUST_PLAY);
    return true;
  }

  /** Debug: moves its last meal by `hours` (back: hungrier), keeping it between a starving cat's and now. */
  shiftFedAt(hours: number): void {
    this.lastFed = clamp(this.lastFed + hours * HOUR, this.clock.now() - STARVE_AFTER, this.clock.now());
  }

  /** Time since its last play that earned trust, in ms. */
  sincePlayed(): number {
    return this.clock.now() - this.lastPlayed;
  }

  /** Played (with trust earned) less than PLAY_REWARD_AFTER ago: a play now earns none. */
  happy(): boolean {
    return this.sincePlayed() < PLAY_REWARD_AFTER;
  }

  /** Debug: moves its last rewarded play by `hours` (back: rewarded again sooner), keeping it between ready and now. */
  shiftPlayedAt(hours: number): void {
    const now = this.clock.now();
    this.lastPlayed = clamp(this.lastPlayed + hours * HOUR, now - PLAY_REWARD_AFTER, now);
  }

  /** Debug: adds `delta` to trust, keeping it between 0 and 1. */
  addTrust(delta: number): void {
    this.trustLevel = clamp(this.trustLevel + delta, 0, 1);
  }
}
