// The 🐈‍⬛'s menu: clicking the 🐈‍⬛ in the status bar opens a little pixel menu just above it, with
// two buttons, each its own canvas: a fish (throw the cats one; the menu stays, for the next) and a
// box (see them all in their boxes; the menu closes).
import { BUTTON_H, BUTTON_W, paintButton } from './box-art';
import { paintCanvas, Popup } from './popup';

const GAP = 4; // CSS px between the menu and the 🐈‍⬛, and between its buttons
const BUTTON_TALL = 40; // about how tall a button is, CSS px (twice the status bar)

export interface MenuActions {
  fish: (at: { x: number; y: number }) => void; // `at`: the 🐈‍⬛'s middle and top, CSS px
  box: () => void;
}

export class FishMenu {
  readonly popup = new Popup('pixel-cat-menu', { zIndex: '1002', gap: `${GAP}px` }, 'flex');
  private readonly buttons: [HTMLCanvasElement, 'fish' | 'box'][];
  private at = { x: 0, y: 0 };

  /** `pixels`: from the Renderer. */
  constructor(private readonly pixels: () => { px: number; dpr: number }, actions: MenuActions) {
    this.buttons = (['fish', 'box'] as const).map((kind) => {
      const canvas = document.createElement('canvas');
      Object.assign(canvas.style, { cursor: 'pointer', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)' });
      canvas.addEventListener('click', () => {
        if (kind === 'fish') return actions.fish(this.at);
        this.popup.close();
        actions.box();
      });
      this.popup.el.appendChild(canvas);
      return [canvas, kind];
    });
  }

  /** Opens it above the 🐈‍⬛ (`x` its middle, `y` its top, CSS px), or closes it if it is open. */
  toggle(x: number, y: number): void {
    if (this.popup.isOpen) return this.popup.close();
    this.at = { x, y };
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
