// What the cat boxes panel shows of each cat: its name and coat, its trust in hearts, how full
// it is in fish, whether it is packed in its box, and the button beside the box for its next
// step (collection.ts). Read from the collection, which every VS Code window shares, so every cat
// shows the same wherever it is roaming.
import type { Step } from './cat';
import type { Clock } from './clock';
import { STARVE_AFTER } from './config';
import { Care, halfHearts } from './care';
import { canTakeStep, collarOf, type CatRecord } from './collection';
import { clamp } from './math';

export { HEARTS } from './care';
export const FISH = 5; // a full meal is all five

/** The button beside a cat's box: its step, and whether it can take it yet. */
export interface BoxButton {
  kind: Step;
  enabled: boolean;
}

export interface CatBox {
  id: string;
  name: string;
  coat: string;
  halfHearts: number; // 0..2*HEARTS
  fish: number; // 0..FISH; 0 only when starving
  packed: boolean; // shut in its box: it does not roam (its hunger and trust go on as ever)
  collar: string | null; // its collar's colour, once it has claimed it
  button: BoxButton;
}

/** One box per cat in `cats` (the collection's records, each with its care), in that order. */
export function catBoxes(cats: readonly CatRecord[], clock: Clock): CatBox[] {
  return cats.map((cat) => {
    const care = Care.restore(clock, cat.care);
    const full = clamp(1 - care.sinceFed() / STARVE_AFTER, 0, 1);
    return {
      id: cat.id,
      name: cat.name,
      coat: cat.coat,
      halfHearts: halfHearts(care.trust),
      // Any food left shows a fish; the last one goes when it starts starving.
      fish: clamp(Math.ceil(full * FISH - 1e-9), 0, FISH),
      packed: !!cat.care?.packed,
      collar: collarOf(cat),
      button: { kind: cat.step, enabled: canTakeStep(cat, care.trust, cats.length) },
    };
  });
}
