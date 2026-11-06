// The cat boxes panel, drawn in sprite pixels: an open cardboard box per cat, its name on a
// sticker slapped on by hand, the cat peeking out over the lip (blinking now and then), and under
// it its trust in hearts and how full it is in fish. No DOM: it paints through a `Paint`
// function, so the same art can be drawn on a canvas (cat-boxes.ts) or into an image.
import { FISH, HEARTS, type CatBox } from '../world/boxes';
import { SP } from '../world/sprites';
import { eachTextPixel, FONT_5X7, fontText, textWidth } from './pixel-font';

/** Fills a w x h rectangle of sprite pixels at (x, y). */
export type Paint = (x: number, y: number, w: number, h: number, color: string) => void;

export const MAX_NAME = 8; // characters that fit on a sticker

const COLORS = {
  panel: '#2b2235',
  frameDark: '#16111c',
  frameLight: '#4a3d5a',
  title: '#f6f0dc',
  sticker: '#f6f0dc',
  stickerEdge: '#b9ab8c',
  ink: '#2b1d14',
  empty: '#4c405a',
  alarm: '#e63946',
  eyes: '#f2d14b', // a packed cat's, glinting through the slot
};

// The open cardboard box, pixel for pixel (and colour for colour) after the reference Erik
// drew: flaps folded up and out, the back edge and the dark inside, a lit lip, the lip's shadow
// on the front, a diagonal crease on the left and a "!" shine on the right. 28x20.
// k outline, L lit card, F card, E shaded card, P/O the right edge's shade, I shadow, M deep
// shadow, N the lip's dark end.
const CARD: Record<string, string> = {
  k: '#000000',
  L: '#ed9e50',
  F: '#d98c32',
  E: '#bb732a',
  P: '#c08235',
  O: '#a46d2a',
  I: '#945d27',
  M: '#794514',
  N: '#6a401d',
  S: '#2e1a0b', // the slot: the dark inside, seen through it
};
// prettier-ignore
const BOX_ART = [
  'kkk......................kkk',
  'kEFkk..................kkFIk',
  '.kEFEkkkkkkkkkkkkkkkkkkEFIk.',
  '..kEEMMMMMMMMMMMMMMMMMMEIk..',
  '...kMLLLLLLLLLLLLLLLLLLNk...',
  '..kMFFFFFFFFFFFFFFFFFFFFNk..',
  '.kMEEEEEEEEEEEEEEEEEEEEEEIk.',
  '..kkMMMMMMMMMMMMMMMMMMMMkk..',
  '....kIIIIIIIIIIIIIIIIIIk....',
  '....kIIIIIIIIIIIIIIIIIIk....',
  '....kEEEEEEEEEEEEEEEEEOk....',
  '....kEEEEFFFFFFFFFFFFFPk....',
  '....kEEEFEFFFFFFFFFFLLPk....',
  '....kEEFEFFFFFFFFFFFLLPk....',
  '....kEFEFFFFFFFFFFFFLLPk....',
  '....kEFFFFFFFFFFFFFFFFPk....',
  '....kEFFFFFFFFFFFFFFLLPk....',
  '....kEFFFFFFFFFFFFFFFFPk....',
  '....kEEEEEEEEEEEEEEEEEOk....',
  '....kkkkkkkkkkkkkkkkkkkk....',
];
// Widened by repeating its plain middle column, so a name fits on the front; the look is the same.
// Made bigger the same way: its plain middle column repeated, and a plain row of the front.
const WIDEN = 10;
const TALLER = 4;
const PLAIN_ROW = 15;
const BOX = BOX_ART.flatMap((r, y) => Array(y === PLAIN_ROW ? TALLER + 1 : 1).fill(r)).map(
  (r) => r.slice(0, 13) + r[13].repeat(WIDEN + 1) + r.slice(14)
);

// The closed box, from the same reference: its top shut, the "!" shine on the right. 20x17, as
// wide as the open one's body, and made bigger the same way. T the top's shadow, L lit edge,
// F card, B shaded bottom.
const CLOSED_CARD: Record<string, string> = {
  k: '#000000',
  T: '#844e1f',
  L: '#eba14f',
  F: '#d78d39',
  B: '#b8752a',
};
// prettier-ignore
const CLOSED_ART = [
  '.kkkkkkkkkkkkkkkkkk.',
  'kTTTTTTTTTTTTTTTTTTk',
  'kLLLLLLLLLLLLLLLLLLk',
  'kFFFFFFFFFFFFFFFFFFk',
  'kFFFFFFFFFFFFFFFFFFk',
  'kFFFFFFFFFFFFFFFFFFk',
  'kFFFFFFFFFFFFFFFFFFk',
  'kFFFFFFFFFFFFFFFLLFk',
  'kFFFFFFFFFFFFFFFLLFk',
  'kFFFFFFFFFFFFFFFLLFk',
  'kFFFFFFFFFFFFFFFLLFk',
  'kFFFFFFFFFFFFFFFFFFk',
  'kFFFFFFFFFFFFFFFLLFk',
  'kFFFFFFFFFFFFFFFFFFk',
  'kBBBBBBBBBBBBBBBBBBk',
  'kBBBBBBBBBBBBBBBBBBk',
  'kkkkkkkkkkkkkkkkkkkk',
];
const CLOSED_PLAIN_ROW = 4;
const CLOSED = CLOSED_ART.flatMap((r, y) => Array(y === CLOSED_PLAIN_ROW ? TALLER + 1 : 1).fill(r)).map(
  (r) => r.slice(0, 10) + r[10].repeat(WIDEN + 1) + r.slice(11)
);

// A cat peeking over the lip, 16x13: ears, face, chin, and its front paws hooked over the
// edge. Rows 0-9 are above the lip; the paws (rows 10-12) hang over it.
const PEEK = [
  '.KK..........KK.',
  '.KPK........KPK.',
  '.KPOKKKKKKKKOPK.',
  '.KOOOODOODOOOOK.',
  '.KOOOOOOOOOOOOK.',
  '.KOOKKOOOOKKOOK.',
  '.KOOKKOOOOKKOOK.',
  '.KWOOOOPPOOOOWK.',
  '.KWWWWKWWKWWWWK.',
  '.KKWWWWWWWWWWKK.',
  'KWWWK......KWWWK',
  'KWKWK......KWKWK',
  '.KKK........KKK.',
];
const PEEK_BLINK = PEEK.map((row, y) => (y === 5 ? '.KOOOOOOOOOOOOK.' : row));
const PEEK_EYES = [4, 10]; // the columns its eyes start at, each 2 wide
const PEEK_RIM = 10; // the peek row level with the top of the box's lip

const HEART = ['.KK.KK.', 'KPPKPPK', 'KPPPPPK', '.KPPPK.', '..KPK..', '...K...'];
const FISH_ICON = SP.frames.fishA; // 10x5

const BOX_W = BOX[0].length;
const BOX_H = BOX.length;
const LIP_Y = 4; // the lip's top row: behind it the cat, over it its paws
const FRONT_L = 5; // the front's inside, between its outlines
const FRONT_R = BOX_W - 6;
// The slot cut in the front, under the lip's shadow: a closed box's cat will look out of it.
const SLOT_W = 12;
const SLOT_Y = 11; // its top row, just under the lip's shadow; it is 2 high
const STICKER_TOP = SLOT_Y + 3; // the sticker goes between here and the front's shaded bottom row
const STICKER_BOTTOM = BOX_H - 3;

// One cell (sprite px): the cat's ears at the top, then the box, then hearts over fish.
const ICON_PITCH = 12; // hearts and fish share columns: each heart sits over its fish
const ICONS_W = (FISH - 1) * ICON_PITCH + FISH_ICON[0].length;
const CELL_W = Math.max(BOX_W, ICONS_W);
const BOX_TOP = PEEK_RIM - LIP_Y; // the flap tips, from the top of the cell
const HEARTS_Y = BOX_TOP + BOX_H + 3;
const FISH_Y = HEARTS_Y + HEART.length + 3;
const CELL_H = FISH_Y + FISH_ICON.length;
const GAP_X = 8;
const GAP_Y = 10;
const PAD = 8;
const TITLE = 'YOUR CATS';
const TOP = PAD + FONT_5X7.h + 8; // where the first row of boxes starts

/** The panel's size in sprite pixels, for `count` boxes in `cols` columns. */
export function panelSize(count: number, cols: number): { width: number; height: number } {
  const rows = Math.max(1, Math.ceil(count / cols));
  return {
    width: PAD * 2 + cols * CELL_W + (cols - 1) * GAP_X,
    height: TOP + rows * CELL_H + (rows - 1) * GAP_Y + PAD,
  };
}

/** The most columns that fit in `width` sprite pixels (at least one). */
export function columnsFor(width: number): number {
  return Math.max(1, Math.floor((width - PAD * 2 + GAP_X) / (CELL_W + GAP_X)));
}

function nameHash(name: string): number {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

// Numbers in 0..1 that are always the same for the same name: how its box looks never changes.
function boxRandom(name: string): () => number {
  let s = nameHash(name) ^ 0x9e3779b9;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

// Each cat blinks on its own beat, from its name: every 3-5 s, for 0.15 s.
function blinking(name: string, t: number): boolean {
  const h = nameHash(name);
  const period = 3 + (h % 2000) / 1000;
  return (t + (h % 997) / 100) % period < 0.15;
}

// A starving cat's empty fish flashes red, twice a second.
function alarmOn(t: number): boolean {
  return Math.floor(t * 2) % 2 === 0;
}

/** Changes whenever the panel would look different: when this is the same, there's no need to redraw. */
export function lookKey(boxes: readonly CatBox[], cols: number, t: number): string {
  return `${cols}|${alarmOn(t)}|` + boxes.map((b) => `${b.name},${b.coat},${b.halfHearts},${b.fish},${b.starving},${b.packed},${blinking(b.name, t)}`).join('|');
}

/** Which box's tile (with its hearts and fish) is at (x, y) in the panel (sprite px), in `cols` columns; -1 for none. */
export function boxAt(x: number, y: number, cols: number): number {
  const col = Math.floor((x - PAD) / (CELL_W + GAP_X));
  const row = Math.floor((y - TOP) / (CELL_H + GAP_Y));
  return col >= 0 && col < cols && row >= 0 ? row * cols + col : -1;
}

/**
 * Paints the whole panel: frame, title, and the boxes in `cols` columns, at `t` seconds: the cats'
 * boxes, then `spare` empty ones. `fine`: the size of the stickers' finer pixels, in sprite px
 * (half of one, where the screen allows).
 */
export function paintPanel(paint: Paint, boxes: readonly CatBox[], spare: number, cols: number, t: number, fine: number): void {
  const count = boxes.length + spare;
  const { width, height } = panelSize(count, cols);
  paint(0, 0, width, height, COLORS.frameDark);
  paint(1, 1, width - 2, height - 2, COLORS.frameLight);
  paint(2, 2, width - 4, height - 4, COLORS.panel);
  eachTextPixel(FONT_5X7, TITLE, PAD, PAD, (x, y) => paint(x, y, 1, 1, COLORS.title));
  for (let i = 0; i < count; i++) {
    const x = PAD + (i % cols) * (CELL_W + GAP_X);
    const y = TOP + Math.floor(i / cols) * (CELL_H + GAP_Y);
    paintCell(paint, boxes[i] ?? null, x, y, t, fine);
  }
}

function paintRows(paint: Paint, rows: readonly string[], x: number, y: number, color: (ch: string, col: number) => string | undefined): void {
  rows.forEach((row, ry) => {
    for (let rx = 0; rx < row.length; rx++) {
      if (row[rx] === '.') continue;
      const c = color(row[rx], rx);
      if (c) paint(x + rx, y + ry, 1, 1, c);
    }
  });
}

// A box: with `box`, its cat, sticker, hearts and fish; with null, an empty box, for a cat to come.
function paintCell(paint: Paint, box: CatBox | null, x: number, y: number, t: number, fine: number): void {
  const bx = x + Math.floor((CELL_W - BOX_W) / 2); // the box's left (the left flap's tip)
  const by = y + BOX_TOP; // the box's top (the flap tips)
  const card = (ch: string) => CARD[ch];
  const slot = () => paint(bx + Math.floor((BOX_W - SLOT_W) / 2), by + SLOT_Y, SLOT_W, 2, CARD.S);

  const peekX = bx + Math.floor((BOX_W - PEEK[0].length) / 2);
  if (!box || box.packed) {
    // Closed, standing where an open box would: same bottom, centred.
    const cx = bx + Math.floor((BOX_W - CLOSED[0].length) / 2);
    const cy = by + BOX_H - CLOSED.length;
    paintRows(paint, CLOSED, cx, cy, (ch) => CLOSED_CARD[ch]);
    slot(); // where an open box has it, so a cat looking out is at the same height either way
    if (!box) return;
    // A packed cat looks out through the slot: its eyes, where they are when it peeks, glinting
    // in the dark (and gone when it blinks).
    if (!blinking(box.name, t)) for (const ex of PEEK_EYES) paint(peekX + ex, by + SLOT_Y, 2, 2, COLORS.eyes);
  } else {
    // Behind the cat: the flaps, the back edge and the dark inside.
    paintRows(paint, BOX.slice(0, LIP_Y), bx, by, card);

    // The cat, from the chin up (the rest of it is in the box).
    const palette: Record<string, string> = { ...SP.palette, ...(SP.coats[box.coat] || {}) };
    const peek = blinking(box.name, t) ? PEEK_BLINK : PEEK;
    paintRows(paint, peek.slice(0, PEEK_RIM), peekX, by + LIP_Y - PEEK_RIM, (ch) => palette[ch]);

    // In front of it: the lip and the front.
    paintRows(paint, BOX.slice(LIP_Y), bx, by + LIP_Y, card);

    // The slot, one long cut under the lip.
    slot();

    // Its paws over the lip.
    paintRows(paint, peek.slice(PEEK_RIM), peekX, by + LIP_Y, (ch) => palette[ch]);
  }

  paintSticker(paint, box.name, bx + FRONT_L, bx + FRONT_R, by + STICKER_TOP, by + STICKER_BOTTOM, fine);

  // Under the box, each heart over its fish. Trust: full hearts, maybe a half one, then empty.
  const iconsX = x + Math.floor((CELL_W - ICONS_W) / 2);
  const heartW = HEART[0].length;
  const heartIn = Math.ceil((FISH_ICON[0].length - heartW) / 2);
  for (let i = 0; i < HEARTS; i++) {
    const filled = box.halfHearts - 2 * i; // >= 2 full, 1 half, <= 0 empty
    paintRows(paint, HEART, iconsX + i * ICON_PITCH + heartIn, y + HEARTS_Y, (ch, col) => {
      const lit = filled >= 2 || (filled === 1 && col <= Math.floor(heartW / 2));
      return lit ? SP.palette[ch] : COLORS.empty;
    });
  }

  // Food: a fish for each fifth of a meal left. Starving, the first empty one flashes red.
  for (let i = 0; i < FISH; i++) {
    const empty = box.starving && i === 0 && alarmOn(t) ? COLORS.alarm : COLORS.empty;
    paintRows(paint, FISH_ICON, iconsX + i * ICON_PITCH, y + FISH_Y, (ch) => (i < box.fish ? SP.palette[ch] : empty));
  }
}

// The name sticker: a slip of paper just big enough for the name, slapped on by hand somewhere in
// the rectangle x1..x2, y1..y2 (sprite px, inclusive), a pixel crooked: one end a pixel lower than
// the other, from a step somewhere along it. Each cat's sticker always sits the same way. It is
// drawn in fine pixels, `fine` sprite px each, so the name can be smaller than the box's pixels.
function paintSticker(paint: Paint, catName: string, x1: number, x2: number, y1: number, y2: number, fine: number): void {
  const font = FONT_5X7;
  const name = fontText(font, catName, MAX_NAME);
  const w = textWidth(font, name) + 4; // in fine px
  const h = font.h + 4;
  const room = Math.floor((x2 - x1 + 1) / fine) - w;
  const roomY = Math.floor((y2 - y1 + 1) / fine) - h - 1;
  const random = boxRandom(catName);
  const ox = Math.floor(random() * (Math.max(0, room) + 1));
  const oy = Math.floor(random() * (Math.max(0, roomY) + 1));
  const step = 3 + Math.floor(random() * (w - 6)); // the first column of the lower part
  const leftLow = random() < 0.5;
  const dot = (fx: number, fy: number, fw: number, fh: number, color: string) =>
    paint(x1 + (ox + fx) * fine, y1 + (oy + fy) * fine, fw * fine, fh * fine, color);
  dot(0, leftLow ? 1 : 0, step, h, COLORS.sticker);
  dot(step, leftLow ? 0 : 1, w - step, h, COLORS.sticker);
  // The name goes on straight, where both parts have it: a step through it would break it.
  eachTextPixel(font, name, 2, 2, (fx, fy) => dot(fx, fy, 1, 1, COLORS.ink));
}
