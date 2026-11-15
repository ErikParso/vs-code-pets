// The sprites (see cat-sprite.ts), one of each, for coats (coats.ts) to name. The tree:
//   Basic (basic/basic.ts)
//   └─ BasicStriped (basic/striped.ts)
import { Basic } from './basic/basic';
import { BasicStriped } from './basic/striped';
import { checkSprite } from './cat-sprite';

export { CAT_FRAMES, CAT_H, CAT_W, CLIMB_H, PEEK_W, type CatFrame, type CatSprite, type Dot } from './cat-sprite';
export { PALETTE, SHARED } from './palette';
export { PROPS, type Prop } from './props';

export const basic = new Basic();
export const basicStriped = new BasicStriped();

for (const [name, sprite] of Object.entries({ basic, basicStriped })) checkSprite(name, sprite);
