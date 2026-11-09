// A tooltip: a line of text on a small dark sign, like the cat boxes' signs, just below and right
// of a point (the mouse), kept inside the window. It comes up almost at once (DELAY_MS, so a mouse
// only passing over does not flash it) and, once up, follows the mouse and changes text at once.
// Anything can use it: show it with the text and where the mouse is, hide it when the mouse
// leaves.

const DELAY_MS = 80;
const OFFSET = { x: 12, y: 16 }; // CSS px from the mouse
const MARGIN = 4; // CSS px it keeps from the window's edges

const STYLE = {
  background: '#1f1f1f',
  border: '1px solid #000000',
  color: '#f6f0dc',
};

export class Tooltip {
  private readonly el = document.createElement('div');
  private timer: ReturnType<typeof setTimeout> | null = null;
  private shown = false;

  constructor() {
    Object.assign(this.el.style, {
      position: 'fixed', zIndex: '1002', display: 'none', pointerEvents: 'none', whiteSpace: 'nowrap',
      padding: '3px 6px', boxShadow: '0 2px 6px rgba(0, 0, 0, 0.5)', ...STYLE,
      fontFamily: 'var(--vscode-font-family, sans-serif)', fontSize: '12px', lineHeight: '16px',
    });
    this.el.setAttribute('role', 'tooltip');
    document.body.appendChild(this.el);
  }

  /** Shows `text` by the point (x, y) in CSS px of the window: after DELAY_MS, or at once if it is up. */
  show(text: string, x: number, y: number): void {
    this.el.textContent = text;
    if (this.shown) return this.place(x, y);
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      this.shown = true;
      this.el.style.display = 'block';
      this.place(x, y);
    }, DELAY_MS);
  }

  hide(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.shown = false;
    this.el.style.display = 'none';
  }

  // Below and right of (x, y); left of it or above it where the window ends.
  private place(x: number, y: number): void {
    const { offsetWidth: w, offsetHeight: h } = this.el;
    const left = x + OFFSET.x + w + MARGIN > window.innerWidth ? x - OFFSET.x - w : x + OFFSET.x;
    const top = y + OFFSET.y + h + MARGIN > window.innerHeight ? y - OFFSET.y - h : y + OFFSET.y;
    this.el.style.left = `${Math.max(MARGIN, left)}px`;
    this.el.style.top = `${Math.max(MARGIN, top)}px`;
  }
}
