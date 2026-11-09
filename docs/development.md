# Development

## Code layout

- `src/extension/`: the VS Code extension. It injects the cat script into VS Code's window and
  shows the 🐈‍⬛ in the status bar (compiled by `tsc` to `out/`).
- `src/world/`: the cats' world, with no DOM (checked by `tsconfig.world.json`): `World` owns the
  cats, the fish and yarn, and the layout; `Driver` moves it on each frame; `CatBrain` decides
  what a cat does next; `Cat`, `Hunger`, `Navigator`, `FishPond` (`fish.ts`) and `YarnPile`
  (`yarn.ts`) each own their part, the last two sharing what is thrown to the cats (`thrown.ts`:
  the throw, falling off a floor, the limit of `MAX_FISH`); `boxes.ts` is what
  the cat boxes show. `config.ts` holds every tuning number.
- `src/browser/`: the cat script's browser side: reading VS Code's workbench, drawing, the debug
  care panel, the cat boxes (`cat-boxes.ts`: boxes from `box-art.ts` in a room from
  `room-art.ts`), the 🐈‍⬛ menu (`fish-menu.ts`, buttons from `menu-art.ts`), Web Locks. Pixel
  art is drawn through `pixel-art.ts`. Bundled with `src/world` by esbuild into
  `out/pixel-cat.js` (`scripts/bundle.js`).
- `test/sim/`: the simulation tests, below.

## Rules of the game

- **Hunger:** a cat keeps when it last ate (`fedAt`), and each state is the time since then. A fish
  keeps it fed for 26 hours, so a fish at about the same time every day is always on time.
  It ignores fish for the first three hours, then will eat again; after 20
  hours it asks for food now and then with a little fish floating over its head. After 26 it
  starves, and only walks or meows for food until it eats.
- **Trust:** from 0 to 1, starting at 0.1. It grows by 0.03 when a cat eats before it starves
  and drops by 0.05 when fed late. Hunger continues while VS Code is closed; trust
  changes only when a cat eats.
- **Play:** a ball of yarn lying still on a cat's floor within reach makes `play` one of the
  things it picks from (weight `PLAY_WEIGHT`); fish still come first and starving cats don't play.
  One cat at a time bats at a ball for a few seconds, then swipes it away 100-250 px; once it
  stops it is up for play again, and one that rolls off the end of its floor is gone. Up to
  `MAX_FISH` balls are out, like fish. Play changes no stats.
- **The cat boxes** show trust as 5 hearts (half a heart is 0.1) and food as 5 fish (each about
  5 hours of the 26). A packed cat stays in its box (its window keeps its Web Lock); its hunger
  and trust go on. All of it is kept in VS Code's `localStorage` (`pixelCat.care`), shared by
  every window.
- **More than one window:** each cat is in one window at a time (a Web Lock per cat); now and
  then it walks out and may turn up in another.

## Debug mode

Only while developing: in an Extension Development Host (F5, from `.vscode/launch.json`), the
command **Pixel Cat: Toggle Debug Mode** shows the floors and walls the cats get around on, each
cat's hunger and trust, and a panel to adjust their last meal and trust. In an installed extension
the command is hidden and debug mode stays off. Alt+click the 🐈‍⬛ to make the
cats hungrier, Shift+click to make them fuller; Ctrl+click adds trust, Ctrl+Shift+click takes it
away.

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

**`npm test`: the smoke test, then the exact check (about 10 s).** Two short working days (9-13),
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
