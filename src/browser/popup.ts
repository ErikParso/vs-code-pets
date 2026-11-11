// A popup over VS Code's window (the cat boxes, the 🐈‍⬛'s menu): a fixed element, hidden until
// shown, that Esc or a click outside it closes. And painting a canvas in sprite pixels.
import type { Paint } from './pixel-art';

export class Popup {
  readonly el = document.createElement('div');
  private shown = false;

  /** `display` is the element's display while shown. */
  constructor(className: string, style: Record<string, string>, private readonly display = 'block') {
    this.el.className = className;
    Object.assign(this.el.style, { position: 'fixed', pointerEvents: 'auto', lineHeight: '0', display: 'none' }, style);
    document.body.appendChild(this.el);
    document.addEventListener('keydown', (e) => e.key === 'Escape' && this.close(), true);
  }

  get isOpen(): boolean {
    return this.shown;
  }

  show(): void {
    this.shown = true;
    this.el.style.display = this.display;
  }

  close(): void {
    this.shown = false;
    this.el.style.display = 'none';
  }

  /** Closes it if `target` (what was clicked) is outside it. */
  clickedAt(target: unknown): void {
    if (this.shown && !(target instanceof Element && this.el.contains(target))) this.close();
  }
}

/** How much of the window's width a popup in the middle of it may take (more scrolls). */
export const MAX_WIDTH = 0.9;
const MAX_HEIGHT = 0.85; // ... and of its height

/** A popup in the middle of the window (the cat boxes, the collection), scrolling if it is too big for it. */
export function centredPopup(className: string): Popup {
  return new Popup(className, {
    left: '50%', top: '50%', transform: 'translate(-50%, -50%)', zIndex: '1001', maxWidth: `${MAX_WIDTH * 100}vw`,
    maxHeight: `${MAX_HEIGHT * 100}vh`, overflow: 'auto', boxShadow: '0 6px 24px rgba(0, 0, 0, 0.5)',
  });
}

/** Where mouse event `e` is on its canvas, in sprite px (`pixels`: from the Renderer). */
export function spritePoint(e: MouseEvent, { px, dpr }: { px: number; dpr: number }): { x: number; y: number } {
  return { x: (e.offsetX * dpr) / px, y: (e.offsetY * dpr) / px };
}

/** Sizes `canvas` to `w` x `h` sprite px, `px` device px each (`dpr` device px per CSS px), and paints it with `draw`. */
export function paintCanvas(canvas: HTMLCanvasElement, w: number, h: number, { px, dpr }: { px: number; dpr: number }, draw: (paint: Paint) => void): void {
  if (canvas.width !== w * px || canvas.height !== h * px) {
    canvas.width = w * px;
    canvas.height = h * px;
    canvas.style.width = `${(w * px) / dpr}px`;
    canvas.style.height = `${(h * px) / dpr}px`;
  }
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  draw((x, y, pw, ph, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(x * px, y * px, pw * px, ph * px);
  });
}
