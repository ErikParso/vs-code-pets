// The 🐈‍⬛'s menu: clicking the 🐈‍⬛ in the status bar opens a little pixel menu just above it, with
// four buttons, each its own canvas: a bucket of fish (throw the cats one, out of the bucket; the
// menu stays, for the next), a pile of yarn (throw them a ball of yarn, the same way), a pile of
// boxes (see them all in their boxes) and a fan of cards (the collection of coats); those two
// close the menu.
import { BUTTON_H, BUTTON_W, paintButton, type MenuButton } from './menu-art';
import { paintCanvas, Popup } from './popup';

const GAP = 4; // CSS px between the menu and the 🐈‍⬛, and between its buttons
const BUTTON_TALL = 40; // about how tall a button is, CSS px (twice the status bar)

export interface MenuActions {
  fish: (from: { x: number; y: number }) => void; // `from`: the bucket's middle and top, CSS px
  yarn: (from: { x: number; y: number }) => void; // `from`: the pile's middle and top, CSS px
  box: () => void;
  cards: () => void;
}

export class FishMenu {
  readonly popup = new Popup('pixel-cat-menu', { zIndex: '1002', gap: `${GAP}px` }, 'flex');
  private readonly buttons: [HTMLCanvasElement, MenuButton][];

  /** `pixels`: from the Renderer. */
  constructor(private readonly pixels: () => { px: number; dpr: number }, actions: MenuActions) {
    this.buttons = (['fish', 'yarn', 'box', 'cards'] as const).map((kind) => {
      const canvas = document.createElement('canvas');
      Object.assign(canvas.style, { cursor: 'pointer', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)' });
      canvas.addEventListener('click', () => {
        if (kind === 'box' || kind === 'cards') {
          this.popup.close();
          return actions[kind]();
        }
        const r = canvas.getBoundingClientRect();
        actions[kind]({ x: r.left + r.width / 2, y: r.top });
      });
      this.popup.el.appendChild(canvas);
      return [canvas, kind];
    });
  }

  /** Opens it above the 🐈‍⬛ (`x` its middle, `y` its top, CSS px), or closes it if it is open. */
  toggle(x: number, y: number): void {
    if (this.popup.isOpen) return this.popup.close();
    // About BUTTON_TALL CSS px tall, in whole device pixels per sprite pixel (so still crisp).
    const { dpr } = this.pixels();
    const size = { px: Math.max(1, Math.round((BUTTON_TALL * dpr) / BUTTON_H)), dpr };
    for (const [canvas, kind] of this.buttons) paintCanvas(canvas, BUTTON_W, BUTTON_H, size, (paint) => paintButton(paint, kind));
    this.popup.show();
    const { width, height } = this.popup.el.getBoundingClientRect();
    const left = Math.min(Math.max(GAP, x - width / 2), window.innerWidth - width - GAP);
    Object.assign(this.popup.el.style, { left: `${left}px`, top: `${y - height - GAP}px` });
  }
}
