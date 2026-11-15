// BasicStriped: Basic (basic.ts) with tabby stripes (D) laid over its fur: across its back, down
// its side sitting, and over its head and back from behind. Sitting, its shut eyes are stripes too.
import { withDots, type CatFrame, type Dot } from '../cat-sprite';
import { Basic, BASIC_SLOTS } from './basic';

const stripes = (...xy: [number, number][]): Dot[] => xy.map(([x, y]) => [x, y, 'D']);

const STAND = stripes([8, 7], [12, 7], [8, 8], [12, 8], [8, 9], [12, 9]);
const SIT = stripes([15, 8], [15, 9], [15, 10], [15, 11], [13, 13]);
const SLEEP = stripes([11, 8], [10, 9], [9, 10], [9, 11]);
const CLIMB = stripes([7, 6], [8, 6], [6, 11], [7, 11], [8, 11], [9, 11], [6, 14], [7, 14], [8, 14], [9, 14]);
const EAT = stripes([9, 7], [13, 7], [8, 8], [12, 8], [8, 9], [12, 9], [8, 10], [12, 10], [8, 11]);
const lower = (dots: Dot[]): Dot[] => dots.map(([x, y, c]) => [x, y + 1, c]);

const STRIPES: Record<CatFrame, Dot[]> = {
  walkA: STAND,
  walkB: STAND,
  walkD: STAND,
  leap: STAND,
  crouch: lower(STAND),
  sit: SIT,
  sitBlink: [...stripes([17, 4], [20, 4]), ...SIT], // its shut eyes
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
  eatTug: EAT,
  eatTail: EAT,
};
const PEEK_STRIPES = stripes([6, 3], [9, 3]);

export class BasicStriped extends Basic {
  override readonly slots = { ...BASIC_SLOTS, stripes: 'D' } as const;

  override frame(frame: CatFrame): readonly string[] {
    return withDots(super.frame(frame), STRIPES[frame]);
  }

  override peek(blink: boolean): readonly string[] {
    return withDots(super.peek(blink), PEEK_STRIPES);
  }
}
