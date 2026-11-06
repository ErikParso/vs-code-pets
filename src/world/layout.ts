// The cats' world, read off the workbench: the top edges of its parts are floors to walk on, the
// side edges walls to climb. Pure geometry: it gets the parts' rectangles, never the DOM.
import { EDGE } from './config';

export interface Floor {
  x1: number;
  x2: number;
  y: number;
}

export interface Wall {
  x: number;
  y1: number;
  y2: number;
}

export interface Layout {
  floors: Floor[];
  walls: Wall[];
}

/** A part's rectangle on screen, as getBoundingClientRect() gives it. */
export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

/** The workbench parts whose edges are floors (top edge) and walls (side edges), as selectors. */
export const PARTS = [
  '.part.titlebar',
  '.part.banner',
  '.part.activitybar',
  '.part.sidebar',
  '.part.editor',
  '.part.editor .editor-group-container',
  '.part.panel',
  '.part.auxiliarybar',
  '.part.statusbar',
];

/** Whether x is on floor f, give or take EDGE. */
export const touches = (f: Floor, x: number): boolean => f.x1 - EDGE <= x && x <= f.x2 + EDGE;

/**
 * The floors and walls of a window `width` x `height` whose parts are `rects`, for a cat of
 * `catW` x `catH`.
 */
export function layoutFromRects(rects: Rect[], width: number, height: number, catW: number, catH: number): Layout {
  const fs: Floor[] = [];
  const ws: Wall[] = [];
  for (const r of rects) {
    if (r.width <= 4 || r.height <= 4) continue;
    // Floors need room for the cat above them (its ear tips may poke past the window top)
    // and enough width to stand on.
    if (r.top >= catH * 0.8 && r.width >= catW * 0.6) {
      fs.push({ x1: Math.round(r.left), x2: Math.round(r.right), y: Math.round(r.top) });
    }
    ws.push({ x: Math.round(r.left), y1: Math.round(r.top), y2: Math.round(r.bottom) });
    ws.push({ x: Math.round(r.right), y1: Math.round(r.top), y2: Math.round(r.bottom) });
  }
  if (!fs.some((f) => f.y > height - 40)) fs.push({ x1: 0, x2: width, y: height });

  // Edges of neighbouring parts line up; merge them so the cat walks across seamlessly.
  fs.sort((a, b) => a.y - b.y || a.x1 - b.x1);
  const floors: Floor[] = [];
  for (const f of fs) {
    const prev = floors[floors.length - 1];
    if (prev && Math.abs(prev.y - f.y) <= 1 && f.x1 <= prev.x2 + 2) prev.x2 = Math.max(prev.x2, f.x2);
    else floors.push({ ...f });
  }
  ws.sort((a, b) => a.x - b.x || a.y1 - b.y1);
  const walls: Wall[] = [];
  for (const w of ws) {
    const prev = walls[walls.length - 1];
    if (prev && Math.abs(prev.x - w.x) <= 1 && w.y1 <= prev.y2 + 2) prev.y2 = Math.max(prev.y2, w.y2);
    else walls.push({ ...w });
  }
  // Nothing below the lowest floor (the status bar) is part of the cat's world.
  const bottom = Math.max(...floors.map((f) => f.y));
  for (const w of walls) w.y2 = Math.min(w.y2, bottom);
  return { floors, walls: walls.filter((w) => w.y2 - w.y1 > catW) };
}
