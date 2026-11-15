// What every cat sprite is: its frames, its cat peeking out of a box, and where its collar goes in
// each frame. Sprites form a tree (basic/basic.ts at the root): a sprite extends another and
// overrides only what differs, often by laying pixels over its parent's (`withDots`), e.g. stripes.
// A coat (coats.ts) names its sprite and gives a colour for each of the sprite's slots.
//
// Pixel art is rows of characters, one per pixel: '.' see-through, and a letter for each colour.
// A sprite names the letters a coat colours (`slots`, e.g. fur: 'O'); the rest are SHARED
// (palette.ts): P pink, G a collar's tag. In a collar, C is the band, in the cat's collar colour.
import { SHARED } from './palette';

/** Every frame a cat can be drawn in. */
export const CAT_FRAMES = [
  'walkA', 'walkB', 'walkD', 'leap', 'crouch',
  'sit', 'sitBlink', 'sitTail', 'playUp', 'playSwipe',
  'sleep1', 'sleep2',
  'climbReach', 'climbPush', 'climbTail', 'climbPull',
  'eatDown', 'eatChew', 'eatTug', 'eatTail',
] as const;
export type CatFrame = (typeof CAT_FRAMES)[number];

/** A frame's size, sprite px: on four legs (most), and climbing, seen from behind. */
export const CAT_W = 24;
export const CAT_H = 16;
export const CLIMB_W = 16;
export const CLIMB_H = 24;
const isClimb = (frame: CatFrame) => frame.startsWith('climb');

/** The cat peeking out of a box (box-art.ts): its size, sprite px. */
export const PEEK_W = 16;
export const PEEK_H = 13;

/** A pixel laid over a frame: [x, y, its character]. */
export type Dot = [number, number, string];

export abstract class CatSprite {
  /** The colours a coat gives this sprite, by name, each with the letter it paints: { fur: 'O', ... }. */
  abstract readonly slots: Readonly<Record<string, string>>;

  /** `frame`'s rows. */
  abstract frame(frame: CatFrame): readonly string[];

  /** The cat peeking out of a box, eyes open or shut, PEEK_W x PEEK_H. */
  abstract peek(blink: boolean): readonly string[];

  /** Where the collar goes in `frame` (C the band, G its tag, K outline); none for no collar there. */
  abstract collar(frame: CatFrame): readonly Dot[];
}

/** `rows` with `dots` laid over them. A dot off the art, or on a see-through pixel, is a mistake. */
export function withDots(rows: readonly string[], dots: readonly Dot[]): string[] {
  const out = rows.map((r) => [...r]);
  for (const [x, y, ch] of dots) {
    if (out[y]?.[x] === undefined || out[y][x] === '.') throw new Error(`a dot at ${x},${y} is off the cat`);
    out[y][x] = ch;
  }
  return out.map((r) => r.join(''));
}

/** `rows` with some rows replaced, by row number. */
export function patch(rows: readonly string[], changes: Record<number, string>): string[] {
  const out = rows.slice();
  for (const [i, row] of Object.entries(changes)) out[Number(i)] = row;
  return out;
}

/** Fails loudly if `sprite` has a frame or peek of the wrong size, or a letter no colour is for. */
export function checkSprite(name: string, sprite: CatSprite): void {
  const letters = new Set([...Object.values(sprite.slots), ...Object.keys(SHARED), '.', 'C']);
  const art = [...CAT_FRAMES.flatMap((f) => [...sprite.frame(f), sprite.collar(f).map(([, , ch]) => ch).join('')]), ...sprite.peek(false), ...sprite.peek(true)];
  for (const ch of new Set(art.join(''))) if (!letters.has(ch)) throw new Error(`sprite ${name}: no colour for '${ch}' (not one of its slots, nor shared)`);
  const size = (rows: readonly string[]) => `${rows[0]?.length ?? 0}x${rows.length}`;
  const expect = (what: string, rows: readonly string[], w: number, h: number) => {
    if (rows.length !== h || rows.some((r) => r.length !== w)) throw new Error(`sprite ${name}: ${what} is ${size(rows)}, should be ${w}x${h}`);
  };
  for (const f of CAT_FRAMES) expect(f, sprite.frame(f), isClimb(f) ? CLIMB_W : CAT_W, isClimb(f) ? CLIMB_H : CAT_H);
  for (const blink of [false, true]) expect(blink ? 'peek (blinking)' : 'peek', sprite.peek(blink), PEEK_W, PEEK_H);
}
