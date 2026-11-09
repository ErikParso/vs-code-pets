// Which VS Code window has which cat. Each cat is a Web Lock shared by all VS Code windows: the
// window holding it has the cat, until it walks out (or the window closes, or it leaves for
// good). Then the next window in line gets it, maybe this one again; but once it has left for
// good (`stays` says no), no window lets it in again.
import type { CatDef } from '../world/cat';
import type { World } from '../world/world';

/** Lets each of `cats` into `world` whenever this window gets it, as long as it `stays`. */
export function roam(world: World, cats: readonly CatDef[], stays: (id: string) => boolean): void {
  for (const def of cats) roamOne(world, def, stays);
}

function roamOne(world: World, def: CatDef, stays: (id: string) => boolean): void {
  if (!navigator.locks) return world.spawn(def, () => {});
  const visit = () => (stays(def.id) ? new Promise<void>((done) => world.spawn(def, done)) : Promise.resolve());
  navigator.locks.request(`pixelCat.cat.${def.id}`, visit).then(() => stays(def.id) && roamOne(world, def, stays));
}
