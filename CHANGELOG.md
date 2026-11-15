# Changelog

## 0.1.129

- A new epic coat: **Dalmatian**, white with black spots.

## 0.1.128

- A friend's coat is rolled from all coats, each weighted by its rarity (common 6, uncommon 4,
  rare 3, epic 2, legendary 1), so a rarer coat is always less likely than a commoner one.
- A new rarity, legendary (orange card, five gems), ready for its first coat.

## 0.1.127

- A friend's coat is common 60%, uncommon 27%, rare 10%, epic 3%.

## 0.1.126

- A new rarity, epic (purple card, four gems), and its first coat: **Amanita**, a rusty red cat
  with white flecks like a toadstool's cap. Friends come epic about 3% of the time.
- A new sprite, `BasicSpotted`: Basic with spots.

## 0.1.125

- `BasicStriped` lays its stripe pixels over `Basic`'s frames again (as in 0.1.123), instead of
  a full copy of the cat. Every coat looks as before.

## 0.1.124

- `BasicStriped` is drawn in full (the cat with its stripes) instead of laying stripe pixels over
  `Basic` by coordinates. Every coat looks as before.

## 0.1.123

- A coat keeps its look apart: `look(sprite, colors)`, with colours named by the sprite's slots
  (`outline`, `fur`, `stripes`, `chest`) and checked by TypeScript. Every coat looks as before.

## 0.1.122

- Cat art is now a tree of sprite classes (`src/world/sprites/`): `Basic`, and `BasicStriped`
  extending it with stripes. Each coat names its sprite. Every coat looks exactly as before.

## 0.1.121

- Debug mode: the coat sheet is plain now: a row of frames per coat; click it to toggle collars.

## 0.1.120

- Debug mode: a coat sheet, opened from a new button in the 🐈‍⬛ menu, shows every coat in every
  frame, with the collars on or off.
- Coat snapshot tests (`test/art/`) check every coat in every frame, pixel for pixel.

## 0.1.119

- Coats in the collection can now be sponsored: each coat links to a donation page.
- The "White" coat is now called "Snow White".

## 0.1.81 - 0.1.118

- The 🐈‍⬛ status-bar menu now lets you feed cats, throw balls of yarn, manage their boxes, and open
  the coat collection.
- Cats can play with yarn: they run to a ball, stalk it, bat it, then swipe it away to roll along
  the workbench. A play can earn a little trust once a day.
- Your cats are a persistent collection shared across windows and sessions. Pack cats into their
  boxes, earn collars at two hearts, and at five hearts let a cat bring a randomly named friend
  with one of 20 coats across common, uncommon, and rare rarities.
- The coat collection records every coat you have discovered, even after its cat leaves. There are
  now 15 boxes for your growing family.
- Collection actions now explain unavailable steps and safely confirm saying goodbye to a cat.
- Cats have more polished rolling-yarn, collar, collection, and popup UI art; climbing is less
  extreme, and a cat's energy is capped at 1.
- Internal reliability, persistence, test coverage, and layout code have been improved throughout.

## 0.1.33 - 0.1.47

- A fish keeps a cat fed for a whole day and a bit, so feeding at about the same time every day
  is never late.
- Cats jump back up onto taller panels.
- Rebuilt inside (TypeScript, tests); the cats behave the same.

## 0.1.16 - 0.1.32

- Hunger: cats get hungry over time and ask for food with a little fish over their heads.
- Trust: cats fed on time trust you more; a heart floats up when it grows.
- Cats curl up to sleep next to a sleeping friend, anywhere, not only on the status bar.
- Each cat has its own energy: the livelier, the more it walks, trots and jumps.
- Cats stroll shorter distances and stay in a window longer.

## 0.1.9 - 0.1.15

- Feeding: throw the cats a fish. It tumbles, lands, and flops about until a cat comes over,
  sniffs it and munches it a bite at a time.

## 0.1.1 - 0.1.5

- Livelier climbing: the cats gather themselves before each leap, swish their tails while
  holding on, jump up onto the ledge at the top, and now and then think better of it and slide
  back down.

## 0.1.0

- First release: Jexit, Erik and Boris roam the whole VS Code window. Pixel Cat asks before
  modifying VS Code's files, and restores them when removed or uninstalled.
