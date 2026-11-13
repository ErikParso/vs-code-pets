// Pixel Cat, running inside VS Code's own window (the extension injects the bundle of this).
// The cats live on a click-through overlay and treat the edges of the workbench parts
// (sidebar, editor, panel, status bar, ...) as floors they walk on and walls they climb. This
// wires the browser side together: the World (world.ts), driven by a Driver (driver.ts) on
// VS Code's timers and animation frames, drawn by the Renderer.
import { CarePanel } from './care-panel';
import { CatBoxes } from './cat-boxes';
import { FishMenu } from './fish-menu';
import { localCatStore, localSeenStore } from './cat-store';
import { CollectionPanel } from './collection-panel';
import { systemClock } from '../world/clock';
import { Collection } from '../world/collection';
import { Driver, POLL_MS } from '../world/driver';
import { Random } from '../world/random';
import { withCoatsOf } from '../world/seen';
import { Renderer } from './renderer';
import { roam } from './roaming';
import { Tooltip } from './tooltip';
import { workbench } from './workbench';
import { World } from '../world/world';

declare global {
  interface Window {
    __pixelCatRunning?: boolean;
  }
}

const WAIT_MS = 500; // how often it looks for the workbench while VS Code is still building it
const SCALE = 2; // CSS px per cat pixel

export function startPixelCat(): void {
  if (window.__pixelCatRunning) return;
  window.__pixelCatRunning = true;

  // Your cats: at first Jexit, Erik and Boris, then whoever they bring (see collection.ts). Which
  // window each is in is settled by Web Locks (roaming.ts).
  const collection = new Collection(localCatStore, new Random(), systemClock);
  const stays = (id: string) => collection.cats().some((c) => c.id === id);

  const world = new World({ random: new Random(), clock: systemClock, careStore: collection.care });
  let renderer: Renderer;
  let carePanel: CarePanel;
  let catBoxes: CatBoxes;
  let cards: CollectionPanel;
  let menu: FishMenu;
  let ink = '#888';
  const driver = new Driver({
    world,
    cats: () => collection.cats(),
    layout: () => workbench.layout(renderer.width, renderer.height, world.catW, world.catH),
    letIn: (w, defs) => roam(w, defs, stays),
  });

  function resize() {
    renderer.resize();
    world.resize(renderer.width, renderer.px, renderer.dpr);
    driver.relayout();
  }

  function poll() {
    // Every coat among your cats is seen, for the collection, for good (seen.ts).
    const seen = withCoatsOf(localSeenStore.load(), collection.cats());
    if (seen) localSeenStore.save(seen);
    const wasShown = driver.shown;
    driver.poll(workbench.statusLabel());
    if (driver.shown !== wasShown) console.info(`[pixel-cat] ${driver.shown ? 'showing' : 'hiding'} the cats`);
    if (driver.shown && !wasShown) ink = workbench.ink();
    carePanel.render(world, driver.shown && driver.debug);
    if (!driver.shown) for (const p of [catBoxes.popup, cards.popup, menu.popup]) p.close();
  }

  function frame(now: number) {
    driver.frame(now);
    renderer.draw(world, driver.shown, { debug: driver.debug, ink });
    catBoxes.frame(now);
    cards.frame(now);
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
    // in (or lets it out); the button beside it takes the cat's next step.
    catBoxes = new CatBoxes(collection, systemClock, () => renderer, new Tooltip());
    // The collection: a card for every coat, found or still to find.
    cards = new CollectionPanel(localSeenStore, () => collection.cats(), () => renderer, new Tooltip());
    // The 🐈‍⬛'s menu: a fish or a ball of yarn to throw from the 🐈‍⬛, a box to open the cat boxes,
    // the cards to open the collection.
    menu = new FishMenu(() => renderer, {
      fish: (from) => world.throwFish(from.x, from.y),
      yarn: (from) => world.throwYarn(from.x, from.y),
      box: () => {
        cards.popup.close();
        catBoxes.show();
      },
      cards: () => {
        catBoxes.popup.close();
        cards.show();
      },
    });
    workbench.onOtherClick((target) => {
      for (const p of [catBoxes.popup, cards.popup, menu.popup]) p.clickedAt(target);
    });
    resize();
    window.addEventListener('resize', resize);
    // The 🐈‍⬛ the extension shows in the status bar opens its menu. (In debug mode, modifier+clicks
    // change the cats' last meal and trust instead.)
    workbench.onFishClick((click) => {
      if (!driver.shown) return;
      if (driver.debug && (click.ctrlKey || click.altKey || click.shiftKey)) {
        for (const c of world.cats) {
          if (click.ctrlKey) c.care.addTrust(click.shiftKey ? -0.1 : 0.1);
          else c.care.shiftFedAt(click.altKey ? -6 : 6);
        }
        world.save();
        return;
      }
      catBoxes.popup.close();
      cards.popup.close();
      menu.toggle(click.x, click.y);
    });
    setInterval(poll, POLL_MS);
    requestAnimationFrame(frame);
  }

  start();
}
