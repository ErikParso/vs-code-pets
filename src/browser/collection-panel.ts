// The collection of coats: a card for every coat a cat can have, found or still to find, floating
// in the middle of the window. The cards in the 🐈‍⬛'s menu open it; its X, Esc or a click outside
// closes it. A coat counts as found if it was ever seen (seen.ts), or if a cat you have now is in
// it: then a cat new this moment shows at once, before the poll has noted its coat. A found card
// shines with the rarest shine a cat in its coat ever had, or has now (seen.ts), the same way.
import type { CatDef } from '../world/cat';
import { COATS } from '../world/coats';
import { withCatsOf, type SeenStore } from '../world/seen';
import type { Shine } from '../world/shine';
import { collectionSize, paintCollection, specialCoatAt } from './collection-art';
import { centredPopup, paintCanvas, spritePoint } from './popup';
import { closeAt } from './room-art';
import { shimmerFrame } from './shine';
import { Tooltip } from './tooltip';

const REREAD_MS = 1000; // how often it looks again at what has been found while open

export class CollectionPanel {
  readonly popup = centredPopup('pixel-cat-collection');
  private readonly canvas = document.createElement('canvas');
  private found = new Set<string>(); // the ids of the coats found
  private shiny = new Map<string, Shine>(); // coat id -> the rarest shine seen in it
  private readAt = -Infinity;
  private drawn = '';

  /** `cats`: the cats you have now; `pixels`: from the Renderer. */
  constructor(
    private readonly seen: SeenStore,
    private readonly cats: () => readonly CatDef[],
    private readonly pixels: () => { px: number; dpr: number },
    private readonly tooltip: Tooltip
  ) {
    this.canvas.setAttribute('role', 'img');
    this.popup.el.appendChild(this.canvas);
    this.canvas.addEventListener('click', (e) => {
      const { x, y } = spritePoint(e, this.pixels());
      if (closeAt(x, y, this.canvas.width / this.pixels().px)) {
        this.popup.close();
        this.tooltip.hide();
        return;
      }
      const coat = specialCoatAt(COATS, x, y);
      if (coat?.lockedByDonation) window.open(coat.lockedByDonation, '_blank', 'noopener,noreferrer');
    });
    this.canvas.addEventListener('mousemove', (e) => {
      const { x, y } = spritePoint(e, this.pixels());
      const coat = specialCoatAt(COATS, x, y);
      if (coat?.lockedByDonation) this.tooltip.show('Sponsor this coat', e.clientX, e.clientY);
      else if (coat?.sponsor) this.tooltip.show(`Sponsored by ${coat.sponsor}`, e.clientX, e.clientY);
      else this.tooltip.hide();
    });
    this.canvas.addEventListener('mouseleave', () => this.tooltip.hide());
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
      // As saved, with the cats you have now put in: a cat new this moment shows at once.
      const seen = this.seen.load();
      const all = withCatsOf(seen, this.cats()) ?? seen;
      this.found = new Set(all.map((s) => s.coatId));
      this.shiny = new Map(all.flatMap((s) => (s.shine ? [[s.coatId, s.shine] as const] : [])));
      this.readAt = now;
    }
    const { px, dpr } = this.pixels();
    const shiny = this.shiny;
    const t = now / 1000;
    const shimmer = shiny.size ? shimmerFrame(t) : '';
    const key = `${px}|${dpr}|${[...this.found].sort().join()}|${shimmer}`;
    if (key === this.drawn) return;
    this.drawn = key;
    const { width, height } = collectionSize(COATS.length);
    paintCanvas(this.canvas, width, height, { px, dpr }, (paint) =>
      paintCollection(paint, COATS, (c) => this.found.has(c.id), px, (c) => shiny.get(c.id), t)
    );
    const count = COATS.filter((c) => this.found.has(c.id)).length;
    const names = COATS.map((c, i) => (this.found.has(c.id) ? `${i + 1}. ${c.name} (${c.rarity})` : `${i + 1}. not found yet (${c.rarity})`));
    this.canvas.setAttribute('aria-label', `Collection: ${count} of ${COATS.length} coats found. ${names.join('; ')}`);
  }
}
