// The cat boxes panel: every cat in its box, wherever it is roaming, floating in the middle of
// the window. The box in the 🐈‍⬛'s menu opens it; its X, Esc or a click outside closes it.
// Clicking a cat's box shuts it in (packed: it does not roam) or lets it out again. The button
// beside the box takes the cat's next step (collection.ts): claim its collar, bring a friend, or
// say goodbye. It reads the collection (catBoxes), shared by every window, so all windows show
// the same, and it keeps up with meals eaten, boxes shut and
// steps taken in other windows, and with hunger growing by itself.
import { catBoxes, FISH, HEARTS, type CatBox } from '../world/boxes';
import type { Clock } from '../world/clock';
import { BOXES, type Collection } from '../world/collection';
import { boxAt, closeAt, columnsFor, lookKey, onButton, paintPanel, panelSize } from './box-art';
import { paintCanvas, Popup } from './popup';

const REREAD_MS = 1000; // how often it reads the collection again while open
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
    private readonly collection: Collection,
    private readonly clock: Clock,
    private readonly pixels: () => { px: number; dpr: number }
  ) {
    this.canvas.setAttribute('role', 'img');
    this.popup.el.appendChild(this.canvas);
    this.canvas.addEventListener('click', (e) => {
      const { px, dpr } = this.pixels();
      this.clickAt((e.offsetX * dpr) / px, (e.offsetY * dpr) / px, this.canvas.width / px);
      this.readAt = -Infinity; // show it at once
    });
  }

  /** Opens it, reading and drawing everything afresh. */
  show(): void {
    this.popup.show();
    this.readAt = -Infinity;
    this.drawn = '';
  }

  // A click at (x, y) on the panel, `width` wide (all sprite px).
  private clickAt(x: number, y: number, width: number): void {
    if (closeAt(x, y, width)) return this.popup.close();
    const i = boxAt(x, y, this.cols);
    const box = this.boxes[i];
    if (!box) return; // not a cat's box
    if (onButton(x, y, this.cols, i)) this.collection.takeStep(box.id);
    else this.collection.togglePacked(box.id);
  }

  /** Redraws it if it is open and anything shown has changed. Called every animation frame. */
  frame(now: number): void {
    if (!this.popup.isOpen) return;
    if (now - this.readAt >= REREAD_MS) {
      this.boxes = catBoxes(this.collection.records(), this.clock);
      this.readAt = now;
    }
    const { px, dpr } = this.pixels();
    const fit = Math.floor((window.innerWidth * MAX_WIDTH * dpr) / px);
    const cols = Math.min(MAX_COLS, columnsFor(fit));
    this.cols = cols;
    const t = now / 1000;
    const key = `${px}|${dpr}|${lookKey(this.boxes, cols, t)}`;
    if (key === this.drawn) return;
    this.drawn = key;
    this.paint(cols, t, px, dpr);
  }

  private paint(cols: number, t: number, px: number, dpr: number): void {
    const spare = Math.max(0, BOXES - this.boxes.length);
    const { width, height } = panelSize(this.boxes.length + spare, cols);
    paintCanvas(this.canvas, width, height, { px, dpr }, (paint) => paintPanel(paint, this.boxes, spare, cols, t, px));
    this.canvas.setAttribute('aria-label', this.boxes.map(describe).join('; '));
  }
}

function describe(b: CatBox): string {
  const step = { collar: 'claim its collar', friend: 'bring a friend', depart: 'say goodbye' }[b.button.kind];
  return (
    `${b.name}${b.packed ? ' (packed)' : ''}: trust ${b.halfHearts / 2} of ${HEARTS} hearts, ${b.fish} of ${FISH} fish` +
    `${b.collar ? ', wearing its collar' : ''}; next: ${step}${b.button.enabled ? '' : ' (not yet)'}`
  );
}
