// How a shiny cat's shine (world/shine.ts) looks. It tints the cat's fur (not its outline), one
// colour per sprite pixel so it stays crisp. Its colour is a formula of where the pixel is and the
// time: bands that drift slowly, so a cat moving through them shimmers faster. The renderer
// (roaming cats), the cat boxes and the collection's cards all use it.
import type { Shine } from '../world/shine';
import type { Paint } from './pixel-art';

const SHINE_BAND = 40; // sprite px from one band of shine to the next
const SHINE_DRIFT = 0.15; // bands a second the shine drifts by on its own

const SHINE_FPS = 30; // how often something shimmering is redrawn, a second

/** A number that changes SHINE_FPS times a second: part of a redraw key while something shimmers. */
export function shimmerFrame(t: number): number {
  return Math.floor(t * SHINE_FPS);
}

/**
 * Lays `shine` at `t` s over the fur of art `rows` painted at (x, y): not its see-through pixels,
 * not its outline. Each pixel's colour is the shine's at `at(x, y)`, where that pixel is on the
 * shine's bands (sprite px); by default where it is painted.
 */
export function paintShine(
  paint: Paint,
  rows: readonly string[],
  x: number,
  y: number,
  shine: Shine,
  t: number,
  at: (x: number, y: number) => [number, number] = (px, py) => [px, py]
): void {
  rows.forEach((row, ry) => {
    for (let rx = 0; rx < row.length; rx++) {
      if (row[rx] === '.' || row[rx] === 'K') continue;
      const [bx, by] = at(x + rx, y + ry);
      paint(x + rx, y + ry, 1, 1, shineColor(shine, bx, by, t));
    }
  });
}

// The colour to lay over a fur pixel at (x, y) on the bands (sprite px) at time `t` (s).
function shineColor(shine: Shine, x: number, y: number, t: number): string {
  const phase = (x + y) / SHINE_BAND - t * SHINE_DRIFT;
  return shine === 'silver' ? silver(phase) : rainbow(phase);
}

const frac = (v: number) => v - Math.floor(v);

/** A cool sheen, with a narrow bright glint sweeping through it. */
function silver(phase: number): string {
  const glint = Math.max(0, 1 - Math.abs(frac(phase) - 0.5) / 0.12);
  return `rgba(225, 235, 255, ${(0.18 + 0.5 * glint).toFixed(3)})`;
}

/** Like silver, a glint sweeping through a faint sheen, but the glint in colour, its hue turning from band to band. */
function rainbow(phase: number): string {
  const glint = Math.max(0, 1 - Math.abs(frac(phase) - 0.5) / 0.15);
  const hue = Math.round(frac(phase / 4) * 360);
  return `hsla(${hue}, 90%, 65%, ${(0.1 + 0.45 * glint).toFixed(3)})`;
}
