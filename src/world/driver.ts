// Drives a World the same way wherever it runs: in VS Code's window (app.ts) and in the tests
// (test/sim/session.js). Every POLL_MS the status bar's 🐈‍⬛ label is polled: it says whether the
// cats are out and whether debug mode is on, and the first time the cats are out they are let in.
// Every display frame the world moves on by the time since the last one.
import type { CatDef } from './cat';
import type { Layout } from './layout';
import type { World } from './world';

export const POLL_MS = 700; // how often the status bar is polled
const MAX_DT = 0.05; // s; a longer pause (a hidden window) is not caught up on

export interface DriverDeps {
  world: World;
  cats: readonly CatDef[];
  /** The workbench's floors and walls now. */
  layout: () => Layout;
  /** Lets the cats in, each whenever this window gets it (see roaming.ts). */
  letIn: (world: World, cats: readonly CatDef[]) => void;
}

export class Driver {
  shown = false; // the cats are out (the extension shows its 🐈‍⬛)
  debug = false; // debug mode: floors, walls and hunger drawn, the care panel shown
  private roaming = false;
  private last = 0; // the last frame's time, ms

  constructor(private readonly deps: DriverDeps) {}

  /** The status bar was polled; `label` is the 🐈‍⬛'s label, '' if there is none. */
  poll(label: string): void {
    this.debug = label.includes(' (debug)');
    this.shown = !!label;
    if (!this.shown) return;
    this.relayout();
    if (!this.roaming) {
      this.roaming = true;
      this.deps.letIn(this.deps.world, this.deps.cats);
    }
    this.deps.world.checkPacked();
    this.deps.world.save();
  }

  /** The workbench may have changed: re-read its floors and walls. */
  relayout(): void {
    this.deps.world.setLayout(this.deps.layout());
  }

  /** A display frame at `now` ms. */
  frame(now: number): void {
    const { world } = this.deps;
    const dt = Math.min(MAX_DT, this.last ? (now - this.last) / 1000 : 0);
    this.last = now;
    if (this.shown) world.step(dt);
    world.ageEmotions(dt);
  }
}
