# Changelog

## 0.1.60

Cleanup: a click anywhere on a cat's tile in the cat boxes panel (its box, hearts or fish)
packs it or lets it out, so the hit test is just row and column. The unused `isPacked` is gone.

## 0.1.59

Packing, simplest: no second list of boxed cats. Each cat has a `packed` flag; `world.cats` is the
cats out (not packed), and `checkPacked` is one loop that sets the flag from the care store,
dropping a fish a cat was eating when it goes in and walking it in when it is let out. Same
behaviour; the event log is identical.

## 0.1.58

Packing, simpler still: `roaming.ts` is back as it was. The World handles packing: when the
Driver polls (every 700 ms), cats packed from any window go into their boxes at once, and cats
let out walk in again. A packed cat stays with the window that has it (it keeps the cat's Web
Lock), so no other window gets it. The smoke test counts the cats drawn while one is packed and
after it is let out. Same behaviour otherwise; the event log is identical.

## 0.1.57

Packing, simpler: whether a cat is packed is part of its care record (`pixelCat.care`, next to
its hunger and trust) instead of a key of its own, and roaming alone handles it: the window
holding a cat checks every second whether it was packed and puts it in its box, and waits while
it is. A click takes up to a second to show in the window. No hand cursor over the boxes. Same
behaviour otherwise.

## 0.1.56

New: packing cats. Click a cat's box in the cat boxes panel to shut it in: the box closes, its
eyes glint through the slot (blinking now and then), and the cat does not roam: if it is out in
a window it goes into its box at once, and whichever window gets it next keeps it in until it is
let out. Click the box again to let it out. Its hunger and trust go on as ever while it is packed.
Which cats are packed is kept in VS Code's localStorage (`pixelCat.packed`), shared by every
window. The smoke test packs a cat from the panel and lets it out again. No change for cats that
are not packed: the event log is identical.

## 0.1.55

The closed boxes' slot is at the same height as the open boxes' one.

## 0.1.54

The empty boxes are closed: the closed box from Erik's reference, pixel for pixel (20x17, top
shut, "!" shine), made bigger the same way as the open one, standing on the same line, with the
slot cut in its front.

## 0.1.53

The cat boxes' slot is lower, on the plain front just under the lip's shadow. After the cats'
boxes come 12 empty ones (`SPARE_BOXES`), for cats still to come: the box and its slot only, no
cat, sticker, hearts or fish.

## 0.1.52

The cat box is a bit bigger (42x24: its plain middle column and a plain row of the front
repeated, so it is still the reference drawing), and the sticker and its name smaller: the name
is in the 5x7 font drawn at half a box pixel (in whole screen pixels, so it stays crisp), up to 8
characters, on a slip of paper placed anywhere on the front, a half pixel crooked.

## 0.1.51

The cat box is now Erik's reference drawing, pixel for pixel and colour for colour (28x20: flaps
folded out, back edge, dark inside, lit lip, the lip's shadow, the crease on the left and the
"!" shine), widened by 6 repeats of its plain middle column so a name fits on the front. The slot
is a 12x2 cut in the lip's shadow. The sticker is a plain slip of paper just big enough for the
name (3x5 font, up to 5 characters), a pixel crooked from a step somewhere along it.

## 0.1.50

The cat boxes are redrawn after a reference open box: a 36x22 body (a cat's size) under a lit
lip, flaps folded up and out, the dark inside behind the cat, the lip's shadow, a glint and a
"!" shine. One long slot is cut in the front at the cat's eye height (for a closed box's cat to
look out of, later). The sticker is just big enough for the name, in a new 3x5 pixel font (up to
7 characters), still off centre and a pixel crooked, with the name printed straight.

## 0.1.49

The cat boxes look better: the boxes are about square (64x52), with a fold line under the rim, a
few scuffs and a row of three breathing holes. The name sticker is slapped on by hand: off
centre and a pixel crooked, each box its own way (always the same for the same cat), its
letters stepping whole so they stay readable. Each heart now sits over its fish.

## 0.1.48

New: the cat boxes. A 📦 next to the 🐟 in the status bar opens a pixel-art panel in the middle
of the window: every cat in its own cardboard box, peeking over the rim and blinking now and
then, its name on a sticker (a 5x7 pixel font, up to 8 characters). Under each box: trust as 5
hearts, filling in halves (0.1 trust each), and food as 5 fish, a fish for each fifth of the 26
hours left; a starving cat's last fish flashes red. It shows every cat wherever it is roaming,
read from the care store all windows share, and keeps up with meals in other windows. Esc, a
click outside or the 📦 closes it. It lays out any number of cats. No change for the cats: the
event log is identical.

## 0.1.47

Cleanup: the sources are in `src/world` (no DOM, enforced by `tsconfig.world.json`), `src/browser`
and `src/extension`. A shared `Driver` moves the world on in VS Code and in the tests alike, so the
tests cannot drift from how the script runs. In the tests, a cat that walks out comes back after
the same frame, as in VS Code (the old fake window took one frame longer): the event log was
recorded again; across 30 seeds no statistic changes by more than 5%. Stale snapshots removed.
No change for the cats in VS Code.

## 0.1.46

Refactor: the browser side is split by job: `Renderer` (canvas, sprites, drawing), `workbench`
(reading VS Code's parts, the 🐟 and its clicks), `CarePanel` (debug mode's panel) and `roam`
(Web Locks); `app.ts` only wires them to the World. No change for the cats: the event log is
identical, and the smoke test draws exactly the same. The smoke test now spends its second half
in debug mode.

## 0.1.45

Tests: the simulations drive the `World` directly (`test/sim/session.js`) instead of running the
script in a fake window with a probe spliced in, about 5x faster: `npm test` takes about 10 s,
`npm run sim` about a minute. A smoke test (`test/sim/smoke.js`) runs the real script in a fake
window for half an hour. The event log and all statistics are identical. In the script, the
workbench parts list moved to `layout.ts`, and the care store is built by `storageCareStore`.

## 0.1.44

Refactor: the cats' world is a `World` class with no DOM (`src/inject/world.ts`): it owns the cats,
the fish, the layout and the emotions, carries out moves and moves everything on each frame
(`step`), and offers a read-only `view()`. What a cat does next is decided by a `CatBrain`
(`brain.ts`). The browser side (reading the workbench, drawing, the care panel, Web Locks) is
`app.ts`. No change for the cats: the event log is identical.

## 0.1.43

Refactor: a cat is a `Cat` (`src/inject/cat.ts`) whose activity is one of sit, sleep, eat, walk,
crouch, air, wall hop or slide, each carrying only its own data (a walk its target, a jump its
flight, a climb its wall). The cat script type-checks with no implicit `any`. No change for the
cats: the event log is identical.

## 0.1.42

Refactor: getting around belongs to a `Navigator` (`src/inject/navigator.ts`): where on a floor a
cat may stand, which floors and walls it can reach, where it walks in, the floor below it,
where it lands at the top of a wall. Moves are a typed `jump` or `climb`. No change for the
cats: the event log is identical.

## 0.1.41

Refactor: the thrown fish belong to a `FishPond` (`src/inject/fish.ts`): tossing, flopping,
landing, fading and leaving with their floor. Arcs through the air are in `arc.ts`, shared by
fish and cats. No change for the cats: the event log is identical.

## 0.1.40

Refactor: each cat's meal deadline and trust belong to a `Hunger` (`src/inject/hunger.ts`), the
only thing that changes them; saving them goes through a `CareStore` (`care-store.ts`, on
`localStorage`). No change for the cats: the event log is identical.

## 0.1.39

Refactor: every random choice goes through `Random` (`src/inject/random.ts`) and the time
through `Clock` (`src/inject/clock.ts`), so tests can drive them; in VS Code they still use
`Math.random` and `Date.now`. No change for the cats: the event log is identical.

## 0.1.38

Refactor: the tuning constants (movement, fish, hunger, trust) moved to `src/inject/config.ts`,
and reading floors and walls from the workbench parts to `src/inject/layout.ts` as pure
geometry. No change for the cats: the event log is identical.

## 0.1.37

The cat script is TypeScript now (`src/inject`), bundled by esbuild into `out/pixel-cat.js`,
which the extension injects. No change for the cats: the simulation event log is identical
line for line. The tests bundle the same sources (`--src` replaces `--inject`).

## 0.1.36

Each fish keeps a cat fed for 26 hours instead of 24, so feeding at about the same time every
day is never late. Simulated over a work week with an attentive feeder: late meals 48-67% ->
0%, trust 0.10 -> 0.22 instead of falling. Cats saved before keep their current deadline
until their next meal.

Simulation tests: a work week by default (VS Code open Mon-Fri 9-17, closed in between), fixed
feeding rules (`--feeder attentive|daily|forgetful|spammer|none`), hunger and trust statistics
and invariants, seeds run in parallel.

## 0.1.35

The simulation probe moved out of `world.js` into `test/sim/probe.js`; the tests splice it in.
No change for the cats.

## 0.1.34

One limit for jumping to another floor, `MAX_JUMP` (230 px), up, down and across, in place of
`MAX_RISE` (170), `MAX_DROP` (200) and `MAX_GAP` (220). Cats now jump back up onto a terminal
panel of up to 230 px. The simulation runs in a notebook-sized window (1536x816) where every
move happens.

## 0.1.33

Simulation tests: `npm test` runs the cats for 4 simulated hours (3 seeds) in a standard
1920x1080 layout, checks they keep to the rules of their world, prints their statistics and
saves a snapshot; `npm run sim:compare` shows what changed between two snapshots. `world.js`
gets a read-only probe for this, switched off in VS Code.

## 0.1.32

Sleeping and snuggling share one weight (`8/e + 5`). A cat going to sleep curls up next to a
cat sleeping on its floor within `MAX_WALK_DISTANCE` (250 px), or else sleeps where it is.

## 0.1.31

A cat only leaves the window when it is within `MAX_WALK_DISTANCE` (250 px) of the edge, so it
stays in a window longer.

## 0.1.30

An arriving cat walks in at most `MAX_WALK_DISTANCE` (250 px) from the window edge, instead of
to anywhere on the bottom floor.

## 0.1.29

A cat walks to a wall to climb it from up to `MAX_WALK_DISTANCE` (250 px) away, up from 220 px.

## 0.1.28

A cat only goes for a fish on its floor within `MAX_WALK_DISTANCE` (250 px); further away, it
ignores it until it wanders closer.

## 0.1.27

The furthest a cat strolls in one walk is now a single setting, `MAX_WALK_DISTANCE` (250 px).

## 0.1.26

A cat only curls up next to a sleeping cat on its floor within 600 px, and picks the
nearest one.

## 0.1.25

A heart floats up when a cat curls up next to another sleeping cat.

## 0.1.24

Cats only go for fish on their own floor (no more jumping or climbing to reach one).

## 0.1.23

One trait per cat: energy. The more a cat has, the more it walks, trots and jumps, and the
less often and less long it naps (replaces the separate sleep and nap settings).

## 0.1.22

No favourite places: cats are as likely to nap on any floor (the status bar is no longer
their bed), and nap a little less overall.

## 0.1.21

Simpler snuggling: a cat may curl up next to any sleeping cat on its floor, with no pairs
or checks, so now and then a third piles on.

## 0.1.20

Cats no longer have favourites: any cat may curl up next to another sleeping cat, only in
pairs (a third one never piles on), and never when the spot would be off the end of the
floor.

## 0.1.19

Trust: each cat has a trust in you from 0 to 1 (starting at 0.1). Every fish it eats adds
0.01; every 10 minutes it spends starving takes 0.01 off. Only changes while VS Code is
open, and is remembered across reloads. Nothing depends on it yet. In debug mode a pink bar
under the hunger bar shows it, and Ctrl+click / Ctrl+Shift+click on the 🐟 adds / takes
away trust.

## 0.1.18

The cat icons are gone from the status bar; only the 🐟 is left. Hide and show the cats
with the Pixel Cat commands.

## 0.1.17

A hungry cat asks for food with a little fish floating up over its head and fading away,
like the Zs and hearts, instead of a speech bubble.

## 0.1.16

Hunger: cats get hungrier over time (full to starving in about 40 minutes) and each fish
fills a cat halfway. At 0.2 or below a cat ignores fish; above 0.7 it asks for food now and
then with a fish in a thought bubble. Remembered across reloads. In debug mode a bar under
each cat shows its hunger, and Alt/Shift+click on the 🐟 makes the cats hungrier/fuller.

## 0.1.15

Random fish flops: each comes after its own wait (1-5 s) and has its own height, length and
quickness, instead of the same hop every 3.5 s.

## 0.1.14

Shorter fish flops: each one carries the fish about 7 px along the floor instead of 16.

## 0.1.13

Fish flop along the floor: each flop carries them a little way, mostly the same way as the
last. One that flops off the end of its floor tumbles away out of reach.

## 0.1.12

Thrown fish land well off to one side of the cat (100-350 px away) instead of nearly on top
of it, so it has to go and get them.

## 0.1.11

Fix: with several fish close together a cat could trot back and forth between them for ever
instead of eating. It now sticks with the fish it picked.

## 0.1.10

Eating: the cat sits back on its haunches with its head down at the fish, sniffs it, then
munches with its eyes squeezed shut, tugging off a bite at a time; the fish goes from the
cat's end.

## 0.1.9

Feeding: click the 🐟 next to the cats in the status bar to throw them a fish. An awake cat
close by drops what it is doing and sprints over to eat it. The fish is tossed high, tumbling, bounces once as it lands, and flops about
until eaten.

## 0.1.5

Cats sometimes think better of a climb and slide back down to where they started. Lazy
Boris gives up most often.

## 0.1.4

A nicer finish to a climb: once another leap would take its paws past the ledge, the cat
jumps up onto it instead.

## 0.1.1

Livelier climbing: the cats gather themselves before each leap up a wall, push off with
their hind legs, and swish their tails while holding on.

## 0.1.0

First public release: Jexit, Erik and Boris roam the whole VS Code window. Pixel Cat asks
before modifying VS Code's files, and restores them when removed or uninstalled.
