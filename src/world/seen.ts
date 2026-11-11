// The coats you have ever had a cat in, for the collection of coats (collection-panel.ts). Kept
// apart from the cats: it only ever grows, so a cat that leaves takes nothing from it. Topped up on
// every poll from the cats you have (app.ts), so it can never miss one for long, whatever happened.
import type { CatDef } from './cat';

/** Where the coats seen are kept: a list of coat ids. */
export interface SeenStore {
  load(): string[];
  save(seen: string[]): void;
}

/** `seen` with the coats of `cats` it lacks added; null if it lacks none. */
export function withCoatsOf(seen: readonly string[], cats: readonly CatDef[]): string[] | null {
  const missing = [...new Set(cats.map((c) => c.coat))].filter((coat) => !seen.includes(coat));
  return missing.length ? [...seen, ...missing] : null;
}
