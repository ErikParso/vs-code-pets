// A cat's shine: most cats have none, a few are silver and fewer rainbow (SHINE_CHANCE). It is
// rolled when a friend is made and kept with the cat. The collection keeps, for every coat, the
// rarest shine a cat in it ever had (seen.ts). How a shine looks is the browser's (browser/shine.ts).
import { SHINE_CHANCE } from './config';
import type { Random } from './random';

export type Shine = 'silver' | 'rainbow';

const RANK: Record<Shine, number> = { silver: 1, rainbow: 2 };

/** A shine for a new friend, or undefined for none: rainbow, silver or none by SHINE_CHANCE. Draws one number. */
export function rollShine(random: Random): Shine | undefined {
  const r = random.next();
  if (r < SHINE_CHANCE.rainbow) return 'rainbow';
  if (r < SHINE_CHANCE.rainbow + SHINE_CHANCE.silver) return 'silver';
  return undefined;
}

/** The rarer of two shines (undefined: none). */
export function rarerShine(a: Shine | undefined, b: Shine | undefined): Shine | undefined {
  if (!a) return b;
  if (!b) return a;
  return RANK[b] > RANK[a] ? b : a;
}

/** Whether `value` is a shine (for what is read back from storage). */
export function isShine(value: unknown): value is Shine {
  return value === 'silver' || value === 'rainbow';
}
