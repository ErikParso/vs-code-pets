// Drawing in sprite pixels through a `Paint` function, so the same art can go on a canvas
// (popup.ts) or into an image. The cat boxes panel and the 🐈‍⬛'s menu are drawn this way.

/** Fills a w x h rectangle of sprite pixels at (x, y). */
export type Paint = (x: number, y: number, w: number, h: number, color: string) => void;

/** Paints pixel art `rows` at (x, y): `color` maps each character to a colour; '.' is see-through. */
export function paintRows(paint: Paint, rows: readonly string[], x: number, y: number, color: (ch: string, col: number) => string | undefined): void {
  rows.forEach((row, ry) => {
    for (let rx = 0; rx < row.length; rx++) {
      if (row[rx] === '.') continue;
      const c = color(row[rx], rx);
      if (c) paint(x + rx, y + ry, 1, 1, c);
    }
  });
}
