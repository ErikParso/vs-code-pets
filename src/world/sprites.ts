// Hand-drawn cat frames, 24x16 pixels, facing right.
// One character per pixel: '.' transparent, K outline, O fur, D stripe, W cream, P pink,
// B fish, L fish belly, R yarn, S yarn shade, G a collar's tag.

const palette = {
  K: '#2b1d14',
  O: '#e8913a',
  D: '#c46a22',
  W: '#fbe3c0',
  P: '#f29bb0',
  B: '#4f9bd9',
  L: '#cfe6f5',
  R: '#d9506e',
  S: '#9c2f4b',
  G: '#f2d14b', // a collar's tag
};

// Standing body, shared by every on-four-legs frame (rows 0-12).
const body = [
  '................K....K..',
  '...............KPK..KPK.',
  '..KK...........KOOOOOOK.',
  '.KOK...........KOOOOOOK.',
  '.KOK...........KOKOOKOK.',
  '..KOK..........KWOPPOWK.',
  '...KOKKKKKKKKKKKWWWWWWK.',
  '....KOOODOOODOOOWWKKKK..',
  '....KOOODOOODOOOWWK.....',
  '....KOOODOOODOOOWWK.....',
  '....KOOOOOOOOOOOWWK.....',
  '....KWWWWWWWWWWWWWK.....',
  '....KOOKKKKKKKKOOK......',
];

// Leg rows (13-15) for each pose.
const legs = {
  stand: [
    '....KOOK......KOOK......',
    '....KWWK......KWWK......',
    '....KKKK......KKKK......',
  ],
  strideOut: [
    '...KOOK........KOOK.....',
    '..KWWK..........KWWK....',
    '..KKKK..........KKKK....',
  ],
  strideIn: [
    '.....KOOK...KOOK........',
    '......KWWK.KWWK.........',
    '......KKKK.KKKK.........',
  ],
  leap: [
    '..KOOK..........KOOK....',
    '.KWWK............KWWK...',
    '.KKK..............KKK...',
  ],
};

const blank = '........................';

const sit = [
  '................K....K..',
  '...............KPK..KPK.',
  '...............KOOOOOOK.',
  '...............KOOOOOOK.',
  '...............KOKOOKOK.',
  '...............KWOPPOWK.',
  '..............KOWWWWWWK.',
  '.............KOOWWKKKK..',
  '.............KODOWWK....',
  '............KOODOWWK....',
  '............KOODOOWWK...',
  '..........KOOOODOOWWK...',
  '..KK.....KOOOOOOOOKWWK..',
  '.KOK....KOOOODOOOOKWWK..',
  '.KOKKKKKOOOOOOOOOOKWWK..',
  '..KOOOOOKKKKKKKKKKKKKK..',
];

const sleep = [
  blank, blank, blank, blank, blank, blank,
  '.................K...K..',
  '........KKKKKKK.KPK.KPK.',
  '......KKOOODOOOKKOOOOOK.',
  '.....KOOOODOOOOKOOOOOOK.',
  '....KOOOODOOOOOOOKOOKOK.',
  '....KOOOODOOOOOOWOPPOWK.',
  '...KOOOOOOOOOOOOKWWWWWK.',
  '...KOOOOOOOOOOOOOKKKKK..',
  '..KOOOOOOOOOOOOWWWWK....',
  '...KKKKKKKKKKKKKKKKK....',
];

// Climbing, 16x24, seen from behind, hugging the panel border like a pole. The border
// runs down the middle: front paws grip it above the head, hind paws below the body.
const climbReach = [
  '......KKKK......',
  '......KWWK......',
  '......KOOK......',
  '....K.KOOK.K....',
  '....KKKOOKKK....',
  '....KOOOOOOK....',
  '....KOODDOOK....',
  '....KOOOOOOK....',
  '....KKOOOOKK....',
  '.....KOOOOK.....',
  '....KOOOOOOK....',
  '....KODDDDOK....',
  '....KOOOOOOK....',
  '....KOOOOOOK....',
  '....KODDDDOK....',
  '....KOOOOOOK....',
  '..K.KOOOOOOK....',
  '.KOK.KOOOOK.....',
  '.KOK.KOKKOK.....',
  '..KOKKOKKOK.....',
  '...KKKWKKWK.....',
  '......KKKK......',
  '................',
  '................',
];

// Pulling up: front paws come down to the head, hind paws tuck up. Also the braking pose
// when sliding.
const climbPull = [
  '................',
  '................',
  '................',
  '....K.KKKK.K....',
  '....KKKWWKKK....',
  '....KOKOOKOK....',
  '....KOODDOOK....',
  '....KOOOOOOK....',
  '....KKOOOOKK....',
  '.....KOOOOK.....',
  '....KOOOOOOK....',
  '....KODDDDOK....',
  '....KOOOOOOK....',
  '....KOOOOOOK....',
  '..K.KODDDDOK....',
  '.KOKKOOOOOOK....',
  '.KOKKOKOOKOK....',
  '..KOKOKOOKOK....',
  '...KKKWKKWK.....',
  '......KKKK......',
  '................',
  '................',
  '................',
  '................',
];

// Eating: sat back on its haunches, front legs straight, head bent right down to the
// fish, tail along the floor behind.
const eatDown = [
  blank,
  blank,
  blank,
  blank,
  blank,
  '.........KKKKK..........',
  '.......KKOOOOOKK........',
  '......KOODOOODOOK.......',
  '.....KOODOOODOOOOK....K.',
  '....KOOODOOODOOOKPK..KPK',
  '...KOOOODOOODOOOKOOOOOOK',
  '...KOOOODOOOKOOKKOOOOOOK',
  '..KOOOOOOOOOKOOKKOKOOKOK',
  '.KKOOOOOOOOOKOOKKWOPPOWK',
  'KOOKOOOOOKWWKWWKKWWWWWWK',
  '.KKKKKKKKKKKKKKK.KKKKKK.',
];

function patch(rows: string[], changes: Record<number, string>): string[] {
  const out = rows.slice();
  for (const [i, row] of Object.entries(changes)) out[Number(i)] = row;
  return out;
}

const frames = {
  walkA: body.concat(legs.stand),
  walkB: body.concat(legs.strideOut),
  walkD: body.concat(legs.strideIn),
  leap: body.concat(legs.leap),
  crouch: [blank].concat(body, legs.stand.slice(1)),
  sit,
  sitBlink: patch(sit, { 4: '...............KODOODOK.' }),
  sitTail: patch(sit, {
    11: '.KK.......KOOOODOOWWK...',
    12: 'KOK......KOOOOOOOOKWWK..',
    13: 'KOK.....KOOOODOOOOKWWK..',
  }),
  climbReach,
  // Springing up: hind legs pushed out straight below.
  climbPush: patch(climbReach, {
    20: '...KKKOKKOK.....',
    21: '.....KOKKOK.....',
    22: '.....KWKKWK.....',
    23: '......KKKK......',
  }),
  // Holding on, tail swung out.
  climbTail: patch(climbReach, {
    15: '.K..KOOOOOOK....',
    16: 'KOK.KOOOOOOK....',
    17: 'KOK..KOOOOK.....',
  }),
  climbPull,
  eatDown, // sniffing it, eyes open
  // Munching, eyes squeezed shut.
  eatChew: patch(eatDown, { 12: '..KOOOOOOOOOKOOKKKKOOKKK' }),
  // Tugging a bite off: head up a pixel.
  eatTug: patch(eatDown, {
    7: '......KOODOOODOOKK....K.',
    8: '.....KOODOOODOOOKPK..KPK',
    9: '....KOOODOOODOOOKOOOOOOK',
    10: '...KOOOODOOODOOOKOOOOOOK',
    11: '...KOOOODOOOKOOKKKKOOKKK',
    12: '..KOOOOOOOOOKOOKKWOPPOWK',
    13: '.KKOOOOOOOOOKOOKKWWWWWWK',
    14: 'KOOKOOOOOKWWKWWK.KKKKKK.',
    15: '.KKKKKKKKKKKKKKK........',
  }),
  // Munching, tail tip flicked up off the floor.
  eatTail: patch(eatDown, {
    12: 'KKKOOOOOOOOOKOOKKKKOOKKK',
    13: 'KOKOOOOOOOOOKOOKKWOPPOWK',
  }),
  // A fish for the cats, 10x5, head to the right; the second frame flips its tail.
  fishA: ['....KKKK..', 'K..KBBBBK.', 'KKKBBBBKBK', 'K..KLLLLK.', '....KKKK..'],
  fishB: ['K...KKKK..', '.K.KBBBBK.', '..KBBBBKBK', '.K.KLLLLK.', 'K...KKKK..'],
  // Playing: sat up, a front paw raised at the ball, then swiping out and down at it.
  playUp: patch(sit, {
    8: '.............KODOWWKKKK.',
    9: '............KOODOWWWWWWK',
    10: '............KOODOOWWKKKK',
  }),
  playSwipe: patch(sit, {
    11: '..........KOOOODOOWWKKK.',
    12: '..KK.....KOOOOOOOOKWWWWK',
    13: '.KOK....KOOOODOOOOKWWKKK',
  }),
  // A ball of yarn, 10x7, its loose end trailing; the second frame is it a little turned.
  yarnA: ['...KKK....', '..KRRSK...', '.KRSSRRK..', '.KSRRSRK..', '.KRRSSRK..', '..KSRRK...', '...KKKRR..'],
  yarnB: ['...KKK....', '..KSRRK...', '.KRRSSRK..', '.KRSRRSK..', '.KSRRSRK..', '..KRRSK...', '...KKKRR..'],
  sleep1: sleep,
  sleep2: patch(sleep, {
    6: '........KKKKKKK..K...K..',
    7: '.......KOOOOOOOKKPK.KPK.',
  }),
};

// Collars, drawn over a frame while the cat trusts you enough to wear one: [x, y, C the band in the cat's own
// colour | G its tag], in the frame's pixels. Round the neck where the head meets the body;
// sitting it slants down to the throat, curled up asleep only the bit under the chin shows,
// eating it hugs the back of the lowered head, and from behind (climbing) there is no tag.
export type Dot = [number, number, string];
const collarStand: Dot[] = [[15, 7, 'C'], [16, 7, 'C'], [17, 7, 'C'], [17, 8, 'G']];
const collarSit: Dot[] = [[14, 7, 'C'], [15, 7, 'C'], [16, 8, 'C'], [17, 8, 'C'], [18, 8, 'C'], [18, 9, 'G']];
const collarSleep: Dot[] = [[16, 12, 'C'], [17, 13, 'C'], [18, 13, 'C'], [19, 13, 'C'], [20, 13, 'C'], [18, 14, 'G']];
const collarClimb: Dot[] = [[6, 8, 'C'], [7, 8, 'C'], [8, 8, 'C'], [9, 8, 'C']];
const collarEat: Dot[] = [[16, 10, 'C'], [16, 11, 'C'], [16, 12, 'C'], [16, 13, 'G']];
const lower = (dots: Dot[]): Dot[] => dots.map(([x, y, c]) => [x, y + 1, c]);

const collars: Record<string, Dot[]> = {
  walkA: collarStand,
  walkB: collarStand,
  walkD: collarStand,
  leap: collarStand,
  crouch: lower(collarStand),
  sit: collarSit,
  sitBlink: collarSit,
  sitTail: collarSit,
  playUp: collarSit,
  playSwipe: collarSit,
  sleep1: collarSleep,
  sleep2: collarSleep,
  climbReach: collarClimb,
  climbPush: collarClimb,
  climbTail: collarClimb,
  climbPull: collarClimb,
  eatDown: collarEat,
  eatChew: collarEat,
  eatTail: collarEat,
  eatTug: collarEat.map(([x, y, c]) => [x, y - 1, c]), // its head a pixel up
};

// Coats: the same art with different outline (K), fur (O), stripes (D) and chest (W).
const coats = {
  orange: {}, // the palette as is
  black: { K: '#120e10', O: '#3a3440', D: '#26222b', W: '#e9e2d6' }, // with a white chest
  brown: { O: '#8a5a3c', D: '#6b4129', W: '#e9cfb0' },
};

export interface Sprites {
  width: number;
  height: number;
  palette: Record<string, string>;
  coats: Record<string, Record<string, string>>;
  frames: Record<string, string[]>;
  collars: Record<string, Dot[]>; // by frame; a frame without one shows no collar
}

export const SP: Sprites = { width: 24, height: 16, palette, coats, frames, collars };
