// BasicPatched: Basic (basic.ts) with large patches of two colours over its fur, like a calico's:
// one (A) over an ear and eye, a saddle on its back and its whole tail; the other (E) on its rump
// and a hind leg, and a little on its face from the front. Its tail is always A, so a coat can keep
// its darker colour in E and the tail never fades into a dark background.
//
// A patch is laid out as a mask over a frame (`withPatches`): a mask's letter paints only fur (O),
// so the outline, eyes, nose and chest show through it and a mask can be drawn roughly. Its rows
// start at the frame's top and may be shorter than the frame or stop early.
import type { CatFrame } from '../cat-sprite';
import { Basic, BASIC_SLOTS } from './basic';

type Mask = readonly string[];

/** `rows` with `mask` laid over its fur. */
function withPatches(rows: readonly string[], mask: Mask): string[] {
  return rows.map((row, y) =>
    [...row].map((ch, x) => (ch === 'O' && /[AE]/.test(mask[y]?.[x] ?? '') ? mask[y][x] : ch)).join(''),
  );
}

const STAND: Mask = [
  '',
  '',
  '................AAA',
  '..A.............AA',
  '..A.............A',
  '...A',
  '....A',
  '.....EEEE.AAAA',
  '.....EEEEE.AAAA',
  '.....EEE...AAA',
  '.....EE',
  '',
  '.....EE',
  '..EEEEEE', // its hind leg, wherever its stride puts it
];

const SIT: Mask = [
  '',
  '',
  '................AAA',
  '................AA',
  '................A',
  '',
  '...............A',
  '..............AA',
  '..............AAA',
  '.............AAA',
  '.............AA',
  '.A.........EE',
  '.A.......EEEE',
  '.AA.....EEEEE',
  '..A.....EEEEE',
  '...AAAAA', // its tail along the floor
];

const SLEEP: Mask = [
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '.........AAAA', // its back, risen with a breath
  '.........AAAA....AA',
  '........AAAAA...AAA',
  '.....E...AAA......A',
  '....EEE',
  '...EEEE',
  '...EEEEE',
  '..EEEEE',
];

// From behind: its arms, the left of its head, its rump and its tail.
const CLIMB: Mask = [
  '',
  '',
  '.......A',
  '.......A',
  '.......A',
  '.....AA',
  '.....AAA',
  '.....AA',
  '',
  '',
  '........EE',
  '.......EEE',
  '.......EEEE',
  '.......EEEE',
  '........EEE',
  'AAAA....EE',
  'AAAA',
  'AAAA',
  'AAAA',
  'AAAA',
];

// Head down to the bowl on its right; eatTug lifts its head a pixel.
const eat = (headTop: number): Mask => {
  const mask = [
    '',
    '',
    '',
    '',
    '',
    '',
    '.........AAA',
    '........AAAA',
    '.........AAA',
    '..........A',
    '....EEE',
    '...EEEE',
    '..EEEE',
    '.AEEEE',
    '.AA.EE',
  ];
  const head = ['AAA.EE', 'AA...E', 'A']; // its face, as it peeks out of its box
  head.forEach((h, i) => (mask[headTop + i] = mask[headTop + i].padEnd(17, '.') + h));
  return mask;
};
const EAT = eat(10);

const lower = (mask: Mask): Mask => ['', ...mask];

const PATCHES: Record<CatFrame, Mask> = {
  walkA: STAND,
  walkB: STAND,
  walkD: STAND,
  leap: STAND,
  crouch: lower(STAND),
  sit: SIT,
  sitBlink: SIT,
  sitTail: SIT,
  playUp: SIT,
  playSwipe: SIT,
  sleep1: SLEEP,
  sleep2: SLEEP,
  climbReach: CLIMB,
  climbPush: CLIMB,
  climbTail: CLIMB,
  climbPull: CLIMB,
  eatDown: EAT,
  eatChew: EAT,
  eatTug: eat(9),
  eatTail: EAT,
};

const PEEK_PATCHES: Mask = ['', '', '..AA', '..AAAA.....EE', '..AAAA....EEE', '..AA', '..AA'];

export class BasicPatched extends Basic {
  override readonly slots = { ...BASIC_SLOTS, patch: 'A', patch2: 'E' } as const;

  override frame(frame: CatFrame): readonly string[] {
    return withPatches(super.frame(frame), PATCHES[frame]);
  }

  override peek(blink: boolean): readonly string[] {
    return withPatches(super.peek(blink), PEEK_PATCHES);
  }
}
