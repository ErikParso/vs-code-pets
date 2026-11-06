// Which VS Code window has which cat. Each cat is a Web Lock shared by all VS Code windows: the
// window holding it has the cat, until it walks out (or the window closes). Then the next window
// in line gets it, maybe this one again.
import type { CatDef } from '../world/cat';
import type { World } from '../world/world';

/** Lets each of `cats` into `world` whenever this window gets it. */
export function roam(world: World, cats: readonly CatDef[]): void {
  for (const def of cats) roamOne(world, def);
}

function roamOne(world: World, def: CatDef): void {
  if (!navigator.locks) return world.spawn(def, () => {});
  const visit = () => new Promise<void>((done) => world.spawn(def, done));
  navigator.locks.request(`pixelCat.cat.${def.name}`, visit).then(() => roamOne(world, def));
}
