# Changelog

## 0.1.119 - 0.1.174

- Pick a cat up, whatever it is doing (walking, climbing, mid-jump), even over a webview: press
  on it and it hangs from the mouse by its scruff, seen from the side, long and limp, legs and tail hanging; let
  go and it drops onto whatever is below. Pressing on a cat never clicks VS Code underneath it.
  Carried over a webview or out of the window, it stays in the window, and it is always dropped
  when you let go. The cursor is an open hand over a cat, and a closed one while you carry it.

- 28 coats, up from 20, in two new rarities as well: epic (purple card, four gems) and legendary
  (orange card, five gems).
  - Spotted: **Spotted Smoke** and **Spotted Fawn** (common), **Bengal** and **Snow Bengal**
    (uncommon), **Ladybug** (rare), **Amanita** (rusty red with white flecks) and **Dalmatian**
    (white with black spots) (epic).
  - Patched, with big patches of two colours: **Black and White Bicolor** and **Red and White
    Bicolor** (common), **Dilute Calico** and **Calico** (uncommon), **Tortoiseshell** and **Koi**
    (rare), **Patchwork** (epic), and **Milkat** (lilac with white patches) and **Camo**
    (legendary).
  - Coats that looked like twins of others are gone: Red, Red and White, Red Tabby, Brown Tabby,
    Blue, Blue Tabby, Chocolate and Lilac. A cat you have in one now wears Red Tabby and White.
    "White" is now called "Snow White".
- The collection of coats is 6 cards wide (was 5).
- A friend's coat is rolled from all coats, each weighted by its rarity (common 6, uncommon 4,
  rare 3, epic 2, legendary 1), so a rarer coat is always less likely than a commoner one.
- Shiny cats: a new friend may come silver (10%) or rainbow (5%), with a glint that sweeps slowly
  over its fur, faster as it moves. It shines roaming, in its box and on its coat's card, frame and
  all, and the card keeps the rarest shine you ever had in that coat. The collection of coats found
  is kept in a new shape, so it starts again from the cats you have.
- Planned coats can be sponsored: their card in the collection links to a donation page, and a
  sponsored coat's card shows a heart.
- Cats come to trust you faster: a fish on time and a play each add 0.05 (was 0.03 and 0.02); a
  late fish still takes 0.05. Fed and played with daily, a cat brings its friend in about 2 weeks.
- Debug mode: a coat sheet, opened from a new button in the 🐈‍⬛ menu, shows every coat, grouped
  by rarity, in each of its animations, playing, and in its box; click it to put the collars on
  or take them off.
- Under the hood: cat art is a tree of sprite classes (`src/world/sprites/`: `Basic`, and
  `BasicStriped`, `BasicSpotted` and `BasicPatched` laying their markings over it). A coat names
  its sprite and a colour for each of its slots, checked by TypeScript. Coat snapshot tests
  (`test/art/`) check every coat in every frame, pixel for pixel.

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
