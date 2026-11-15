// What the cats play with, in PALETTE's colours: a fish, 10x5, head to the right (the second
// frame flips its tail), and a ball of yarn, 10x7, its loose end trailing (the second frame is it
// a little turned).
export const PROPS = {
  fishA: ['....KKKK..', 'K..KBBBBK.', 'KKKBBBBKBK', 'K..KLLLLK.', '....KKKK..'],
  fishB: ['K...KKKK..', '.K.KBBBBK.', '..KBBBBKBK', '.K.KLLLLK.', 'K...KKKK..'],
  yarnA: ['...KKK....', '..KRRSK...', '.KRSSRRK..', '.KSRRSRK..', '.KRRSSRK..', '..KSRRK...', '...KKKRR..'],
  yarnB: ['...KKK....', '..KSRRK...', '.KRRSSRK..', '.KRSRRSK..', '.KSRRSRK..', '..KRRSK...', '...KKKRR..'],
} as const;
export type Prop = keyof typeof PROPS;
