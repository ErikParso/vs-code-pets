// The colours pixel art is painted in, by character.

/** The colours every cat shares, whatever its coat: pink, a collar's tag, and the fish and yarn. */
export const SHARED: Readonly<Record<string, string>> = {
  P: '#f29bb0', // pink
  G: '#f2d14b', // a collar's tag
  B: '#4f9bd9', // fish
  L: '#cfe6f5', // fish belly
  R: '#d9506e', // yarn
  S: '#9c2f4b', // yarn shade
};

/** SHARED, and a red tabby's colours for art that is in no coat (fish, yarn, menu icons). */
export const PALETTE: Readonly<Record<string, string>> = {
  ...SHARED,
  K: '#2b1d14', // outline
  O: '#e8913a', // fur
  D: '#c46a22', // stripes
  W: '#fbe3c0', // chest and paws
};
