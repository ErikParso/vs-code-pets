// What the cat boxes panel shows of each cat: its name and coat, its trust in hearts, how full
// it is in fish, and whether it is packed in its box. Read from the care store, which every
// VS Code window shares, so every cat shows the same wherever it is roaming.
import type { CatDef } from './cat';
import type { Clock } from './clock';
import { STARVE_AFTER } from './config';
import { Hunger, type CareStore } from './hunger';
import { clamp } from './math';

export const HEARTS = 5; // trust 1 is all five; they fill in halves
export const FISH = 5; // a full meal is all five
export const SPARE_BOXES = 12; // empty boxes after the cats', for cats still to come

export interface CatBox {
  name: string;
  coat: string;
  halfHearts: number; // 0..2*HEARTS
  fish: number; // 0..FISH; 0 only when starving
  packed: boolean; // shut in its box: it does not roam (its hunger and trust go on as ever)
}

/** Packs `name` in its box if it is out, lets it out if it is packed. */
export function togglePacked(store: CareStore, name: string): void {
  const all = store.load();
  all[name] = { ...all[name], packed: !all[name]?.packed };
  store.save(all);
}

/** One box per cat in `cats`, in that order. */
export function catBoxes(cats: readonly CatDef[], store: CareStore, clock: Clock): CatBox[] {
  const saved = store.load();
  return cats.map((def) => {
    const hunger = Hunger.restore(clock, saved[def.name]);
    const full = clamp(1 - hunger.sinceFed() / STARVE_AFTER, 0, 1);
    return {
      name: def.name,
      coat: def.coat,
      // A heart (or half of one) fills only once it is reached; the epsilon is for float noise.
      halfHearts: clamp(Math.floor(hunger.trust * 2 * HEARTS + 1e-9), 0, 2 * HEARTS),
      // Any food left shows a fish; the last one goes when it starts starving.
      fish: clamp(Math.ceil(full * FISH - 1e-9), 0, FISH),
      packed: !!saved[def.name]?.packed,
    };
  });
}
