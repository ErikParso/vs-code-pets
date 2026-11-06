# Roaming Pixel Cats

Three tiny pixel-art cats that live in your whole VS Code window, not in a panel. They
walk along the edges of the sidebar, editor and panels, jump between them, climb up and
slide down their sides, and nap wherever they are.

- **Jexit**, orange: sleepy.
- **Erik**, black: the everyday cat.
- **Boris**, brown: lazy, and not much of a climber.

Now and then a cat curls up to sleep next to another sleeping cat. Hearts are shown when a cat gains trust after being fed on time.

**More than one window:** each cat is in only one VS Code window at a time. Now and then a
cat walks out of its window, and may turn up in another one (or come back). When a window
closes, its cats move to another open window.

**The 🐈‍⬛ menu:** click the 🐈‍⬛ in the status bar for a little menu with two buttons: a fish, to
feed the cats, and a box, to see them all.

**Feeding:** choose the fish in the 🐈‍⬛ menu to throw the cats a fish. It lands
on a cat's floor, and an awake cat on that floor trots over and eats it. Sleeping cats ignore fish
until they wake up. Up to 10 fish can lie around at once.

**Hunger:** each fish keeps a cat fed for 26 hours, so a fish at about the same time every
day is always on time. It ignores fish for the first three
hours, then will eat again; in its final six hours it asks for food now and then with a
little fish floating over its head, like the Zs. Once starving, it only walks or meows for
food until it eats.

**Trust:** each cat's trust in you (0 to 1, starting at 0.1) grows by 0.03 when it eats
before its meal deadline, and drops by 0.05 when fed late. Hunger continues while VS Code
is closed; trust changes only when a cat eats. Both are remembered across reloads.

**Your cats:** choose the box in the 🐈‍⬛ menu to see every cat in its own cardboard box, with
its name on a sticker, wherever it is roaming. Under each box, its trust is shown as 5 hearts
(each half a heart is 0.1 trust) and how full it is as 5 fish (each about 5 hours of its 26).
A starving cat's last fish flashes red. After them come 12 closed, empty boxes, for cats still to come.
Every window shows the same. Esc or a click outside closes it.

**Packing:** click a cat's box to shut it in. A packed cat doesn't roam: it goes into its box
from whatever window it is in, and its eyes look out through the slot. Click the box again to
let it out. Its hunger and trust carry on while it is packed, so don't forget to feed it.

## ⚠️ This extension modifies VS Code's files

VS Code doesn't let extensions draw outside their own panels. To let the cats roam the
whole window, Pixel Cat adds one `<script>` tag to VS Code's `workbench.html` and puts its
script file next to it. **It asks before it changes anything**, and nothing is changed if
you say no.

Good to know:

- **VS Code will say its installation "appears to be corrupt".** That warning is about this
  change. You can dismiss it ("Don't show again"). VS Code may also show `[Unsupported]`
  in the title bar.
- **To undo it,** run **Pixel Cat: Remove from VS Code** and reload. Uninstalling the
  extension also restores the files.
- **VS Code updates** replace the patched files; Pixel Cat puts the cats back after an
  update and reloads the window once.
- **It needs write access to VS Code's install folder.** The default per-user install on
  Windows works. If VS Code is installed for all users (for example under Program Files),
  run it once as administrator. Read-only installs (such as some Linux packages) can't be
  patched.
- If your company manages VS Code, check with them first.

## Commands

| Command | What it does |
|---|---|
| Pixel Cat: Hide / Show | Hide or show the cats |
| Pixel Cat: Toggle Debug Mode | Show the floors and walls the cats get around on, each cat's hunger and trust, and a panel with controls to adjust meal deadlines and trust. Alt+click the 🐈‍⬛ to make the cats hungrier, Shift+click to make them fuller; Ctrl+click adds trust, Ctrl+Shift+click takes it away |
| Pixel Cat: Remove from VS Code | Take the cats out and restore VS Code's files |
| Pixel Cat: Let the Cat Back In | Put the cats back after removing them |

## Settings

- `pixelCat.scale`: size of one cat pixel, in screen pixels (default 2).

## Development: code layout

- `src/extension/`: the VS Code extension. It injects the cat script into VS Code's window and
  shows the 🐈‍⬛ in the status bar (compiled by `tsc` to `out/`).
- `src/world/`: the cats' world, with no DOM (checked by `tsconfig.world.json`): `World` owns the
  cats, the fish and the layout; `Driver` moves it on each frame; `CatBrain` decides what a cat
  does next; `Cat`, `Hunger`, `FishPond` and `Navigator` each own their part. `config.ts` holds
  every tuning number.
- `src/browser/`: the cat script's browser side: reading VS Code's workbench, drawing, the care
  panel, the cat boxes (`cat-boxes.ts`, drawn by `box-art.ts` from `world/boxes.ts`), Web Locks. Bundled with `src/world` by esbuild into `out/pixel-cat.js`
  (`scripts/bundle.js`).
- `test/sim/`: the simulation tests, below.

## Development: simulation tests

The simulations run the cats' `World` (`src/world/world.ts`) the way the cat script drives it
in VS Code, without the window (`test/sim/session.js`), in a VS Code layout
(`test/sim/layouts.js`: a notebook, 1536x816, sidebar, one file and the terminal panel) on a
virtual clock. VS Code is open on weekdays and closed in between, while the cats' meal
deadlines run on. Feeding follows fixed rules, and every run with the same code and seeds does
exactly the same thing. A smoke test runs the real script, bundled as the extension injects it,
in a fake VS Code window for half an hour, throwing fish from the 🐈‍⬛ menu, the second half in
debug mode, with the cat boxes opened from the menu for a while and a cat packed and let out
(`test/sim/smoke.js`): it must not throw, must draw the cats and the fish, must save them, the
box must open the boxes with every cat in them, and a packed cat must stay in its box.

Every run fails if a cat breaks a rule of its world: it walks further than
`MAX_WALK_DISTANCE`, leaves its floor, ends up outside the window, gets stuck, eats while fed,
its hunger or trust changes without a meal or is not kept while VS Code is closed, or the
script throws.

**`npm test`: the smoke test, then the exact check (about 10 s).** Two short working days (9-13), two seeds. Every
action a cat starts, every meal and every fish is a line in an event log, compared line by
line with the reference in `test/sim/traces/`. A change meant to leave behaviour alone (a
refactor) must keep it identical; otherwise it shows the first line that differs. After a
behaviour change you meant, record a new reference with `npm run sim:trace:record`.

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

Other options of `node test/sim/run.js`: `--hours 4` (one 4-hour session, about 20 s),
`--days 10 --open 8-18`, `--seeds 3`, `--serial`, `--name my-try`, `--no-snapshot`. Both tools
take `--src <copy of src/>` to try a change without touching the real files.

## Credits

All art and code are original, drawn from scratch.
