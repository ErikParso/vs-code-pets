// Hand-drawn cat frames, 24x16 pixels, facing right.
// One character per pixel: '.' transparent, K outline, O fur, D stripe, W cream, P pink.
(function (root) {
  'use strict';

  const palette = {
    K: '#2b1d14',
    O: '#e8913a',
    D: '#c46a22',
    W: '#fbe3c0',
    P: '#f29bb0',
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

  function patch(rows, changes) {
    const out = rows.slice();
    for (const [i, row] of Object.entries(changes)) out[i] = row;
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
    sleep1: sleep,
    sleep2: patch(sleep, {
      6: '........KKKKKKK..K...K..',
      7: '.......KOOOOOOOKKPK.KPK.',
    }),
  };

  // Coats: the same art with different outline (K), fur (O), stripes (D) and chest (W).
  const coats = {
    orange: {}, // the palette as is
    black: { K: '#120e10', O: '#3a3440', D: '#26222b', W: '#e9e2d6' }, // with a white chest
    brown: { O: '#8a5a3c', D: '#6b4129', W: '#e9cfb0' },
  };

  const sprites = { width: 24, height: 16, palette, coats, frames };
  if (typeof window !== 'undefined') window.PixelCatSprites = sprites;
  else module.exports = sprites;
})();
