// Debug mode's Cat Care panel: each cat's hunger and trust, with buttons to change them.
import type { Cat } from '../world/cat';
import { HOUR, STARVE_AFTER } from '../world/config';
import type { World } from '../world/world';

export class CarePanel {
  private readonly el: HTMLDivElement;

  constructor() {
    this.el = document.createElement('div');
    Object.assign(this.el.style, {
      position: 'fixed', right: '16px', top: '36px', zIndex: '1000', display: 'none',
      minWidth: '310px', padding: '10px', border: '1px solid var(--vscode-editorWidget-border, #555)',
      background: 'var(--vscode-editorWidget-background, #252526)', color: 'var(--vscode-editorWidget-foreground, #ccc)',
      fontFamily: 'var(--vscode-font-family, sans-serif)', fontSize: '12px', pointerEvents: 'auto',
    });
    document.body.appendChild(this.el);
  }

  /** Shows the panel for the cats in `world` if `visible`, and hides it if not. */
  render(world: World, visible: boolean): void {
    const panel = this.el;
    panel.style.display = visible ? 'block' : 'none';
    if (!visible) return;
    panel.replaceChildren();
    const title = document.createElement('strong');
    title.textContent = 'Cat Care';
    panel.appendChild(title);
    if (!world.cats.length) {
      const empty = document.createElement('div');
      empty.textContent = 'No cats are visiting this window.';
      empty.style.marginTop = '8px';
      panel.appendChild(empty);
      return;
    }
    for (const c of world.cats) {
      const row = document.createElement('div');
      Object.assign(row.style, { display: 'flex', alignItems: 'center', marginTop: '8px', whiteSpace: 'nowrap' });
      const details = document.createElement('span');
      details.textContent = `${c.name}: ${mealLabel(c, world.clock.now())}, trust ${c.hunger.trust.toFixed(2)}`;
      details.style.flex = '1';
      row.appendChild(details);
      const adjust = (hours: number, trust: number) => () => {
        c.hunger.shiftFedAt(hours);
        c.hunger.addTrust(trust);
        world.save();
        this.render(world, visible);
      };
      row.appendChild(button('-6h', 'Make the cat six hours hungrier', adjust(-6, 0)));
      row.appendChild(button('+6h', 'Give the cat six more hours before its meal', adjust(6, 0)));
      row.appendChild(button('-T', 'Subtract 0.1 trust', adjust(0, -0.1)));
      row.appendChild(button('+T', 'Add 0.1 trust', adjust(0, 0.1)));
      panel.appendChild(row);
    }
  }
}

function mealLabel(c: Cat, now: number): string {
  const left = STARVE_AFTER - c.hunger.sinceFed();
  if (left <= 0) return 'Starving';
  const hours = Math.floor(left / HOUR);
  const minutes = Math.floor((left % HOUR) / (60 * 1000));
  return `${c.hunger.asking() ? 'Hungry' : c.hunger.canEat() ? 'Normal' : 'Fed'}: ${hours}h ${minutes}m`;
}

function button(label: string, title: string, action: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.textContent = label;
  b.title = title;
  b.setAttribute('aria-label', title);
  Object.assign(b.style, {
    minWidth: '38px', marginLeft: '4px', padding: '2px 4px', border: '1px solid var(--vscode-button-border, transparent)',
    background: 'var(--vscode-button-secondaryBackground, #3a3d41)', color: 'var(--vscode-button-secondaryForeground, #fff)',
  });
  b.addEventListener('click', action);
  return b;
}
