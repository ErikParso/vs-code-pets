// Your cats: the collection, kept in storage shared by every VS Code window. It starts as
// FIRST_CATS. Each cat goes the same way, one step at a time, from its box's button
// (its `step` is the next one, the one the button offers; a new cat's is its collar):
//   - at two hearts it may claim its collar, and wears it from then on;
//   - at five hearts, if there is a box free, it may bring a friend: a new cat, made up there and
//     then (a name, a coat by rarity, some energy), that starts out roaming;
//   - having brought its friend, it may go, and its box is free again.
// No progress can be lost this way: a cat only goes once it has brought its friend, so there are
// always as many cats still to bring theirs as there were at the start, and with every box full
// all the others may go.
// Each cat is kept as one record: what it is (its def) and its care, together. So a cat that goes
// takes its care with it, and there is no care without a cat.
import type { CatDef, Step } from './cat';
import { Care, halfHearts, type CareStore, type SavedCare } from './care';
import type { Clock } from './clock';
import { coatOf, rollCoat } from './coats';
import type { Random } from './random';

export const BOXES = 15; // the most cats you can have
export const COLLAR_HEARTS = 2; // the trust (in hearts) a cat claims its collar at
export const FRIEND_HEARTS = 5; // ... and brings its friend at
const ENERGY = [0.3, 1.2]; // a friend's, between Boris's (the laziest) and a bit livelier than Erik's

/** The cats a collection starts with. */
export const FIRST_CATS: readonly Omit<CatDef, 'step'>[] = [
  { id: 'jexit', name: 'Jexit', coat: 'red-tabby-and-white', energy: 0.7 },
  { id: 'erik', name: 'Erik', coat: 'tuxedo', energy: 1 },
  { id: 'boris', name: 'Boris', coat: 'brown-tabby-and-white', energy: 0.3 },
];

// prettier-ignore
const NAMES = [
  'Mochi', 'Pixel', 'Biscuit', 'Luna', 'Miso', 'Tofu', 'Nori', 'Pepper', 'Ziggy', 'Olive', 'Pumpkin', 'Socks',
  'Mittens', 'Ginger', 'Noodle', 'Waffle', 'Bean', 'Sushi', 'Kiwi', 'Pickle', 'Cocoa', 'Maple', 'Hazel', 'Juniper',
  'Felix', 'Oscar', 'Milo', 'Leo', 'Simba', 'Tiger', 'Smokey', 'Shadow', 'Ash', 'Dusty', 'Toffee', 'Fudge',
  'Muffin', 'Cookie', 'Peanut', 'Button', 'Bubbles', 'Snowball', 'Pebble', 'Clover', 'Willow', 'Poppy', 'Daisy', 'Ivy',
  'Nala', 'Cleo', 'Bella', 'Lily', 'Zelda', 'Yoshi', 'Sprite', 'Byte', 'Cache', 'Kernel', 'Lambda', 'Vector',
];

/** A cat as it is kept: its def and, once it has been out, its care. */
export interface CatRecord extends CatDef {
  care?: Partial<SavedCare>;
}

/** Where the collection is kept: null if it never was (then it starts as the first cats). */
export interface CatStore {
  load(): CatRecord[] | null;
  save(cats: CatRecord[]): void;
}

/** The colour of the collar `def` wears, or null if it has not claimed one. */
export function collarOf(def: CatDef): string | null {
  return def.step === 'collar' ? null : coatOf(def.coat).collar;
}

/**
 * Why `def`, which trusts you `trust`, cannot take its step now, in a collection of `count` cats,
 * as the player is told; null if it can.
 */
export function whyNot(def: CatDef, trust: number, count: number): string | null {
  if (def.step === 'collar' && halfHearts(trust) < 2 * COLLAR_HEARTS) return `Unlocks collar at ${COLLAR_HEARTS} hearts`;
  if (def.step === 'friend' && halfHearts(trust) < 2 * FRIEND_HEARTS) return `Brings a friend at ${FRIEND_HEARTS} hearts`;
  if (def.step === 'friend' && count >= BOXES) return 'Boxes are full';
  return null;
}

/** Whether `def`, which trusts you `trust`, can take its step now, in a collection of `count` cats. */
export function canTakeStep(def: CatDef, trust: number, count: number): boolean {
  return whyNot(def, trust, count) === null;
}

export class Collection {
  /** The cats' care, as the World keeps it: by id, read from and saved into their records. */
  readonly care: CareStore = {
    load: () => Object.fromEntries(this.records().map((r) => [r.id, r.care ?? {}])),
    // Only into cats still here: a cat gone (from another window, say) gets no care back.
    save: (all) => this.store.save(this.records().map((r) => (all[r.id] ? { ...r, care: all[r.id] } : r))),
  };

  constructor(
    private readonly store: CatStore,
    private readonly random: Random,
    private readonly clock: Clock
  ) {}

  /** Your cats, in the order they came. */
  cats(): CatDef[] {
    return this.records().map(({ care, ...def }) => def);
  }

  /**
   * `id` takes its step, if it can now (canTakeStep): checked here against what is saved, not
   * what a panel showed a moment ago, so a step is never taken twice or too soon.
   */
  takeStep(id: string): void {
    const records = this.records();
    const cat = records.find((c) => c.id === id);
    if (!cat) return; // gone already
    if (!canTakeStep(cat, Care.restore(this.clock, cat.care).trust, records.length)) return;
    const moveOn = (step: Step) => records.map((c) => (c === cat ? { ...c, step } : c));
    if (cat.step === 'collar') this.store.save(moveOn('friend'));
    if (cat.step === 'friend') this.store.save([...moveOn('depart'), this.makeUp(records)]);
    if (cat.step === 'depart') this.store.save(records.filter((c) => c !== cat)); // its care goes with it
  }

  /** Packs `id` in its box if it is out, lets it out if it is packed (world.ts does the rest). */
  togglePacked(id: string): void {
    this.store.save(this.records().map((c) => (c.id === id ? { ...c, care: { ...c.care, packed: !c.care?.packed } } : c)));
  }

  /** Your cats as they are kept, each with its care; the first time, the first cats. */
  records(): CatRecord[] {
    const saved = this.store.load();
    if (saved) return saved;
    const first = firstRecords();
    this.store.save(first);
    return first;
  }

  // A new cat: a name none of `cats` has (any, once all are taken), a coat by rarity, some energy.
  private makeUp(cats: readonly CatDef[]): CatDef {
    const taken = new Set(cats.map((c) => c.name));
    const free = NAMES.filter((n) => !taken.has(n));
    const name = this.random.oneOf(free.length ? free : NAMES);
    const id = `${name.toLowerCase()}-${this.clock.now().toString(36)}`;
    const energy = Math.round(this.random.between(ENERGY[0], ENERGY[1]) * 100) / 100;
    return { id, name, coat: rollCoat(this.random).id, energy, step: 'collar' };
  }
}

// FIRST_CATS, new to the collection: each at its first step, its collar.
function firstRecords(): CatRecord[] {
  return FIRST_CATS.map((c) => ({ ...c, step: 'collar' }));
}
