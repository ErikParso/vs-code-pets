# Development

## Code layout

- `src/extension/`: the VS Code extension. It injects the cat script into VS Code's window and
  shows the 🐈‍⬛ in the status bar (compiled by `tsc` to `out/`).
- `src/world/`: the cats' world, with no DOM (checked by `tsconfig.world.json`): `World` owns the
  cats, the fish and yarn, and the layout; `Driver` moves it on each frame; `CatBrain` decides
  what a cat does next; `Cat`, `Care`, `Navigator`, `FishPond` (`fish.ts`) and `YarnPile`
  (`yarn.ts`) each own their part, the last two sharing what is thrown to the cats (`thrown.ts`:
  the throw, falling off a floor, the limit of `MAX_FISH`); `collection.ts` is your cats and their
  steps, `coats.ts` the coats they come in, `seen.ts` the coats ever had (for the collection of
  coats), `boxes.ts` what the cat boxes show. `config.ts` holds
  every tuning number. `sprites/` is the cat art, below.
- `src/browser/`: the cat script's browser side: reading VS Code's workbench, drawing, the debug
  care panel, the cat boxes (`cat-boxes.ts`: boxes from `box-art.ts` in a room from
  `room-art.ts`), the collection of coats (`collection-panel.ts`: cards from `collection-art.ts`,
  in the same room; a coat is found if it is in `pixelCat.seen`, which every poll tops up with the
  coats of the cats you have, or if a cat you have is in it), the 🐈‍⬛ menu (`fish-menu.ts`,
  buttons from `menu-art.ts`), Web Locks, and a
  tooltip anything can use (`tooltip.ts`: `show(text, x, y)`, `hide()`). Pixel art is drawn
  through `pixel-art.ts`. Bundled with `src/world` by esbuild into
  `out/pixel-cat.js` (`scripts/bundle.js`).
- `test/sim/`: the simulation tests, below.
- `test/art/`: the coat snapshots, below.

## Sprites and coats

A coat (`src/world/coats.ts`) keeps its game properties (id, name, rarity, collar, sponsor) apart
from its `look`: a sprite and a colour for each of the sprite's slots, by name.

```ts
look: look(basicStriped, { outline: '#2b1d14', fur: '#e8913a', stripes: '#c46a22', chest: '#fbe3c0' })
```

`look()` is typed by the sprite: a missing colour, or one the sprite has no slot for, does not
compile. The coats use `colors(fur, 'white chest'?)` to fill these from the `FUR` table.

The sprites are a class tree in `src/world/sprites/`, one folder per base sprite:

- `cat-sprite.ts`: what every sprite gives (`slots`, `frame(name)`, `peek(blink)` for the box
  panel, `collar(frame)`), the frame names and sizes, and `withDots`, which lays pixels over a
  parent's frame.
- `basic/basic.ts`: `Basic`, the root: a short-haired cat in one fur, no markings. Slots
  `outline` (K), `fur` (O), `chest` (W: chest and paws).
- `basic/striped.ts`: `BasicStriped extends Basic`: adds the slot `stripes` (D) and lays tabby
  stripes over `Basic`'s frames.
- `basic/spotted.ts`: `BasicSpotted extends Basic`: adds the slot `spots` (D) and lays spots
  over `Basic`'s frames (Spotted Smoke, Spotted Fawn, Bengal, Snow Bengal, Ladybug, Amanita, Dalmatian).
- `basic/patched.ts`: `BasicPatched extends Basic`: adds the slots `patch` (A) and `patch2` (E) and
  lays large patches over `Basic`'s fur with masks (`withPatches`: a mask's letter paints only fur,
  so it can be drawn roughly). The tail is always `patch` (Bicolors, Calicos, Tortoiseshell, Koi,
  Patchwork, Camo, Milkat).
- `palette.ts`: `SHARED`, the colours no coat sets (P pink, G a collar's tag, fish, yarn), and
  `PALETTE` for art in no coat (menu icons). `props.ts`: fish and yarn.
- `index.ts`: one instance of each sprite, for coats to name. Each is checked when loaded: every
  frame the right size, and every letter in its art one of its slots or shared.

Pixel art is rows of letters, one per pixel ('.' see-through). The slots map readable names to
those letters, so coats never deal in letters.

A new pattern on the same body extends its parent, adds its slots, and overrides `frame` and
`peek` with `withDots(super.frame(f), DOTS[f])`. A new body (a long-haired cat) gets its own
folder and redraws every frame. Add it to `index.ts`, name it in a coat, check it in the coat
sheet (debug mode), then record the coat snapshots.

## Rules of the game

- **Hunger:** a cat keeps when it last ate (`fedAt`), and each state is the time since then. A fish
  keeps it fed for 26 hours, so a fish at about the same time every day is always on time.
  It ignores fish for the first three hours, then will eat again; after 20
  hours it asks for food now and then with a little fish floating over its head. After 26 it
  starves, and only walks or meows for food until it eats.
- **Trust:** from 0 to 1, starting at 0.1. It grows by 0.05 when a cat eats before it starves
  and drops by 0.05 when fed late; a play adds 0.05 once a day (see Play). Hunger continues while
  VS Code is closed; trust changes only when a cat eats or plays.
- **The collection** (`collection.ts`, kept in `localStorage` as `pixelCat.cats`): your cats, at
  most `BOXES` (15). It starts as `FIRST_CATS`. Each cat is one record: a unique `id`, a
  name, a coat, its energy, its step and its `care` (hunger, trust, play, packed; the World reads
  and saves it through `Collection.care`, by id, and never into a cat that is gone). Each cat
  takes three steps, one at a time, from the button
  beside its box (`step`, the one it is at: `collar`, `friend`, `depart`):
  1. **Collar,** from 2 hearts (`COLLAR_HEARTS`): from then on it wears its collar, roaming and
     in its box, in its coat's colour. The collar's pixels for each frame come from its sprite's
     `collar(frame)` (`src/world/sprites/`); the box's are `PEEK_COLLAR`.
  2. **Friend,** at 5 hearts (`FRIEND_HEARTS`) with a box free: a new cat joins, made up there and
     then: a name not taken, a coat by rarity, energy 0.3-1.2. It starts out roaming.
  3. **Goodbye,** once it has brought its friend: its record leaves the collection, care and all;
     every window drops it at its next poll.
  The rules are `whyNot` (collection.ts): why a cat can't take its step yet, as the player is told
  (hovering its greyed-out button shows it in a tooltip), or null if it can. `takeStep` checks
  them again against what is saved, so a stale panel can't take a step twice. Goodbye is asked
  first, on a sign over the dimmed panel (`paintGoodbye`): only its Yes takes the step.
  No progress can be lost: a cat only goes once it has brought its friend, so there are always
  as many cats still to bring theirs as there were at the start, and with every box full all the
  others may go.
- **Coats** (`coats.ts`): 33, each a sprite in its own colours (see Sprites and coats), with its
  collar colour. Every coat must look unlike every other, locked or not. A coat taken out: a cat
  saved in it wears the first coat (`coatOf`), its card leaves the collection, and its id stays
  taken. A friend's coat is rolled from every coat not locked for sponsoring, each weighted
  by its rarity: common 6, uncommon 4, rare 3, epic 2, legendary 1. So a rarer coat is always
  less likely than a commoner one, and a rarity with no coats is never rolled.
- **Shine** (`world/shine.ts`): a new friend is rainbow 5% of the time, silver 10%, otherwise
  plain (`SHINE_CHANCE`); the first cats are plain. It is kept with the cat (`shine`, missing for
  none) and drawn by `browser/shine.ts`: a tint over its fur (not its outline), one colour per
  sprite pixel, from bands fixed to the screen that drift slowly, so a moving cat shimmers faster.
  It shows roaming, in its box, and on its coat's card (cat and frame). The collection keeps the
  rarest shine each coat was ever had in, with the coat in `pixelCat.seen` (`{coatId, shine?}`,
  topped up on every poll); it never gets commoner. Shines don't count towards the collection's
  total. (The coat ids saved before shines came in are not read: those collections start again.)
- **Play:** a ball of yarn lying still on a cat's floor within reach makes `play` one of the
  things it picks from (weight `PLAY_WEIGHT`); fish still come first and starving cats don't play.
  On reaching it, a cat crouches in the sleep pose for 0.7-1.2 seconds. It then bats at the ball
  for a few seconds, making it shake with each swipe, before swiping it away 100-250 px; once it
  stops it is up for play again, and one that rolls off the end of its floor is gone. Up to
  `MAX_FISH` balls are out, like fish. A play earns 0.05 trust (and a heart floats up), at most
  once every 20 hours (`playedAt`, `PLAY_REWARD_AFTER`).
- **The cat boxes** show trust as 5 hearts (half a heart is 0.1) and food as 5 fish (each about
  5 hours of the 26). A packed cat stays in its box (its window keeps its Web Lock); its hunger
  and trust go on. All of it is in the cats' records in VS Code's `localStorage`
  (`pixelCat.cats`), shared by every window.
- **More than one window:** each cat is in one window at a time (a Web Lock per cat); now and
  then it walks out and may turn up in another.

## Debug mode

Only while developing: set `DEBUG = true` in `src/extension/extension.ts` (and back to `false`
before a release). It shows the floors and walls the cats get around on, each cat's hunger and
trust, and a Cat Care panel with, for each cat, a Feeding, Playing, Trust and Shine row: when it
last ate, when it last played for trust (happy for 20 hours after), its trust and its shine, each
with its own buttons. Shine cycles a cat through none, silver and rainbow; it is saved like a real
shine, so its coat's card keeps the rarest one for good. Alt+click the 🐈‍⬛ to make the cats
hungrier, Shift+click to make them fuller; Ctrl+click adds trust, Ctrl+Shift+click takes it away.

The 🐈‍⬛'s menu gets a fifth button, a cat sitting, that opens the coat sheet (`coat-sheet.ts`):
every coat in every frame, then in its box, drawn by the same code as the game (`cat-art.ts`,
`paintOpenBox` in `box-art.ts`). Click it to put the collars on or take them off.

## Simulation tests

The simulations run the cats' `World` (`src/world/world.ts`) the way the cat script drives it
in VS Code, without the window (`test/sim/session.js`), in a VS Code layout
(`test/sim/layouts.js`: a notebook, 1536x816, sidebar, one file and the terminal panel) on a
virtual clock. VS Code is open on weekdays and closed in between, while the cats'
hunger runs on. Feeding follows fixed rules, and every run with the same code and seeds does
exactly the same thing. A smoke test runs the real script, bundled as the extension injects it,
in a fake VS Code window for half an hour (`test/sim/smoke.js`): throwing fish from the 🐈‍⬛
menu, the second half in debug mode, the cat boxes opened from the menu, a cat packed and let
out, and the boxes closed with their X. It must not throw, must draw the cats and the fish and
save them, and a packed cat must stay in its box.

Every run fails if a cat breaks a rule of its world: it walks further than
`MAX_WALK_DISTANCE`, leaves its floor, ends up outside the window, gets stuck, eats while fed,
its hunger or trust changes without a meal or is not kept while VS Code is closed, or the
script throws.

**`npm test`: the smoke test, the exact check, then the coat snapshots (about 10 s).** Two short working days (9-13),
two seeds. Every action a cat starts, every meal and every fish is a line in an event log,
compared line by line with the reference in `test/sim/traces/`. A change meant to leave
behaviour alone (a refactor) must keep it identical; otherwise it shows the first line that
differs. After a behaviour change you meant, record a new reference with
`npm run sim:trace:record`.

**`npm run sim`: the statistics (about 5 minutes).** A work week (Mon-Fri 9-17), 10 seeds side
by side. It prints what each cat did (time sleeping, walking or climbing, moves per hour,
distances, floors, fish), how hungry it was (time fed, normal, asking, starving; meals, late
meals, hours spent asking) and its trust at the end of each day, and saves it all to
`test/sim/snapshots/v<version>.json`. Compare two snapshots to see what a change did:

```sh
npm run sim:compare                 # the two latest snapshots
npm run sim:compare -- v0.1.36 v0.1.37 --all
```

Feeders (`--feeder`): `attentive` (a fish 10 minutes after a cat starts asking, and every 10
minutes while one is), `daily` (one fish per cat at 10, 13 and 16 o'clock), `forgetful` (the
same on Monday, Wednesday and Friday only), `spammer` (a fish every 10 minutes), `none`.

`--yarn 30` also throws a ball of yarn every 30 minutes of open time (default none; the yarn
statistics are printed only with it).

Other options of `node test/sim/run.js`: `--hours 4` (one 4-hour session, about 20 s),
`--days 10 --open 8-18`, `--seeds 3`, `--serial`, `--name my-try`, `--no-snapshot`. Both tools
take `--src <copy of src/>` to try a change without touching the real files.

## Coat snapshots

`node test/art/coats.js` (part of `npm test`) draws every coat through the real drawing code and
compares every pixel's colour with `test/art/snapshots/<coat id>.json`. For each coat it covers
every cat frame as the renderer builds it, with and without its collar; its cat peeking out of a
box in the cat boxes panel, eyes open and blinking, with and without a collar; and its card in
the collection, found and unseen. Fish and yarn don't depend on the coat and are checked once,
in `_props.json`. It compares final colours, not the art's letters, so the art can be reorganised
freely as long as every cat still looks the same. A failure names the coat, the image and the
first pixel that differs. After a change to a coat's look that you meant, or after adding a coat,
record new snapshots with `npm run art:record`.
