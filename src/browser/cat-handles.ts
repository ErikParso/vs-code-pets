// An invisible handle over each cat, above everything in the window (webviews too), following it
// every frame. Press on it to pick the cat up, carry it about, let go to drop it. The handle
// captures the pointer, so every move and the release come to it, over a webview or outside the
// window too, and VS Code underneath gets none of it.
import type { Cat } from '../world/cat';
import type { World } from '../world/world';

export class CatHandles {
  private readonly handles = new Map<Cat, HTMLElement>();

  constructor(private readonly world: World) {}

  frame(shown: boolean): void {
    const cats = shown ? this.world.cats : [];
    for (const [cat, el] of this.handles) {
      if (cats.includes(cat)) continue;
      el.remove();
      this.handles.delete(cat);
    }
    for (const cat of cats) {
      const el = this.handles.get(cat) ?? this.add(cat);
      const b = this.world.boxOf(cat);
      Object.assign(el.style, { left: `${b.x}px`, top: `${b.y}px`, width: `${b.w}px`, height: `${b.h}px` });
    }
  }

  private add(cat: Cat): HTMLElement {
    const { world } = this;
    const el = document.createElement('div');
    Object.assign(el.style, { position: 'fixed', zIndex: '1000', cursor: 'grab' });
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault(); // no focus, no text selection
      if (e.button !== 0) return;
      el.setPointerCapture(e.pointerId);
      el.style.cursor = 'grabbing';
      world.grab(cat, e.clientX, e.clientY);
    });
    el.addEventListener('pointermove', (e) => el.hasPointerCapture(e.pointerId) && world.carry(cat, e.clientX, e.clientY));
    // Released, cancelled, or lost however: it drops.
    el.addEventListener('lostpointercapture', () => {
      el.style.cursor = 'grab';
      world.drop(cat);
    });
    document.body.appendChild(el);
    this.handles.set(cat, el);
    return el;
  }
}
