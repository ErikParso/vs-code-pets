// The coat sheet (debug mode): every coat in every frame (coat-sheet-art.ts), in the middle of the
// window. The sheet button in the 🐈‍⬛'s menu opens it; Esc or a click outside closes it; a click
// on it puts the collars on or takes them off.
import { paintSheet, sheetSize } from './coat-sheet-art';
import { centredPopup, paintCanvas } from './popup';

export class CoatSheet {
  readonly popup = centredPopup('pixel-cat-coat-sheet');
  private readonly canvas = document.createElement('canvas');
  private collars = true;
  private drawn = '';

  /** `pixels`: from the Renderer. */
  constructor(private readonly pixels: () => { px: number; dpr: number }) {
    this.popup.el.appendChild(this.canvas);
    this.canvas.addEventListener('click', () => (this.collars = !this.collars));
  }

  show(): void {
    this.popup.show();
    this.drawn = '';
  }

  /** Redraws it if it is open and anything has changed. Called every animation frame. */
  frame(): void {
    if (!this.popup.isOpen) return;
    const { px, dpr } = this.pixels();
    const key = `${px}|${dpr}|${this.collars}`;
    if (key === this.drawn) return;
    this.drawn = key;
    const { width, height } = sheetSize();
    paintCanvas(this.canvas, width, height, { px, dpr }, (paint) => paintSheet(paint, this.collars, px));
  }
}
