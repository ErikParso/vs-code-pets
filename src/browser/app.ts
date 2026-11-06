// Pixel Cat, running inside VS Code's own window (the extension injects the bundle of this).
// The cats live on a click-through overlay and treat the edges of the workbench parts
// (sidebar, editor, panel, status bar, ...) as floors they walk on and walls they climb. This
// wires the browser side together: the World (world.ts), driven by a Driver (driver.ts) on
// VS Code's timers and animation frames, drawn by the Renderer.
import { CarePanel } from './care-panel';
import { CatBoxes } from './cat-boxes';
import { FishMenu } from './fish-menu';
import { localCareStore } from './care-store';
import type { CatDef } from '../world/cat';
import { systemClock } from '../world/clock';
import { Driver, POLL_MS } from '../world/driver';
import { Random } from '../world/random';
import { Renderer } from './renderer';
import { roam } from './roaming';
import { workbench } from './workbench';
import { World } from '../world/world';

declare global {
  interface Window {
    __pixelCatRunning?: boolean;
    PixelCatConfig?: { cats?: CatDef[] };
  }
}

const WAIT_MS = 500; // how often it looks for the workbench while VS Code is still building it
const SCALE = 2; // CSS px per cat pixel

export function startPixelCat(): void {
  if (window.__pixelCatRunning) return;
  window.__pixelCatRunning = true;

  const config = window.PixelCatConfig || {};
  // The cats, from inject/cats.json (passed in by the extension); which window each is in is
  // settled by Web Locks (see roaming.ts).
  const CATS = config.cats || [];

  const world = new World({ random: new Random(), clock: systemClock, careStore: localCareStore });
  let renderer: Renderer;
  let carePanel: CarePanel;
  let catBoxes: CatBoxes;
  let menu: FishMenu;
  let ink = '#888';
  const driver = new Driver({
    world,
    cats: CATS,
    layout: () => workbench.layout(renderer.width, renderer.height, world.catW, world.catH),
    letIn: roam,
  });

  function resize() {
    renderer.resize();
    world.resize(renderer.width, renderer.px, renderer.dpr);
    driver.relayout();
  }

  function poll() {
    const wasShown = driver.shown;
    driver.poll(workbench.statusLabel());
    if (driver.shown !== wasShown) console.info(`[pixel-cat] ${driver.shown ? 'showing' : 'hiding'} the cats`);
    if (driver.shown && !wasShown) ink = workbench.ink();
    carePanel.render(world, driver.shown && driver.debug);
    if (!driver.shown) for (const p of [catBoxes.popup, menu.popup]) p.close();
  }

  function frame(now: number) {
    driver.frame(now);
    renderer.draw(world, driver.shown, { debug: driver.debug, ink });
    catBoxes.frame(now);
    requestAnimationFrame(frame);
  }

  function start() {
    if (!workbench.ready()) {
      setTimeout(start, WAIT_MS);
      return;
    }
    console.info('[pixel-cat] started');
    renderer = new Renderer(SCALE);
    carePanel = new CarePanel();
    // The cat boxes: every cat in its box, wherever it is roaming. Clicking a box shuts its cat
    // in (or lets it out).
    catBoxes = new CatBoxes(CATS, localCareStore, systemClock, () => renderer);
    // The 🐈‍⬛'s menu: a fish to throw from the 🐈‍⬛, a box to open the cat boxes.
    menu = new FishMenu(() => renderer, {
      fish: (from) => world.throwFish(from.x, from.y),
      box: () => catBoxes.show(),
    });
    workbench.onOtherClick((target) => {
      for (const p of [catBoxes.popup, menu.popup]) p.clickedAt(target);
    });
    resize();
    window.addEventListener('resize', resize);
    // The 🐈‍⬛ the extension shows in the status bar opens its menu. (In debug mode, modifier+clicks
    // change the cats' meal deadline and trust instead.)
    workbench.onFishClick((click) => {
      if (!driver.shown) return;
      if (driver.debug && (click.ctrlKey || click.altKey || click.shiftKey)) {
        for (const c of world.cats) {
          if (click.ctrlKey) c.hunger.addTrust(click.shiftKey ? -0.1 : 0.1);
          else c.hunger.shiftDeadline(click.altKey ? -6 : 6);
        }
        world.save();
        return;
      }
      catBoxes.popup.close();
      menu.toggle(click.x, click.y);
    });
    setInterval(poll, POLL_MS);
    requestAnimationFrame(frame);
  }

  start();
}
