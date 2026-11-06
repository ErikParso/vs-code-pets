// The 🐈‍⬛'s menu buttons, each a tile in a dark frame. The fish button: a metal bucket with a fish
// lying across the top. The box button: a pile of closed boxes, a cat's eyes and name sticker on
// two, the third still empty.
import { SP } from '../world/sprites';
import { CLOSED_CARD, PANEL } from './box-art';
import { paintRows, type Paint } from './pixel-art';

const MENU = { frameDark: '#16111c', frameLight: '#4a3d5a', inside: '#2b2235' };

// The bucket: H light, G metal, D shade; the fish in the game's colours.
const BUCKET_COLORS: Record<string, string> = { ...SP.palette, H: '#c9d1d9', G: '#9aa3ad', D: '#5f6770' };
// prettier-ignore
const BUCKET = [
  ...SP.frames.fishA.map((r) => `.....${r}.....`),
  '.KKKKKKKKKKKKKKKKKK.',
  '.KHHHHHHHHHHHHHHHHK.',
  '.KKKKKKKKKKKKKKKKKK.',
  '..KHHGGGGGGGGGGGDK..',
  '..KHGGGGGGGGGGGGDK..',
  '..KHGGGGGGGGGGGGDK..',
  '..KKKKKKKKKKKKKKKK..',
  '...KHGGGGGGGGGGDK...',
  '...KHGGGGGGGGGGDK...',
  '...KHGGGGGGGGGGDK...',
  '....KKKKKKKKKKKK....',
];

// The pile: the closed box's colours (B its shade), S the slot, Y eyes, Q a sticker.
const PILE_COLORS: Record<string, string> = { ...CLOSED_CARD, S: PANEL.slot, Y: PANEL.eyes, Q: PANEL.sticker };
const CAT_BOX = ['kkkkkkkkkk', 'kLLLLLLLLk', 'kFSYSSYSFk', 'kFFFFFFFFk', 'kFQQQQQFFk', 'kBBBBBBBBk', 'kkkkkkkkkk'];
const EMPTY_BOX = ['kkkkkkkkkk', 'kLLLLLLLLk', 'kFSSSSSSFk', 'kFFFFFFFFk', 'kFFFFFFLFk', 'kBBBBBBBBk', 'kkkkkkkkkk'];
const PILE = [...CAT_BOX.map((r) => `.....${r}.....`), ...EMPTY_BOX.map((r, y) => r + CAT_BOX[y])];

const ICONS = { fish: [BUCKET, BUCKET_COLORS], box: [PILE, PILE_COLORS] } as const;

export const BUTTON_W = BUCKET[0].length + 8;
export const BUTTON_H = BUCKET.length + 8;

/** Paints one of the 🐈‍⬛'s menu buttons, BUTTON_W x BUTTON_H sprite px. */
export function paintButton(paint: Paint, button: 'fish' | 'box'): void {
  paint(0, 0, BUTTON_W, BUTTON_H, MENU.frameDark);
  paint(1, 1, BUTTON_W - 2, BUTTON_H - 2, MENU.frameLight);
  paint(2, 2, BUTTON_W - 4, BUTTON_H - 4, MENU.inside);
  const [art, colors] = ICONS[button];
  paintRows(paint, art, Math.floor((BUTTON_W - art[0].length) / 2), Math.floor((BUTTON_H - art.length) / 2), (ch) => colors[ch]);
}
