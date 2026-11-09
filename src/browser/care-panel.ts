// Debug mode's Cat Care panel: each cat's feeding, playing and trust, each with buttons to change it.
import type { Cat } from '../world/cat';
import { HOUR } from '../world/config';
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
      const name = document.createElement('div');
      name.textContent = c.name;
      Object.assign(name.style, { marginTop: '10px', fontWeight: 'bold' });
      panel.appendChild(name);
      // Each change is saved and shown at once.
      const change = (fn: () => void) => () => {
        fn();
        world.save();
        this.render(world, visible);
      };
      const care = c.care;
      panel.appendChild(
        group('Feeding', `${mealState(c)}, fed ${duration(care.sinceFed())} ago`, [
          button('-6h', 'Fed six hours earlier: hungrier', change(() => care.shiftFedAt(-6))),
          button('+6h', 'Fed six hours later: fuller', change(() => care.shiftFedAt(6))),
        ])
      );
      const played = care.playedAt ? `played ${duration(care.sincePlayed())} ago` : 'never played';
      panel.appendChild(
        group('Playing', `${care.happy() ? 'Happy' : 'Bored'}, ${played}`, [
          button('-6h', 'Played six hours earlier: sooner bored', change(() => care.shiftPlayedAt(-6))),
          button('+6h', 'Played six hours later: happier', change(() => care.shiftPlayedAt(6))),
        ])
      );
      panel.appendChild(
        group('Trust', care.trust.toFixed(2), [
          button('-0.1', 'Subtract 0.1 trust', change(() => care.addTrust(-0.1))),
          button('+0.1', 'Add 0.1 trust', change(() => care.addTrust(0.1))),
        ])
      );
    }
  }
}

/** One row of a cat's care: a label, what it is now, and the buttons that change it. */
function group(label: string, state: string, buttons: HTMLButtonElement[]): HTMLDivElement {
  const row = document.createElement('div');
  Object.assign(row.style, { display: 'flex', alignItems: 'center', marginTop: '4px', whiteSpace: 'nowrap' });
  const name = document.createElement('span');
  name.textContent = label;
  name.style.width = '60px';
  const details = document.createElement('span');
  details.textContent = state;
  details.style.flex = '1';
  for (const child of [name, details, ...buttons]) row.appendChild(child);
  return row;
}

function mealState(c: Cat): string {
  const care = c.care;
  return care.starving() ? 'Starving' : care.asking() ? 'Hungry' : care.canEat() ? 'Normal' : 'Fed';
}

/** `ms` as "5h 20m". */
function duration(ms: number): string {
  return `${Math.floor(ms / HOUR)}h ${Math.floor((ms % HOUR) / (60 * 1000))}m`;
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
