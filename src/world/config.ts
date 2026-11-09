// Everything about how the cats behave that is a number: movement, fish, hunger and trust.
// Distances are in CSS pixels, times in seconds unless the name says otherwise.

// ---- moving about ----

export const GRAVITY = 1500; // px/s²
export const WALK_SPEED = 40; // px/s; now and then a cat trots at three times this
export const MAX_WALK_DISTANCE = 250; // furthest one stroll goes either way, and furthest a cat goes for a fish, to a sleeping friend, to a wall, in from the edge or out to it, px
export const MAX_JUMP = 230; // furthest it jumps to another floor: up, down or across; further it climbs or slides down a wall
export const EDGE = 3; // tolerance when matching edges, px
export const WALL_LEAP = 80; // one leap up a wall

// Up the wall: the cat gathers itself (sinking a little), springs up easing out at the top,
// then holds on a moment, swishing its tail.
export const WIND_UP = 0.12;
export const HOP_TIME = 0.35;

// ---- fish ----
//
// The fish in the 🐈‍⬛'s menu (in the status bar) throws a fish from there, landing on a cat's floor. An
// awake cat on the floor of a fish goes and eats it. Fish stay until eaten; with more than
// MAX_FISH out, the oldest fades away.

export const MAX_FISH = 10;
export const EAT_TIME = 4;
export const SNIFF = 0.6; // head down at the fish before the first bite
export const CHEW = 0.5; // one bite: head down, then a tug
export const BITES = Math.ceil((EAT_TIME - SNIFF) / CHEW);
export const FADE_TIME = 1.5;
export const FISH_GRAVITY = 1000; // floatier than the cats

// ---- yarn ----
//
// The yarn in the 🐈‍⬛'s menu throws a ball of yarn, the same way as a fish. Play is one of the
// things a cat picks from (see CatBrain.decide) when a ball lies still on its floor within
// MAX_WALK_DISTANCE: it walks over and bats at it, then swipes it away. The ball rolls a little
// and stops, and is up for play again; one that rolls off the end of its floor is gone. With
// more than MAX_FISH balls out, the oldest fades away.

export const PLAY_WEIGHT = 40; // more than sit 22 and walk 32: a ball does not lie still for long
export const PLAY_TIME = [3, 6]; // s of batting at it
export const ROLL_DISTANCE = [100, 250]; // px the swipe at the end sends it
export const ROLL_FRICTION = 150; // px/s² it slows down by

// ---- hunger and trust ----
//
// Each fish gives a cat 26 hours before its meal deadline: a day plus some slack, so feeding at
// about the same time every day is never late. For the first three hours it ignores fish; in
// the final six it asks for one now and then.

export const HOUR = 60 * 60 * 1000; // ms
export const NEXT_MEAL_AFTER = 26 * HOUR;
export const EAT_AFTER = 3 * HOUR;
export const ASK_BEFORE = 6 * HOUR;
export const TRUST_START = 0.1;
export const TRUST_ON_TIME = 0.03;
export const TRUST_LATE = 0.05;
