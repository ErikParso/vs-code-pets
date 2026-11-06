// The cat boxes panel: every cat in its box, wherever it is roaming, floating in the middle of
// the window. The box in the 🐈‍⬛'s menu opens it; Esc or a click outside closes it.
// Clicking a cat's box shuts it in (packed: it does not roam) or lets it out again. It reads the
// shared care store (catBoxes), so all windows show the same, and it keeps up with meals eaten
// and boxes shut in other windows, and with hunger growing by itself.
import { catBoxes, FISH, HEARTS, SPARE_BOXES, togglePacked, type CatBox } from '../world/boxes';
import type { CatDef } from '../world/cat';
import type { Clock } from '../world/clock';
import type { CareStore } from '../world/hunger';
import { boxAt, columnsFor, lookKey, paintPanel, panelSize } from './box-art';
import { paintCanvas, Popup } from './popup';

const REREAD_MS = 1000; // how often it reads the care store again while open
const MAX_COLS = 5;
const MAX_WIDTH = 0.9; // of the window
const MAX_HEIGHT = 0.85;

export class CatBoxes {
  readonly popup = new Popup('pixel-cat-boxes', {
    left: '50%', top: '50%', transform: 'translate(-50%, -50%)', zIndex: '1001', maxWidth: `${MAX_WIDTH * 100}vw`,
    maxHeight: `${MAX_HEIGHT * 100}vh`, overflow: 'auto', boxShadow: '0 6px 24px rgba(0, 0, 0, 0.5)',
  });
  private readonly canvas = document.createElement('canvas');
  private boxes: CatBox[] = [];
  private readAt = -Infinity;
  private drawn = '';
  private cols = 1;

  /** `px`: device pixels per sprite pixel; `dpr`: device pixels per CSS pixel (both from the Renderer). */
  constructor(
    private readonly cats: readonly CatDef[],
    private readonly store: CareStore,
    private readonly clock: Clock,
    private readonly pixels: () => { px: number; dpr: number }
  ) {
    this.canvas.setAttribute('role', 'img');
    this.popup.el.appendChild(this.canvas);
    // A click on a cat's box shuts it in or lets it out (roaming.ts does the rest).
    this.canvas.addEventListener('click', (e) => {
      const { px, dpr } = this.pixels();
      const i = boxAt((e.offsetX * dpr) / px, (e.offsetY * dpr) / px, this.cols);
      if (!this.boxes[i]) return; // not a cat's box
      togglePacked(this.store, this.boxes[i].name);
      this.readAt = -Infinity; // show it at once
    });
  }

  /** Opens it, reading and drawing everything afresh. */
  show(): void {
    this.popup.show();
    this.readAt = -Infinity;
    this.drawn = '';
  }

  /** Redraws it if it is open and anything shown has changed. Called every animation frame. */
  frame(now: number): void {
    if (!this.popup.isOpen) return;
    if (now - this.readAt >= REREAD_MS) {
      this.boxes = catBoxes(this.cats, this.store, this.clock);
      this.readAt = now;
    }
    const { px, dpr } = this.pixels();
    const fit = Math.floor((window.innerWidth * MAX_WIDTH * dpr) / px);
    const cols = Math.min(MAX_COLS, this.boxes.length + SPARE_BOXES || 1, columnsFor(fit));
    this.cols = cols;
    const t = now / 1000;
    const key = `${px}|${dpr}|${lookKey(this.boxes, cols, t)}`;
    if (key === this.drawn) return;
    this.drawn = key;
    this.paint(cols, t, px, dpr);
  }

  private paint(cols: number, t: number, px: number, dpr: number): void {
    const { width, height } = panelSize(this.boxes.length + SPARE_BOXES, cols);
    paintCanvas(this.canvas, width, height, { px, dpr }, (paint) => paintPanel(paint, this.boxes, SPARE_BOXES, cols, t, fineFor(px)));
    this.canvas.setAttribute('aria-label', this.boxes.map(describe).join('; '));
  }
}

// The stickers' fine pixels: half a sprite pixel, in whole device pixels (so they stay crisp).
function fineFor(px: number): number {
  return Math.max(1, Math.floor(px / 2)) / px;
}

function describe(b: CatBox): string {
  const food = b.starving ? 'starving' : `${b.fish} of ${FISH} fish`;
  return `${b.name}${b.packed ? ' (packed)' : ''}: trust ${b.halfHearts / 2} of ${HEARTS} hearts, ${food}`;
}
