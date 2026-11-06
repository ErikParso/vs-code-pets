// A popup over VS Code's window (the cat boxes, the 🐈‍⬛'s menu): a fixed element, hidden until
// shown, that Esc or a click outside it closes. And painting a canvas in sprite pixels.
import type { Paint } from './box-art';

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
