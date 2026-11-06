// VS Code's workbench as the cats see it: the parts whose edges are their floors and walls, the
// 🐟 and 📦 the extension shows in the status bar while cats are out, and VS Code's text colour.
import { layoutFromRects, Layout, PARTS, Rect } from '../world/layout';

// While any cats are out, the extension shows its 🐟 in the status bar, labelled (for screen
// readers, as aria-label) "Pixel Cat: throw a fish to Jexit, Erik", plus " (debug)" in debug
// mode. No such item means: no cats.
const LABEL = 'Pixel Cat: throw a fish to ';
const STATUS_BAR = '.monaco-workbench .part.statusbar';

/** A click on the 🐟: where it is (to throw a fish from), and which modifier keys were held. */
export interface FishClick {
  x: number;
  y: number;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}

export const workbench = {
  /** Whether VS Code has built its workbench yet. */
  ready(): boolean {
    return !!document.querySelector(STATUS_BAR);
  },

  /** The floors and walls of the workbench, for a window `width` x `height` and a cat `catW` x `catH`. */
  layout(width: number, height: number, catW: number, catH: number): Layout {
    const rects: Rect[] = [];
    for (const sel of PARTS) {
      for (const el of document.querySelectorAll(sel)) rects.push(el.getBoundingClientRect());
    }
    return layoutFromRects(rects, width, height, catW, catH);
  },

  /** The 🐟's label, or '' if the extension shows none (no cats). */
  statusLabel(): string {
    const item = document.querySelector(`.part.statusbar .statusbar-item[aria-label^="${LABEL}"]`);
    return (item && item.getAttribute('aria-label')) || '';
  },

  /** VS Code's text colour, to draw Zs and meters in. */
  ink(): string {
    return (
      getComputedStyle(document.querySelector('.monaco-workbench') || document.body)
        .getPropertyValue('--vscode-foreground')
        .trim() || '#888'
    );
  },

  /** Calls `handler` whenever the 🐟 in the status bar is clicked. */
  onFishClick(handler: (click: FishClick) => void): void {
    document.addEventListener(
      'click',
      (e) => {
        const item = statusItem(e.target, '🐟');
        if (!item) return;
        const r = item.getBoundingClientRect();
        handler({ x: r.left + r.width / 2, y: r.top, ctrlKey: e.ctrlKey, altKey: e.altKey, shiftKey: e.shiftKey });
      },
      true
    );
  },

  /** Calls `onBoxes` whenever the 📦 in the status bar is clicked, and `elsewhere` with what was clicked for any other click. */
  onBoxesClick(onBoxes: () => void, elsewhere: (target: EventTarget | null) => void): void {
    document.addEventListener('click', (e) => (statusItem(e.target, '📦') ? onBoxes() : elsewhere(e.target)), true);
  },
};

// The status bar item `target` is in, if it shows `icon`.
function statusItem(target: EventTarget | null, icon: string): Element | null {
  const item = target instanceof Element && target.closest('.statusbar-item');
  return item && (item.textContent || '').includes(icon) ? item : null;
}
