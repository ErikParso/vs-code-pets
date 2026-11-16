// The coats you have ever had a cat in, for the collection of coats (collection-panel.ts), each with
// the rarest shine (shine.ts) a cat in it ever had. Kept apart from the cats: it only ever grows
// (and a coat's shine only ever gets rarer), so a cat that leaves takes nothing from it. Topped up
// on every poll from the cats you have (app.ts), so it can never miss one for long, whatever happened.
import type { CatDef } from './cat';
import { rarerShine, type Shine } from './shine';

/** A coat seen: its id, and the rarest shine it was seen with (missing: none). */
export interface SeenCoat {
  coatId: string;
  shine?: Shine;
}

/** Where the coats seen are kept. */
export interface SeenStore {
  load(): SeenCoat[];
  save(seen: SeenCoat[]): void;
}

/** `seen` with the coats of `cats` it lacks added, and any rarer shine of theirs put in; null if nothing changed. */
export function withCatsOf(seen: readonly SeenCoat[], cats: readonly CatDef[]): SeenCoat[] | null {
  const out = seen.map((s) => ({ ...s }));
  let changed = false;
  for (const c of cats) {
    let entry = out.find((s) => s.coatId === c.coat);
    if (!entry) {
      entry = { coatId: c.coat };
      out.push(entry);
      changed = true;
    }
    const best = rarerShine(entry.shine, c.shine);
    if (best !== entry.shine) {
      entry.shine = best;
      changed = true;
    }
  }
  return changed ? out : null;
}
