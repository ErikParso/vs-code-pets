// The collection of coats: a card for every coat a cat can have, found or still to find, floating
// in the middle of the window. The cards in the 🐈‍⬛'s menu open it; its X, Esc or a click outside
// closes it. A coat counts as found if it was ever seen (seen.ts), or if a cat you have now is in
// it: then a cat new this moment shows at once, before the poll has noted its coat.
import type { CatDef } from '../world/cat';
import { COATS } from '../world/coats';
import type { SeenStore } from '../world/seen';
import { collectionSize, paintCollection } from './collection-art';
import { centredPopup, paintCanvas, spritePoint } from './popup';
import { closeAt } from './room-art';

const REREAD_MS = 1000; // how often it looks again at what has been found while open

export class CollectionPanel {
  readonly popup = centredPopup('pixel-cat-collection');
  private readonly canvas = document.createElement('canvas');
  private found = new Set<string>(); // the ids of the coats found
  private readAt = -Infinity;
  private drawn = '';

  /** `cats`: the cats you have now; `pixels`: from the Renderer. */
  constructor(
    private readonly seen: SeenStore,
    private readonly cats: () => readonly CatDef[],
    private readonly pixels: () => { px: number; dpr: number }
  ) {
    this.canvas.setAttribute('role', 'img');
    this.popup.el.appendChild(this.canvas);
    this.canvas.addEventListener('click', (e) => {
      const { x, y } = spritePoint(e, this.pixels());
      if (closeAt(x, y, this.canvas.width / this.pixels().px)) this.popup.close();
    });
  }

  /** Opens it, reading and drawing everything afresh. */
  show(): void {
    this.popup.show();
    this.readAt = -Infinity;
    this.drawn = '';
  }

  /** Redraws it if it is open and anything found has changed. Called every animation frame. */
  frame(now: number): void {
    if (!this.popup.isOpen) return;
    if (now - this.readAt >= REREAD_MS) {
      this.found = new Set([...this.seen.load(), ...this.cats().map((c) => c.coat)]);
      this.readAt = now;
    }
    const { px, dpr } = this.pixels();
    const key = `${px}|${dpr}|${[...this.found].sort().join()}`;
    if (key === this.drawn) return;
    this.drawn = key;
    const { width, height } = collectionSize(COATS.length);
    paintCanvas(this.canvas, width, height, { px, dpr }, (paint) => paintCollection(paint, COATS, (c) => this.found.has(c.id), px));
    const count = COATS.filter((c) => this.found.has(c.id)).length;
    const names = COATS.map((c) => (this.found.has(c.id) ? `${c.no}. ${c.name} (${c.rarity})` : `${c.no}. not found yet (${c.rarity})`));
    this.canvas.setAttribute('aria-label', `Collection: ${count} of ${COATS.length} coats found. ${names.join('; ')}`);
  }
}
