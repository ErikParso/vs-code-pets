# Changelog

## 0.1.113

- A cat's energy cannot be higher than 1.
- Cats are more likely to give up climbing a wall and slide back down, so they make fewer very tall climbs.
- Release build: debug mode off.

## 0.1.112

- Debug mode's Reset cats is gone.

## 0.1.111

- 15 boxes instead of 12: room for more cats (three full shelves of five).

## 0.1.110

- Saying goodbye to a cat asks first: "Say goodbye to Jexit?", Yes or No, on a sign over the
  dimmed panel. Only Yes sends it away; a click anywhere else (or closing the panel) is a no, so a
  double-click can't lose a cat.

## 0.1.109

- Shorter tooltips: "Unlocks collar at 2 hearts", "Brings a friend at 5 hearts", "Boxes are full".

## 0.1.108

- Hovering a cat's greyed-out button says why, in a tooltip that comes up almost at once: how
  many hearts it needs (and has), or that all 12 boxes are full.

## 0.1.107

- The cats a collection starts with live in the code (`FIRST_CATS`); `inject/cats.json` is gone
  and the extension no longer passes them into the page.
- Debug mode's Cat Care panel collapses to its title bar (▾ / ▸), and remembers it.

## 0.1.106

- Tidier code: every cat always has its next step (new cats start at the collar), the cat boxes
  read the collection once per update, and they redraw from everything they show. Nothing
  plays differently.

## 0.1.105

- Each cat is saved as one record, with its hunger, trust and box inside it: a cat that leaves takes
  all of it along. Your cats start afresh once more.

## 0.1.104

- Simpler collection code: each cat keeps the one step it is at, packing and the steps both go
  through the collection, and debug mode's Reset cats reloads the window. Nothing plays
  differently (saved collars and friends from 0.1.98-0.1.103 are not carried over).

## 0.1.103

- A double-click on a cat's button counts as two clicks again (a confirmation before saying
  goodbye is to come).

## 0.1.102

- A double-click on a cat's button takes only one step: bringing a friend no longer sends the cat
  away on the second click.
- Every step is checked against what is saved when it is clicked, so a panel a moment out of date
  can never take a step twice or too soon.
- Debug reset: a first cat that had left comes back too.

## 0.1.101

- Debug mode's Cat Care panel has a Reset cats button: back to Jexit, Erik and Boris, as new.

## 0.1.100

- The 20 coats are one table, each with a fixed id and its number in the list, ready for a
  collection of coats to find. Nothing looks different.

## 0.1.99

- Debug mode on, for testing the collection.

## 0.1.98

- Your cats are now a collection, up to 12, kept across windows and sessions. It starts with
  Jexit, Erik and Boris. Existing cats start afresh.
- A button beside each cat's box takes its next step: claim its collar at two hearts, bring a
  friend at five hearts (if a box is free), then leave to make room.
- Friends are new cats with a random name, energy and coat: 20 coats in three rarities (common,
  uncommon, rare), named as cat fanciers name them. Each coat has its own collar colour.

## 0.1.97

- Release build: debug mode off.

## 0.1.96

- Debug mode on, for testing collars.

## 0.1.95

- Collars are simpler: a cat wears its collar while its trust is two hearts or more, and loses
  it again if its trust drops below that.

## 0.1.94

- Collars: a cat that reaches two hearts of trust earns its own collar (Jexit blue, Erik red,
  Boris green), with a little gold tag, and keeps it even if its trust drops later. It shows on
  the roaming cat and on the cat peeking out of its box.

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
