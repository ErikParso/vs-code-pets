// The room the cat boxes are kept in: a brick wall, signs hanging from wires (the title, and an X to
// close it), thin shelves on iron brackets, and a near-black frame round it all.
import type { Paint } from './pixel-art';
import { eachTextPixel, FONT_5X7, textWidth } from './pixel-font';

const ROOM = {
  mortar: '#4a2e26',
  bricks: ['#8e4a3a', '#97503f', '#874536', '#9a5444', '#8a4838'],
  wire: '#6b7178',
  sign: '#1f1f1f',
  signEdge: '#000000',
  signText: '#f6f0dc',
  shelfTop: '#7a5238',
  shelf: '#4a2f20',
  shelfEdge: '#2a1a12',
  iron: '#4d5258',
  frame: '#111111',
  frameLight: '#454545',
};
const BRICK_W = 14;
const BRICK_H = 6; // with the mortar under it

/** The brick wall, `width` x `height`. */
export function paintWall(paint: Paint, width: number, height: number): void {
  paint(0, 0, width, height, ROOM.mortar);
  for (let row = 0; row * BRICK_H < height; row++) {
    const off = row % 2 ? BRICK_W / 2 : 0;
    for (let x = -off; x < width; x += BRICK_W) {
      const shade = ROOM.bricks[(Math.floor((x + off) / BRICK_W) * 7 + row * 13) % ROOM.bricks.length];
      paint(x, row * BRICK_H, BRICK_W - 1, BRICK_H - 1, shade);
    }
  }
}

/** `title` at (x, y) on a black sign just big enough for it, hanging from two wires from the top. */
export function paintSign(paint: Paint, title: string, x: number, y: number): void {
  const w = textWidth(FONT_5X7, title);
  const h = FONT_5X7.h;
  for (const wx of [x, x + w - 1]) paint(wx, 0, 1, y - 3, ROOM.wire);
  paint(x - 3, y - 3, w + 6, h + 6, ROOM.signEdge);
  paint(x - 2, y - 2, w + 4, h + 4, ROOM.sign);
  eachTextPixel(FONT_5X7, title, x, y, (px, py) => paint(px, py, 1, 1, ROOM.signText));
}

/** A thin shelf across the room at `y` (its top), on iron brackets at `brackets` (their left edges). */
export function paintShelf(paint: Paint, y: number, width: number, brackets: readonly number[]): void {
  paint(3, y, width - 6, 1, ROOM.shelfTop);
  paint(3, y + 1, width - 6, 2, ROOM.shelf);
  paint(3, y + 3, width - 6, 1, ROOM.shelfEdge);
  for (const bx of brackets) {
    paint(bx, y + 4, 2, 4, ROOM.iron);
    paint(bx, y + 4, 6, 1, ROOM.iron);
  }
}

/** The frame round the room: near black, its top and left edges catching a little light. */
export function paintFrame(paint: Paint, width: number, height: number): void {
  for (const [x, y, w, h] of [[0, 0, width, 3], [0, height - 3, width, 3], [0, 0, 3, height], [width - 3, 0, 3, height]]) paint(x, y, w, h, ROOM.frame);
  paint(1, 1, width - 2, 1, ROOM.frameLight);
  paint(1, 1, 1, height - 2, ROOM.frameLight);
}
