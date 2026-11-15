// Basic, the root of the sprite tree: a short-haired cat in one fur, no markings (see
// cat-sprite.ts). Hand drawn, facing right; most frames 24x16, climbing ones 16x24.
import { CatSprite, patch, type CatFrame, type Dot } from '../cat-sprite';

// Standing body, shared by every on-four-legs frame (rows 0-12).
const body = [
  '................K....K..',
  '...............KPK..KPK.',
  '..KK...........KOOOOOOK.',
  '.KOK...........KOOOOOOK.',
  '.KOK...........KOKOOKOK.',
  '..KOK..........KWOPPOWK.',
  '...KOKKKKKKKKKKKWWWWWWK.',
  '....KOOOOOOOOOOOWWKKKK..',
  '....KOOOOOOOOOOOWWK.....',
  '....KOOOOOOOOOOOWWK.....',
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
  '.............KOOOWWK....',
  '............KOOOOWWK....',
  '............KOOOOOWWK...',
  '..........KOOOOOOOWWK...',
  '..KK.....KOOOOOOOOKWWK..',
  '.KOK....KOOOOOOOOOKWWK..',
  '.KOKKKKKOOOOOOOOOOKWWK..',
  '..KOOOOOKKKKKKKKKKKKKK..',
];

const sleep = [
  blank, blank, blank, blank, blank, blank,
  '.................K...K..',
  '........KKKKKKK.KPK.KPK.',
  '......KKOOOOOOOKKOOOOOK.',
  '.....KOOOOOOOOOKOOOOOOK.',
  '....KOOOOOOOOOOOOKOOKOK.',
  '....KOOOOOOOOOOOWOPPOWK.',
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
  '....KOOOOOOK....',
  '....KOOOOOOK....',
  '....KKOOOOKK....',
  '.....KOOOOK.....',
  '....KOOOOOOK....',
  '....KOOOOOOK....',
  '....KOOOOOOK....',
  '....KOOOOOOK....',
  '....KOOOOOOK....',
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
  '....KOOOOOOK....',
  '....KOOOOOOK....',
  '....KKOOOOKK....',
  '.....KOOOOK.....',
  '....KOOOOOOK....',
  '....KOOOOOOK....',
  '....KOOOOOOK....',
  '....KOOOOOOK....',
  '..K.KOOOOOOK....',
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
  '......KOOOOOOOOOK.......',
  '.....KOOOOOOOOOOOK....K.',
  '....KOOOOOOOOOOOKPK..KPK',
  '...KOOOOOOOOOOOOKOOOOOOK',
  '...KOOOOOOOOKOOKKOOOOOOK',
  '..KOOOOOOOOOKOOKKOKOOKOK',
  '.KKOOOOOOOOOKOOKKWOPPOWK',
  'KOOKOOOOOKWWKWWKKWWWWWWK',
  '.KKKKKKKKKKKKKKK.KKKKKK.',
];

const FRAMES: Record<CatFrame, string[]> = {
  walkA: body.concat(legs.stand),
  walkB: body.concat(legs.strideOut),
  walkD: body.concat(legs.strideIn),
  leap: body.concat(legs.leap),
  crouch: [blank].concat(body, legs.stand.slice(1)),
  sit,
  sitBlink: patch(sit, { 4: '...............KOOOOOOK.' }),
  sitTail: patch(sit, {
    11: '.KK.......KOOOOOOOWWK...',
    12: 'KOK......KOOOOOOOOKWWK..',
    13: 'KOK.....KOOOOOOOOOKWWK..',
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
    7: '......KOOOOOOOOOKK....K.',
    8: '.....KOOOOOOOOOOKPK..KPK',
    9: '....KOOOOOOOOOOOKOOOOOOK',
    10: '...KOOOOOOOOOOOOKOOOOOOK',
    11: '...KOOOOOOOOKOOKKKKOOKKK',
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
  // Playing: sat up, a front paw raised at the ball, then swiping out and down at it.
  playUp: patch(sit, {
    8: '.............KOOOWWKKKK.',
    9: '............KOOOOWWWWWWK',
    10: '............KOOOOOWWKKKK',
  }),
  playSwipe: patch(sit, {
    11: '..........KOOOOOOOWWKKK.',
    12: '..KK.....KOOOOOOOOKWWWWK',
    13: '.KOK....KOOOOOOOOOKWWKKK',
  }),
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
const collarStand: Dot[] = [[15, 7, 'C'], [16, 7, 'C'], [17, 7, 'C'], [17, 8, 'G']];
const collarSit: Dot[] = [[14, 7, 'C'], [15, 7, 'C'], [16, 8, 'C'], [17, 8, 'C'], [18, 8, 'C'], [18, 9, 'G']];
const collarSleep: Dot[] = [[16, 12, 'C'], [17, 13, 'C'], [18, 13, 'C'], [19, 13, 'C'], [20, 13, 'C'], [18, 14, 'G']];
const collarClimb: Dot[] = [[6, 8, 'C'], [7, 8, 'C'], [8, 8, 'C'], [9, 8, 'C']];
const collarEat: Dot[] = [[16, 10, 'C'], [16, 11, 'C'], [16, 12, 'C'], [16, 13, 'G']];
const lower = (dots: Dot[]): Dot[] => dots.map(([x, y, c]) => [x, y + 1, c]);

const COLLARS: Record<CatFrame, Dot[]> = {
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


// Peeking over a box's lip (box-art.ts), 16x13: ears, face, chin, and its front paws hooked over
// the edge. Blinking, its eyes are fur.
const PEEK = [
  '.KK..........KK.',
  '.KPK........KPK.',
  '.KPOKKKKKKKKOPK.',
  '.KOOOOOOOOOOOOK.',
  '.KOOOOOOOOOOOOK.',
  '.KOOKKOOOOKKOOK.',
  '.KOOKKOOOOKKOOK.',
  '.KWOOOOPPOOOOWK.',
  '.KWWWWKWWKWWWWK.',
  '.KKWWWWWWWWWWKK.',
  'KWWWK......KWWWK',
  'KWKWK......KWKWK',
  '.KKK........KKK.',
];
const PEEK_BLINK = patch(PEEK, { 5: '.KOOOOOOOOOOOOK.' });

/** Basic's colours: its outline, its fur, and its chest and paws (white, or the fur's colour). */
export const BASIC_SLOTS = { outline: 'K', fur: 'O', chest: 'W' } as const;

export class Basic extends CatSprite {
  readonly slots = BASIC_SLOTS;

  frame(frame: CatFrame): readonly string[] {
    return FRAMES[frame];
  }

  peek(blink: boolean): readonly string[] {
    return blink ? PEEK_BLINK : PEEK;
  }

  collar(frame: CatFrame): readonly Dot[] {
    return COLLARS[frame];
  }
}
