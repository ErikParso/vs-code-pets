# Changelog

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
