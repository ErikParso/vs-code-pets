// The coats a cat can have: the full set, one entry each, as the collection of coats to find will
// list them. Each has a fixed `id` (what a cat's coat is saved as: never change or reuse one), its
// name (as cat fanciers name it), how rare it is for a friend to turn up in it, and a collar
// colour that stands out on it. And its look: the sprite it is drawn with (sprites/) and a colour
// for each of that sprite's slots, by name: { outline, fur, chest } for basic, plus stripes for
// basicStriped, spots for basicSpotted, patch and patch2 for basicPatched.
//
// Every coat must look unlike every other, locked or not. A coat taken out: a cat saved in it wears
// the first coat (coatOf), and its card leaves the collection. Its id stays taken for good.
import type { Random } from './random';
import { basic, basicPatched, basicSpotted, basicStriped, SHARED, type CatSprite } from './sprites';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

/** How a coat looks: a sprite, and a colour for each of its slots. */
export interface Look {
  sprite: CatSprite;
  colors: Readonly<Record<string, string>>; // by slot name: { fur: '#e8913a', ... }
  letters: Readonly<Record<string, string>>; // by art letter, the shared ones too: what to paint with
}

export interface Coat {
  id: string; // fixed for good: saved with every cat in it
  name: string;
  rarity: Rarity;
  sponsor?: string; // the person who sponsored this coat's addition to the collection
  lockedByDonation?: string; // public URL where this planned coat can be sponsored
  collar: string; // the collar a cat in it wears, unless the cat has its own
  look: Look;
}

/** `sprite` in `colors`: one for each of its slots (TypeScript checks they are all there). */
export function look<S extends CatSprite>(sprite: S, colors: Record<keyof S['slots'] & string, string>): Look {
  const given = colors as Record<string, string>;
  const mine: Record<string, string> = {};
  const letters: Record<string, string> = { ...SHARED };
  for (const [name, letter] of Object.entries(sprite.slots)) {
    if (!given[name]) throw new Error(`coats.ts: no colour for the sprite's ${name}`);
    mine[name] = given[name];
    letters[letter] = given[name];
  }
  return { sprite, colors: mine, letters };
}

const COLLAR = { blue: '#3b6fd6', green: '#3fae5a', red: '#e0413a', purple: '#8e5bd6', teal: '#2fb8b0' };

// The furs, each with its outline, stripes (for a sprite with them) and white.
// prettier-ignore
const FUR = {
  red:       { outline: '#2b1d14', fur: '#e8913a', stripes: '#c46a22', white: '#fbe3c0' },
  brown:     { outline: '#2b1d14', fur: '#8a5a3c', stripes: '#6b4129', white: '#e9cfb0' },
  blue:      { outline: '#1e2028', fur: '#858c9a', stripes: '#5c6270', white: '#e6e8ee' },
  black:     { outline: '#120e10', fur: '#3a3440', stripes: '#26222b', white: '#e9e2d6' }, // faint stripes, always
  cream:     { outline: '#3a2a1e', fur: '#f0d2a0', stripes: '#d4a96c', white: '#fff4e0' },
  silver:    { outline: '#26262c', fur: '#c8ccd4', stripes: '#6e737e', white: '#f2f4f7' },
  white:     { outline: '#4a4550', fur: '#f4f1ec', stripes: '#f4f1ec', white: '#f4f1ec' },
  chocolate: { outline: '#24150e', fur: '#5e3a26', stripes: '#452818', white: '#eedcc8' },
  lilac:     { outline: '#3a3038', fur: '#c4a8b6', stripes: '#a38896', white: '#f6eef2' },
  cinnamon:  { outline: '#2b1d14', fur: '#a0522d', stripes: '#7a3c1e', white: '#f6e2cc' },
};

/** A fur's colours for a sprite's slots: its chest and paws white, or in the fur. */
function colors(fur: keyof typeof FUR, chest?: 'white chest') {
  const f = FUR[fur];
  return { outline: f.outline, fur: f.fur, stripes: f.stripes, chest: chest ? f.white : f.fur };
}

interface CoatEntry {
  id: string;
  name: string;
  rarity: Rarity;
  sponsor?: string;
  lockedByDonation?: string;
  collar: keyof typeof COLLAR;
  look: Look;
}

// prettier-ignore
const ENTRIES: readonly CoatEntry[] = [
  { id: 'red-tabby-and-white',   name: 'Red Tabby and White',   rarity: 'common',   collar: 'blue',   look: look(basicStriped, colors('red', 'white chest')), sponsor: 'Jexit' },
  { id: 'red-tabby',             name: 'Red Tabby',             rarity: 'common',   collar: 'blue',   look: look(basicStriped, colors('red')) },
  { id: 'brown-tabby-and-white', name: 'Brown Tabby and White', rarity: 'common',   collar: 'green',  look: look(basicStriped, colors('brown', 'white chest')) },
  { id: 'brown-tabby',           name: 'Brown Tabby',           rarity: 'common',   collar: 'green',  look: look(basicStriped, colors('brown')) },
  { id: 'blue-and-white',        name: 'Blue and White',        rarity: 'common',   collar: 'red',    look: look(basic,        colors('blue', 'white chest')) },
  { id: 'tuxedo',                name: 'Tuxedo',                rarity: 'common',   collar: 'red',    look: look(basicStriped, colors('black', 'white chest')), sponsor: 'Erik' },
  { id: 'black',                 name: 'Black',                 rarity: 'common',   collar: 'red',    look: look(basicStriped, colors('black')) },
  { id: 'spotted-smoke',         name: 'Spotted Smoke',         rarity: 'common',   collar: 'teal',   look: look(basicSpotted, { outline: '#141418', fur: '#5e5e66', spots: '#9a9aa3', chest: '#5e5e66' }) },
  { id: 'spotted-fawn',          name: 'Spotted Fawn',          rarity: 'common',   collar: 'green',  look: look(basicSpotted, { outline: '#2e241c', fur: '#c4a98c', spots: '#7a5a40', chest: '#c4a98c' }) },
  { id: 'black-and-white-bicolor', name: 'Black and White Bicolor', rarity: 'common', collar: 'red', look: look(basicPatched, { outline: '#2a2a2e', fur: '#f4f1ec', patch: '#3a3440', patch2: '#3a3440', chest: '#f4f1ec' }) },
  { id: 'red-and-white-bicolor', name: 'Red and White Bicolor', rarity: 'common',   collar: 'blue',   look: look(basicPatched, { outline: '#2b1d14', fur: '#f4f1ec', patch: '#e8913a', patch2: '#e8913a', chest: '#f4f1ec' }) },
  { id: 'blue',                  name: 'Blue',                  rarity: 'uncommon', collar: 'red',    look: look(basic,        colors('blue')) },
  { id: 'cream-tabby',           name: 'Cream Tabby',           rarity: 'uncommon', collar: 'purple', look: look(basicStriped, colors('cream')) },
  { id: 'cream-and-white',       name: 'Cream and White',       rarity: 'uncommon', collar: 'purple', look: look(basic,        colors('cream', 'white chest')) },
  { id: 'silver-tabby',          name: 'Silver Tabby',          rarity: 'uncommon', collar: 'purple', look: look(basicStriped, colors('silver')) },
  { id: 'snow-white',            name: 'Snow White',            rarity: 'uncommon', collar: 'red',    look: look(basic,        colors('white')), lockedByDonation: 'https://buymeacoffee.com/sealhunter/e/597946' },
  { id: 'bengal',                name: 'Bengal',                rarity: 'uncommon', collar: 'blue',   look: look(basicSpotted, { outline: '#2a1a0e', fur: '#d9a44e', spots: '#4e2e14', chest: '#f3e2bd' }) },
  { id: 'snow-bengal',           name: 'Snow Bengal',           rarity: 'uncommon', collar: 'blue',   look: look(basicSpotted, { outline: '#3a2c20', fur: '#ece2cf', spots: '#a8835c', chest: '#f7f1e6' }) },
  { id: 'dilute-calico',         name: 'Dilute Calico',         rarity: 'uncommon', collar: 'purple', look: look(basicPatched, { outline: '#3a3038', fur: '#f4f1ec', patch: '#f0d2a0', patch2: '#858c9a', chest: '#f4f1ec' }) },
  { id: 'calico',                name: 'Calico',                rarity: 'uncommon', collar: 'green',  look: look(basicPatched, { outline: '#3a2e28', fur: '#f4f1ec', patch: '#e8913a', patch2: '#3a3440', chest: '#f4f1ec' }) },
  { id: 'chocolate-and-white',   name: 'Chocolate and White',   rarity: 'rare',     collar: 'teal',   look: look(basic,        colors('chocolate', 'white chest')) },
  { id: 'chocolate',             name: 'Chocolate',             rarity: 'rare',     collar: 'teal',   look: look(basic,        colors('chocolate')) },
  { id: 'lilac-tabby-and-white', name: 'Lilac Tabby and White', rarity: 'rare',     collar: 'teal',   look: look(basicStriped, colors('lilac', 'white chest')), lockedByDonation: 'https://buymeacoffee.com/sealhunter/e/597950' },
  { id: 'cinnamon-tabby',        name: 'Cinnamon Tabby',        rarity: 'rare',     collar: 'blue',   look: look(basicStriped, colors('cinnamon')) },
  { id: 'ladybug',               name: 'Ladybug',               rarity: 'rare',     collar: 'green',  look: look(basicSpotted, { outline: '#1a1210', fur: '#c2482c', spots: '#1d1513', chest: '#c2482c' }) },
  { id: 'tortoiseshell',         name: 'Tortoiseshell',         rarity: 'rare',     collar: 'teal',   look: look(basicPatched, { outline: '#120e10', fur: '#3a3440', patch: '#c4622a', patch2: '#e0b070', chest: '#3a3440' }) },
  // White with red and black, like a Sanke carp.
  { id: 'koi',                   name: 'Koi',                   rarity: 'rare',     collar: 'blue',   look: look(basicPatched, { outline: '#2a2026', fur: '#f8f5f0', patch: '#e8542a', patch2: '#1e1e24', chest: '#f8f5f0' }) },
  // A rusty red with white flecks, like a toadstool's cap.
  { id: 'amanita',               name: 'Amanita',               rarity: 'epic',     collar: 'teal',   look: look(basicSpotted, { outline: '#2a1410', fur: '#b0452e', spots: '#f2ebdf', chest: '#f2ebdf' }) },
  // White with black spots, like the dog.
  { id: 'dalmatian',             name: 'Dalmatian',             rarity: 'epic',     collar: 'red',    look: look(basicSpotted, { outline: '#2a2a2e', fur: '#f4f2ee', spots: '#26262b', chest: '#f4f2ee' }) },
  // Linen with bright patches, like a quilt.
  { id: 'patchwork',             name: 'Patchwork',             rarity: 'epic',     collar: 'green',  look: look(basicPatched, { outline: '#2b1d14', fur: '#e9d8b4', patch: '#d9506e', patch2: '#3f8fbf', chest: '#e9d8b4' }) },
  // Olive, khaki and brown, like camouflage.
  { id: 'camo',                  name: 'Camo',                  rarity: 'epic',     collar: 'red',    look: look(basicPatched, { outline: '#23261a', fur: '#6b7a45', patch: '#b5a878', patch2: '#4a3a26', chest: '#b5a878' }) },
  // Lilac with white patches, like the chocolate cow.
  { id: 'milkat',                name: 'Milkat',                rarity: 'legendary', collar: 'teal',  look: look(basicPatched, { outline: '#3a2c50', fur: '#9d86cc', patch: '#f7f4fb', patch2: '#f7f4fb', chest: '#f7f4fb' }) },
];

export const COATS: readonly Coat[] = ENTRIES.map(({ collar, ...e }) => ({ ...e, collar: COLLAR[collar] }));

const BY_ID = new Map(COATS.map((c) => [c.id, c]));
if (BY_ID.size !== COATS.length) {
  throw new Error('coats.ts: every coat needs its own id');
}

/** The coat with `id`; the first one for an id that is not one (a coat taken out). */
export function coatOf(id: string): Coat {
  return BY_ID.get(id) ?? COATS[0];
}

// How likely a friend is to come in each coat, by its rarity: every coat is rolled for directly,
// so a rarer coat is always less likely than a commoner one, however many coats each rarity has
// (and a rarity with no coats yet is simply never rolled).
const WEIGHT: Record<Rarity, number> = { common: 6, uncommon: 4, rare: 3, epic: 2, legendary: 1 };

/** A coat for a friend: any coat not locked for sponsoring, as likely as its rarity's WEIGHT. */
export function rollCoat(random: Random): Coat {
  return random.pick(COATS.filter((c) => !c.lockedByDonation).map((c) => [c, WEIGHT[c.rarity]] as const));
}
