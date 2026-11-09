# Changelog

## 0.1.93

- Release build: debug mode off.

## 0.1.92

- Cat Care panel: the Playing row reads like Feeding, "Happy" or "Bored" and when the cat last
  played for trust.

## 0.1.91

- Debug mode's Cat Care panel shows each cat in three rows, Feeding (how long since its last meal),
  Playing (how long until a play earns trust) and Trust, each with its own buttons.

## 0.1.90

- A play earns a little trust too (a heart floats up), at most once a day.
- Debug mode is now a constant in the code (`DEBUG` in `extension.ts`) instead of a command.

## 0.1.89

- Tidier inside: a cat now remembers when it last ate instead of when its next meal is due;
  the cats behave the same. Hunger starts over once (every cat as if just fed).

## 0.1.88

- The yarn in the 🐈‍⬛'s menu is now a wicker basket of balls of yarn.

## 0.1.87

- Simpler drawing of the rolling ball of yarn; it looks the same.

## 0.1.86

- A ball of yarn really rolls now: it turns as it goes, its loose end going round with it, and
  stops at whatever turn it got to.

## 0.1.84

- Tidier inside: a cat keeps one note of what it is walking over for, instead of five; the cats
  behave the same.

## 0.1.83

- Tidier inside: fish and yarn share the code for what is thrown to the cats; the cats behave the
  same.

## 0.1.82

- Play: the 🐈‍⬛'s menu has balls of yarn to throw. A cat runs over and bats at one, then swipes it
  away; it rolls off and lies still for the next go, until it rolls off an edge. Up to 10 at a
  time, like the fish.

## 0.1.81

- Click the 🐈‍⬛ in the status bar for a little menu: a bucket to throw the cats a fish, and boxes
  to see all your cats.
- Every cat has its own box on a shelf, with its name, its trust in hearts and how full it is in
  fish.
- Click a cat's box to pack it away: it stops roaming until you let it out.

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
