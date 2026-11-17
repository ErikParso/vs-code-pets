// The coat sheet (debug mode): the coats grouped by rarity, under its name; a row per coat, its name, then its cat in each animation, looping
// as it does in the game (renderer.ts), and in its box, blinking now and then. Drawn by the same
// code the game draws them with.
import { COATS, type Coat, type Rarity } from '../world/coats';
import type { CatFrame } from '../world/sprites';
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
const HEADING_H = LINE_H + GAP;

// The rarities in order, each with its coats: a rarity with none is left out.
const ORDER: Record<Rarity, number> = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };
const GROUPS: { rarity: Rarity; coats: Coat[] }[] = (Object.keys(ORDER) as Rarity[])
  .sort((a, b) => ORDER[a] - ORDER[b])
  .map((rarity) => ({ rarity, coats: COATS.filter((c) => c.rarity === rarity) }))
  .filter((g) => g.coats.length > 0);

/** Each animation: its frames, each with how long it shows (s), looping. Every frame is in one. */
const ANIMATIONS: readonly (readonly [CatFrame, number])[][] = [
  [['walkA', 0.14], ['walkB', 0.14], ['walkA', 0.14], ['walkD', 0.14]],
  [['crouch', 0.5], ['leap', 0.35], ['walkA', 0.35]],
  [['sit', 1], ['sitTail', 0.5], ['sit', 1.3], ['sitBlink', 0.15]],
  [['playUp', 0.4], ['playSwipe', 0.2]],
  [['sleep1', 0.9], ['sleep2', 0.9]],
  [['climbPull', 0.3], ['climbPush', 0.2], ['climbReach', 0.35], ['climbTail', 0.35], ['climbReach', 0.35], ['climbTail', 0.35]],
  [['eatDown', 0.6], ['eatChew', 0.3], ['eatTug', 0.2], ['eatTail', 0.3], ['eatTug', 0.2], ['eatChew', 0.3], ['eatTug', 0.2]],
];
const BLINK_EVERY = 3; // s; the cat in its box blinks for the last BLINK of each
const BLINK = 0.15;

/** Each animation's frame at `t` (s), and whether the cat in its box is blinking. */
export function sheetFrames(t: number): { frames: CatFrame[]; blink: boolean } {
  const frames = ANIMATIONS.map((steps) => {
    let left = t % steps.reduce((sum, [, d]) => sum + d, 0);
    for (const [frame, d] of steps) {
      if (left < d) return frame;
      left -= d;
    }
    return steps[0][0];
  });
  return { frames, blink: t % BLINK_EVERY > BLINK_EVERY - BLINK };
}

/** The sheet's size in sprite pixels. */
export function sheetSize(): { width: number; height: number } {
  return { width: NAME_W + ANIMATIONS.length * (CELL + GAP) + OPEN_BOX_W + GAP, height: GAP + GROUPS.length * HEADING_H + COATS.length * (ROW_H + GAP) };
}

/** Paints the sheet at `t` (s), with or without the coats' collars. `px`: device pixels per sprite pixel. */
export function paintSheet(paint: Paint, collars: boolean, px: number, t: number): void {
  const fine = Math.max(1, Math.floor(px / 2)) / px; // half a sprite pixel, in whole device pixels
  const { width, height } = sheetSize();
  const { frames, blink } = sheetFrames(t);
  paint(0, 0, width, height, BACKGROUND);
  let y = GAP;
  for (const { rarity, coats } of GROUPS) {
    text(paint, fontText(FONT_5X7, rarity.toUpperCase(), NAME_LINE), GAP, y, fine, INK);
    y += HEADING_H;
    for (const coat of coats) {
      wrap(coat.name, NAME_LINE).forEach((line, l) => text(paint, fontText(FONT_5X7, line, NAME_LINE), GAP, y + l * LINE_H, fine, INK));
      let x = NAME_W;
      for (const frame of frames) {
        const rows = coat.look.sprite.frame(frame);
        const fx = x + Math.floor((CELL - rows[0].length) / 2);
        const fy = y + ROW_H - rows.length;
        paintCatFrame(paint, coat.id, frame, fx, fy);
        if (collars) paintCollar(paint, coat.id, coat.collar, frame, fx, fy);
        x += CELL + GAP;
      }
      paintOpenBox(paint, coat.id, collars ? coat.collar : null, blink, x, y + ROW_H - OPEN_BOX_H);
      y += ROW_H + GAP;
    }
  }
}
