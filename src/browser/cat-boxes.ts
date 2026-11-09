// The cat boxes panel: every cat in its box, wherever it is roaming, floating in the middle of
// the window. The box in the 🐈‍⬛'s menu opens it; its X, Esc or a click outside closes it.
// Clicking a cat's box shuts it in (packed: it does not roam) or lets it out again. The button
// beside the box takes the cat's next step (collection.ts): claim its collar, bring a friend, or
// say goodbye (asked first: Yes says it, anything else doesn't); while it cannot be pressed yet, hovering it says why, in a tooltip. It reads the
// collection (catBoxes), shared by every window, so all windows show the same, and it keeps up
// with meals eaten, boxes shut and steps taken in other windows, and with hunger growing by itself.
import { catBoxes, FISH, HEARTS, type CatBox } from '../world/boxes';
import type { Clock } from '../world/clock';
import { BOXES, type Collection } from '../world/collection';
import { boxAt, closeAt, columnsFor, lookKey, onButton, onGoodbyeYes, paintGoodbye, paintPanel, panelSize } from './box-art';
import { paintCanvas, Popup } from './popup';
import type { Tooltip } from './tooltip';

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
  private mouse: { x: number; y: number; clientX: number; clientY: number } | null = null; // over the panel (x, y in sprite px)
  private goodbye: string | null = null; // the id of the cat it is asking whether to say goodbye to

  /** `px`: device pixels per sprite pixel; `dpr`: device pixels per CSS pixel (both from the Renderer). */
  constructor(
    private readonly collection: Collection,
    private readonly clock: Clock,
    private readonly pixels: () => { px: number; dpr: number },
    private readonly tooltip: Tooltip
  ) {
    this.canvas.setAttribute('role', 'img');
    this.popup.el.appendChild(this.canvas);
    this.canvas.addEventListener('click', (e) => {
      const { px, dpr } = this.pixels();
      this.clickAt((e.offsetX * dpr) / px, (e.offsetY * dpr) / px, this.canvas.width / px, this.canvas.height / px);
      this.readAt = -Infinity; // show it at once
    });
    this.canvas.addEventListener('mousemove', (e) => {
      const { px, dpr } = this.pixels();
      this.mouse = { x: (e.offsetX * dpr) / px, y: (e.offsetY * dpr) / px, clientX: e.clientX, clientY: e.clientY };
      this.updateTooltip();
    });
    this.canvas.addEventListener('mouseleave', () => {
      this.mouse = null;
      this.updateTooltip();
    });
  }

  /** Opens it, reading and drawing everything afresh. */
  show(): void {
    this.popup.show();
    this.goodbye = null;
    this.readAt = -Infinity;
    this.drawn = '';
  }

  // A click at (x, y) on the panel, `width` x `height` (all sprite px).
  private clickAt(x: number, y: number, width: number, height: number): void {
    const asking = this.asking();
    if (asking) {
      // Its Yes says goodbye; a click anywhere else is a no.
      if (onGoodbyeYes(x, y, asking.box.name, asking.i, this.cols, width, height)) this.collection.takeStep(asking.box.id);
      this.goodbye = null;
      return;
    }
    if (closeAt(x, y, width)) return this.popup.close();
    const i = boxAt(x, y, this.cols);
    const box = this.boxes[i];
    if (!box) return; // not a cat's box
    if (!onButton(x, y, this.cols, i)) return this.collection.togglePacked(box.id);
    if (box.button.kind === 'depart' && !box.button.why) this.goodbye = box.id; // asked first
    else this.collection.takeStep(box.id);
    this.updateTooltip();
  }

  // The cat it is asking about, and where its box is; null if it is not asking (or the cat has
  // gone meanwhile, from another window).
  private asking(): { box: CatBox; i: number } | null {
    const i = this.boxes.findIndex((b) => b.id === this.goodbye);
    return i >= 0 ? { box: this.boxes[i], i } : null;
  }

  // The tooltip for the button under the mouse: why it cannot be pressed yet; none for anything else.
  private updateTooltip(): void {
    const m = this.popup.isOpen && !this.asking() ? this.mouse : null;
    const i = m ? boxAt(m.x, m.y, this.cols) : -1;
    const why = m && this.boxes[i] && onButton(m.x, m.y, this.cols, i) ? this.boxes[i].button.why : null;
    if (m && why) this.tooltip.show(why, m.clientX, m.clientY);
    else this.tooltip.hide();
  }

  /** Redraws it if it is open and anything shown has changed. Called every animation frame. */
  frame(now: number): void {
    if (!this.popup.isOpen) return this.updateTooltip();
    if (now - this.readAt >= REREAD_MS) {
      this.boxes = catBoxes(this.collection.records(), this.clock);
      this.readAt = now;
      this.updateTooltip(); // what it says may have changed (or the button come on)
    }
    const { px, dpr } = this.pixels();
    const fit = Math.floor((window.innerWidth * MAX_WIDTH * dpr) / px);
    const cols = Math.min(MAX_COLS, columnsFor(fit));
    this.cols = cols;
    const t = now / 1000;
    const key = `${px}|${dpr}|${this.goodbye}|${lookKey(this.boxes, cols, t)}`;
    if (key === this.drawn) return;
    this.drawn = key;
    this.paint(cols, t, px, dpr);
  }

  private paint(cols: number, t: number, px: number, dpr: number): void {
    const spare = Math.max(0, BOXES - this.boxes.length);
    const { width, height } = panelSize(this.boxes.length + spare, cols);
    const asking = this.asking();
    paintCanvas(this.canvas, width, height, { px, dpr }, (paint) => {
      paintPanel(paint, this.boxes, spare, cols, t, px);
      if (asking) paintGoodbye(paint, asking.box.name, asking.i, cols, width, height);
    });
    const label = asking ? `Say goodbye to ${asking.box.name}? Yes, No` : this.boxes.map(describe).join('; ');
    this.canvas.setAttribute('aria-label', label);
  }
}

function describe(b: CatBox): string {
  const step = { collar: 'claim its collar', friend: 'bring a friend', depart: 'say goodbye' }[b.button.kind];
  return (
    `${b.name}${b.packed ? ' (packed)' : ''}: trust ${b.halfHearts / 2} of ${HEARTS} hearts, ${b.fish} of ${FISH} fish` +
    `${b.collar ? ', wearing its collar' : ''}; next: ${step}${b.button.why ? ` (not yet: ${b.button.why})` : ''}`
  );
}
