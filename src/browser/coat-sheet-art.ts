// The coat sheet (debug mode): a row per coat, its name, then every cat frame and the cat in its
// box, eyes open and blinking. Drawn by the same code the game draws them with.
import { COATS } from '../world/coats';
import { SP } from '../world/sprites';
import { OPEN_BOX_H, OPEN_BOX_W, paintOpenBox } from './box-art';
import { paintCatFrame, paintCollar } from './cat-art';
import { text, wrap } from './collection-art';
import type { Paint } from './pixel-art';
import { FONT_5X7, fontText } from './pixel-font';

const BACKGROUND = '#d0d0d0';
const INK = '#000000';
const CELL = 24; // the largest frame is 24 wide (most) or 24 high (climbing)
const GAP = 4;
const NAME_W = 48; // names are in half pixels
const NAME_LINE = 14; // characters of a name on one line
const LINE_H = 4;
const ROW_H = Math.max(CELL, OPEN_BOX_H);
const FRAMES = Object.keys(SP.frames).filter((f) => f in SP.collars); // the cat's, not fish or yarn

/** The sheet's size in sprite pixels. */
export function sheetSize(): { width: number; height: number } {
  return { width: NAME_W + FRAMES.length * (CELL + GAP) + 2 * (OPEN_BOX_W + GAP), height: GAP + COATS.length * (ROW_H + GAP) };
}

/** Paints the sheet, with or without the coats' collars. `px`: device pixels per sprite pixel. */
export function paintSheet(paint: Paint, collars: boolean, px: number): void {
  const fine = Math.max(1, Math.floor(px / 2)) / px; // half a sprite pixel, in whole device pixels
  const { width, height } = sheetSize();
  paint(0, 0, width, height, BACKGROUND);
  COATS.forEach((coat, i) => {
    const y = GAP + i * (ROW_H + GAP);
    wrap(coat.name, NAME_LINE).forEach((line, l) => text(paint, fontText(FONT_5X7, line, NAME_LINE), GAP, y + l * LINE_H, fine, INK));
    let x = NAME_W;
    for (const frame of FRAMES) {
      const rows = SP.frames[frame];
      const fx = x + Math.floor((CELL - rows[0].length) / 2);
      const fy = y + ROW_H - rows.length;
      paintCatFrame(paint, coat.id, frame, fx, fy);
      if (collars) paintCollar(paint, coat.collar, frame, fx, fy);
      x += CELL + GAP;
    }
    for (const blink of [false, true]) {
      paintOpenBox(paint, coat.id, collars ? coat.collar : null, blink, x, y + ROW_H - OPEN_BOX_H);
      x += OPEN_BOX_W + GAP;
    }
  });
}
