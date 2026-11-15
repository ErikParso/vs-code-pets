// A cat's frame in its coat, and its collar, drawn in sprite pixels (pixel-art.ts): what the
// renderer builds its sprites from, and what the coat sheet (coat-sheet-art.ts) shows.
import { coatOf } from '../world/coats';
import { SP } from '../world/sprites';
import { paintRows, type Paint } from './pixel-art';

/** Paints `frame` (sprites.ts) in coat `coatId` (coats.ts) at (x, y). */
export function paintCatFrame(paint: Paint, coatId: string, frame: string, x: number, y: number): void {
  const palette: Record<string, string> = { ...SP.palette, ...coatOf(coatId).palette };
  paintRows(paint, SP.frames[frame], x, y, (ch) => palette[ch]);
}

/** Paints `frame`'s collar in `colour` at (x, y), where its frame is; nothing for a frame that shows none. */
export function paintCollar(paint: Paint, colour: string, frame: string, x: number, y: number): void {
  for (const [dx, dy, ch] of SP.collars[frame] ?? []) paint(x + dx, y + dy, 1, 1, ch === 'C' ? colour : SP.palette[ch]);
}
