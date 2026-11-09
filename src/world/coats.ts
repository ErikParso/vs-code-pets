// The coats a cat can have: the full set, one entry each, as the collection of coats to find will
// list them. Each has a fixed `id` (what a cat's coat is saved as: never change or reuse one), its
// number `no` in that list, its name (as cat fanciers name it) and how rare it is for a friend to
// turn up in it. A coat is the same art (sprites.ts) in its own colours: outline (K), fur (O),
// stripes (D; the fur's colour when it has none) and chest and paws (W; the fur's colour when it
// has no white). Each has a collar colour that stands out on it.
import type { Random } from './random';

export type Rarity = 'common' | 'uncommon' | 'rare';

export interface Coat {
  no: number; // its place in the list of coats, from 1
  id: string; // fixed for good: saved with every cat in it
  name: string;
  rarity: Rarity;
  palette: Record<'K' | 'O' | 'D' | 'W', string>;
  collar: string; // the collar a cat in it wears, unless the cat has its own
}

const COLLAR = { blue: '#3b6fd6', green: '#3fae5a', red: '#e0413a', purple: '#8e5bd6', teal: '#2fb8b0' };

// The fur colours, each with its outline, stripes and white.
const FUR = {
  red: { K: '#2b1d14', O: '#e8913a', D: '#c46a22', W: '#fbe3c0' },
  brown: { K: '#2b1d14', O: '#8a5a3c', D: '#6b4129', W: '#e9cfb0' },
  blue: { K: '#1e2028', O: '#858c9a', D: '#5c6270', W: '#e6e8ee' },
  black: { K: '#120e10', O: '#3a3440', D: '#26222b', W: '#e9e2d6' }, // faint stripes, always
  cream: { K: '#3a2a1e', O: '#f0d2a0', D: '#d4a96c', W: '#fff4e0' },
  silver: { K: '#26262c', O: '#c8ccd4', D: '#6e737e', W: '#f2f4f7' },
  white: { K: '#4a4550', O: '#f4f1ec', D: '#f4f1ec', W: '#f4f1ec' },
  chocolate: { K: '#24150e', O: '#5e3a26', D: '#452818', W: '#eedcc8' },
  lilac: { K: '#3a3038', O: '#c4a8b6', D: '#a38896', W: '#f6eef2' },
  cinnamon: { K: '#2b1d14', O: '#a0522d', D: '#7a3c1e', W: '#f6e2cc' },
};

interface CoatEntry {
  no: number;
  id: string;
  name: string;
  rarity: Rarity;
  fur: keyof typeof FUR;
  stripes: boolean;
  white: boolean;
  collar: keyof typeof COLLAR;
}

// prettier-ignore
const ENTRIES: readonly CoatEntry[] = [
  { no: 1,  id: 'red-tabby-and-white',   name: 'Red Tabby and White',   rarity: 'common',   fur: 'red',       stripes: true,  white: true,  collar: 'blue' },
  { no: 2,  id: 'red-tabby',             name: 'Red Tabby',             rarity: 'common',   fur: 'red',       stripes: true,  white: false, collar: 'blue' },
  { no: 3,  id: 'brown-tabby-and-white', name: 'Brown Tabby and White', rarity: 'common',   fur: 'brown',     stripes: true,  white: true,  collar: 'green' },
  { no: 4,  id: 'brown-tabby',           name: 'Brown Tabby',           rarity: 'common',   fur: 'brown',     stripes: true,  white: false, collar: 'green' },
  { no: 5,  id: 'blue-tabby',            name: 'Blue Tabby',            rarity: 'common',   fur: 'blue',      stripes: true,  white: false, collar: 'red' },
  { no: 6,  id: 'blue-and-white',        name: 'Blue and White',        rarity: 'common',   fur: 'blue',      stripes: false, white: true,  collar: 'red' },
  { no: 7,  id: 'tuxedo',                name: 'Tuxedo',                rarity: 'common',   fur: 'black',     stripes: true,  white: true,  collar: 'red' },
  { no: 8,  id: 'black',                 name: 'Black',                 rarity: 'common',   fur: 'black',     stripes: true,  white: false, collar: 'red' },
  { no: 9,  id: 'red-and-white',         name: 'Red and White',         rarity: 'uncommon', fur: 'red',       stripes: false, white: true,  collar: 'blue' },
  { no: 10, id: 'red',                   name: 'Red',                   rarity: 'uncommon', fur: 'red',       stripes: false, white: false, collar: 'blue' },
  { no: 11, id: 'blue',                  name: 'Blue',                  rarity: 'uncommon', fur: 'blue',      stripes: false, white: false, collar: 'red' },
  { no: 12, id: 'cream-tabby',           name: 'Cream Tabby',           rarity: 'uncommon', fur: 'cream',     stripes: true,  white: false, collar: 'purple' },
  { no: 13, id: 'cream-and-white',       name: 'Cream and White',       rarity: 'uncommon', fur: 'cream',     stripes: false, white: true,  collar: 'purple' },
  { no: 14, id: 'silver-tabby',          name: 'Silver Tabby',          rarity: 'uncommon', fur: 'silver',    stripes: true,  white: false, collar: 'purple' },
  { no: 15, id: 'white',                 name: 'White',                 rarity: 'uncommon', fur: 'white',     stripes: false, white: false, collar: 'red' },
  { no: 16, id: 'chocolate-and-white',   name: 'Chocolate and White',   rarity: 'rare',     fur: 'chocolate', stripes: false, white: true,  collar: 'teal' },
  { no: 17, id: 'chocolate',             name: 'Chocolate',             rarity: 'rare',     fur: 'chocolate', stripes: false, white: false, collar: 'teal' },
  { no: 18, id: 'lilac-tabby-and-white', name: 'Lilac Tabby and White', rarity: 'rare',     fur: 'lilac',     stripes: true,  white: true,  collar: 'teal' },
  { no: 19, id: 'lilac',                 name: 'Lilac',                 rarity: 'rare',     fur: 'lilac',     stripes: false, white: false, collar: 'teal' },
  { no: 20, id: 'cinnamon-tabby',        name: 'Cinnamon Tabby',        rarity: 'rare',     fur: 'cinnamon',  stripes: true,  white: false, collar: 'blue' },
];

export const COATS: readonly Coat[] = ENTRIES.map(({ fur, stripes, white, collar, ...e }) => {
  const f = FUR[fur];
  return { ...e, collar: COLLAR[collar], palette: { K: f.K, O: f.O, D: stripes ? f.D : f.O, W: white ? f.W : f.O } };
});

const BY_ID = new Map(COATS.map((c) => [c.id, c]));
if (BY_ID.size !== COATS.length || COATS.some((c, i) => c.no !== i + 1)) {
  throw new Error('coats.ts: every coat needs its own id, and the numbers must run 1, 2, 3, ... in order');
}

/** The coat with `id`; the first one for an id that is not one. */
export function coatOf(id: string): Coat {
  return BY_ID.get(id) ?? COATS[0];
}

// How likely a friend's coat is of each rarity; within one, every coat is as likely.
const RARITY_WEIGHTS: readonly (readonly [Rarity, number])[] = [
  ['common', 60],
  ['uncommon', 30],
  ['rare', 10],
];

/** A coat for a friend: its rarity by RARITY_WEIGHTS, then any coat of that rarity. */
export function rollCoat(random: Random): Coat {
  const rarity = random.pick(RARITY_WEIGHTS);
  return random.oneOf(COATS.filter((c) => c.rarity === rarity));
}
