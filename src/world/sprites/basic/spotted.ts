// BasicSpotted: Basic (basic.ts) with spots (D) laid over its fur, like the flecks on a toadstool's
// cap: a couple on its head and a scatter over its back, in every pose.
import { withDots, type CatFrame, type Dot } from '../cat-sprite';
import { Basic, BASIC_SLOTS } from './basic';

const spots = (...xy: [number, number][]): Dot[] => xy.map(([x, y]) => [x, y, 'D']);

const STAND = spots([17, 2], [20, 3], [9, 7], [10, 7], [6, 8], [13, 8], [8, 10], [12, 10]);
const SIT = spots([17, 2], [20, 3], [14, 9], [16, 11], [12, 12], [13, 12], [15, 14]);
const SLEEP = spots([19, 8], [21, 9], [11, 9], [7, 11], [13, 11], [10, 13]);
const CLIMB = spots([6, 6], [9, 7], [7, 10], [9, 12], [6, 13]);
const EAT = spots([10, 6], [8, 8], [13, 9], [6, 10], [10, 11], [5, 12]); // on its back: its head bobs
const HELD = spots([10, 2], [13, 3], [6, 9], [7, 12], [5, 15], [8, 17], [7, 19]);
const lower = (dots: Dot[]): Dot[] => dots.map(([x, y, c]) => [x, y + 1, c]);

const SPOTS: Record<CatFrame, Dot[]> = {
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
  eatTug: EAT,
  eatTail: EAT,
  held: HELD,
};
const PEEK_SPOTS = spots([4, 3], [8, 3], [9, 3], [12, 4]);

export class BasicSpotted extends Basic {
  override readonly slots = { ...BASIC_SLOTS, spots: 'D' } as const;

  override frame(frame: CatFrame): readonly string[] {
    return withDots(super.frame(frame), SPOTS[frame]);
  }

  override peek(blink: boolean): readonly string[] {
    return withDots(super.peek(blink), PEEK_SPOTS);
  }
}
