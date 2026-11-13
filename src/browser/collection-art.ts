// The collection of coats, drawn in sprite pixels (pixel-art.ts): every coat as a collectible card
// on the brick wall of the room the boxes are kept in (room-art.ts), in the coats' order. A card
// found shows the cat sitting in its coat, its number and its name; one still to find, a dark card
// with a cat's shadow and "???". Either way its frame is in its rarity's colour (dark while still
// to find) with one to three gems, so you can see how rare what is missing is.
import type { Coat, Rarity } from '../world/coats';
import { SP } from '../world/sprites';
import { HEART } from './box-art';
import { paintRows, type Paint } from './pixel-art';
import { eachTextPixel, FONT_5X7, fontText, textWidth } from './pixel-font';
import { paintFrame, paintSigns, paintWall, ROOM_PAD, ROOM_TOP } from './room-art';

const COLS = 5;
const CARD_W = 40;
const CARD_H = 46;
const GAP = 6;
const PICTURE_H = 22; // the window the cat sits in
const NAME_LINE = 11; // characters of a name on one line of its plate
const LINE_H = 4; // a line of the name, in sprite px (its text is in half pixels)

const RARITY: Record<Rarity, { frame: string; shade: string; window: string; dim: string; gems: number }> = {
  common: { frame: '#a9a6b4', shade: '#6e6b7a', window: '#e6e1d6', dim: '#55525e', gems: 1 },
  uncommon: { frame: '#5cc46a', shade: '#2f7d3b', window: '#d9eed6', dim: '#2f5e36', gems: 2 },
  rare: { frame: '#4f9bd9', shade: '#2b5d8f', window: '#d6e5f4', dim: '#2a4c70', gems: 3 },
};
const CARD = { edge: '#000000', ink: '#2b1d14', plate: '#f6f0dc', gem: '#f2d14b', gemDim: '#7a6a2c' };
const SPONSOR_HEART = { color: SP.palette.P, x: 4, y: 9 };
const DONATION_HEART = { color: '#5a5961', x: 4, y: 9 };
// A card still to find: dark, the cat only a shadow.
const UNSEEN = { shade: '#2a2530', window: '#1e1a24', plate: '#2a2530', cat: '#2f2a36', ink: '#6a6278' };

/** The panel's size in sprite pixels, for `count` cards. */
export function collectionSize(count: number): { width: number; height: number } {
  const rows = Math.max(1, Math.ceil(count / COLS));
  return {
    width: ROOM_PAD * 2 + COLS * CARD_W + (COLS - 1) * GAP,
    height: ROOM_TOP + rows * CARD_H + (rows - 1) * GAP + ROOM_PAD,
  };
}

/**
 * Paints the collection: a card for each of `coats`, found if `found` says so, under a sign that
 * counts them. `px`: device pixels per sprite pixel; names and numbers are in half pixels.
 */
export function paintCollection(paint: Paint, coats: readonly Coat[], found: (coat: Coat) => boolean, px: number): void {
  const fine = Math.max(1, Math.floor(px / 2)) / px; // half a sprite pixel, in whole device pixels
  const { width, height } = collectionSize(coats.length);
  paintWall(paint, width, height);
  paintSigns(paint, `COLLECTION ${coats.filter(found).length} OF ${coats.length}`, width);
  coats.forEach((coat, i) => {
    const x = ROOM_PAD + (i % COLS) * (CARD_W + GAP);
    const y = ROOM_TOP + Math.floor(i / COLS) * (CARD_H + GAP);
    paintCard(paint, coat, i + 1, found(coat), x, y, fine);
  });
  paintFrame(paint, width, height);
}

function paintCard(paint: Paint, coat: Coat, number: number, found: boolean, x: number, y: number, fine: number): void {
  const r = RARITY[coat.rarity];
  // The card, framed in its rarity's colour, its bottom edge shaded.
  paint(x, y, CARD_W, CARD_H, CARD.edge);
  paint(x + 1, y + 1, CARD_W - 2, CARD_H - 2, found ? r.frame : r.dim);
  paint(x + 2, y + CARD_H - 3, CARD_W - 4, 1, found ? r.shade : UNSEEN.shade);

  // The picture: the cat sitting, in its coat or as a shadow, and the coat's number.
  const wx = x + 3;
  const wy = y + 3;
  const ww = CARD_W - 6;
  paint(wx - 1, wy - 1, ww + 2, PICTURE_H + 2, CARD.edge);
  paint(wx, wy, ww, PICTURE_H, found ? r.window : UNSEEN.window);
  const sit = SP.frames.sit;
  const palette: Record<string, string> = { ...SP.palette, ...coat.palette };
  const shadow = (ch: string) => (ch === 'K' ? UNSEEN.shade : UNSEEN.cat);
  paintRows(paint, sit, wx + Math.floor((ww - sit[0].length) / 2), wy + PICTURE_H - sit.length, (ch) => (found ? palette[ch] : shadow(ch)));
  const ink = found ? CARD.ink : UNSEEN.ink;
  text(paint, String(number).padStart(2, '0'), wx + 1, wy + 1, fine, ink);
  if (coat.sponsor) paintHeart(paint, x + SPONSOR_HEART.x, y + SPONSOR_HEART.y, SPONSOR_HEART.color);
  if (coat.lockedByDonation) paintHeart(paint, x + DONATION_HEART.x, y + DONATION_HEART.y, DONATION_HEART.color);
  // Its rarity's gems, top right, over the picture's edge.
  for (let g = 0; g < r.gems; g++) paint(x + CARD_W - 6 - g * 3, y + 1, 2, 2, found ? CARD.gem : CARD.gemDim);

  // The name plate: its name, wrapped, or "???".
  const py = wy + PICTURE_H + 2;
  const ph = CARD_H - (PICTURE_H + 2) - 7;
  paint(wx - 1, py - 1, ww + 2, ph + 2, CARD.edge);
  paint(wx, py, ww, ph, found ? CARD.plate : UNSEEN.plate);
  const lines = found ? wrap(coat.name, NAME_LINE) : coat.lockedByDonation ? ['SPONSOR'] : ['???'];
  const top = py + Math.floor((ph - lines.length * LINE_H + 0.5) / 2);
  lines.forEach((line, i) => {
    const t = fontText(FONT_5X7, line, NAME_LINE);
    text(paint, t, wx + (ww - textWidth(FONT_5X7, t) * fine) / 2, top + i * LINE_H, fine, ink);
  });
}

/** The special coat card under (x, y), or null when it is neither sponsored nor donation-locked. */
export function specialCoatAt(coats: readonly Coat[], x: number, y: number): Coat | null {
  const column = Math.floor((x - ROOM_PAD) / (CARD_W + GAP));
  const row = Math.floor((y - ROOM_TOP) / (CARD_H + GAP));
  if (column < 0 || column >= COLS || row < 0) return null;
  const coat = coats[row * COLS + column];
  const cardX = ROOM_PAD + column * (CARD_W + GAP);
  const cardY = ROOM_TOP + row * (CARD_H + GAP);
  return (coat?.sponsor || coat?.lockedByDonation) && x >= cardX && x < cardX + CARD_W && y >= cardY && y < cardY + CARD_H ? coat : null;
}

function paintHeart(paint: Paint, x: number, y: number, color: string): void {
  paintRows(paint, HEART, x, y, (ch) => (ch === 'P' ? color : undefined));
}

// `t` (already passed through fontText) at (x, y), in pixels `fine` sprite px each.
function text(paint: Paint, t: string, x: number, y: number, fine: number, color: string): void {
  eachTextPixel(FONT_5X7, t, 0, 0, (fx, fy) => paint(x + fx * fine, y + fy * fine, fine, fine, color));
}

// `name`'s words in lines of at most `max` characters (a longer word on its own line).
function wrap(name: string, max: number): string[] {
  const lines: string[] = [];
  for (const word of name.split(' ')) {
    const last = lines[lines.length - 1];
    if (last && last.length + 1 + word.length <= max) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  return lines;
}
