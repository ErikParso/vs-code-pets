// A cat's frame in its coat, and its collar, drawn in sprite pixels (pixel-art.ts): what the
// renderer builds its sprites from, and what the coat sheet (coat-sheet-art.ts) shows.
import { coatOf } from '../world/coats';
import type { CatFrame } from '../world/sprites';
import { paintRows, type Paint } from './pixel-art';

/** Paints `frame` in coat `coatId` (coats.ts), with the coat's sprite, at (x, y). */
export function paintCatFrame(paint: Paint, coatId: string, frame: CatFrame, x: number, y: number): void {
  const { sprite, letters } = coatOf(coatId).look;
  paintRows(paint, sprite.frame(frame), x, y, (ch) => letters[ch]);
}

/** Paints the collar of coat `coatId`'s sprite in `frame`, in `colour`, at (x, y), where its frame is. */
export function paintCollar(paint: Paint, coatId: string, colour: string, frame: CatFrame, x: number, y: number): void {
  const { sprite, letters } = coatOf(coatId).look;
  for (const [dx, dy, ch] of sprite.collar(frame)) paint(x + dx, y + dy, 1, 1, ch === 'C' ? colour : letters[ch]);
}
