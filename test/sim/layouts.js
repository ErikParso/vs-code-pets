// The VS Code window the cats run in, as the rectangles of the workbench parts world.ts reads.
// A notebook: a 1920x1080 screen at 125% scaling, VS Code maximized above the taskbar. The
// sidebar on the left; in the middle, a file in the editor above the terminal panel. Every
// move is possible here: the panel is low enough to jump onto from the status bar and back,
// the top edge is reached only by climbing, and the floors run out to the window edges.
'use strict';

const W = 1536;
const H = 816;
const TITLE = 35;
const ACTIVITY = 48;
const SIDEBAR_RIGHT = 298;
const STATUS_TOP = H - 22;
const PANEL_TOP = STATUS_TOP - 200;

const rect = (left, top, right, bottom) => ({ left, top, width: right - left, height: bottom - top });

const layout = {
  width: W,
  height: H,
  parts: {
    '.part.titlebar': [rect(0, 0, W, TITLE)],
    '.part.activitybar': [rect(0, TITLE, ACTIVITY, STATUS_TOP)],
    '.part.sidebar': [rect(ACTIVITY, TITLE, SIDEBAR_RIGHT, STATUS_TOP)],
    '.part.editor': [rect(SIDEBAR_RIGHT, TITLE, W, PANEL_TOP)],
    '.part.editor .editor-group-container': [rect(SIDEBAR_RIGHT, TITLE, W, PANEL_TOP)],
    '.part.panel': [rect(SIDEBAR_RIGHT, PANEL_TOP, W, STATUS_TOP)],
    '.part.statusbar': [rect(0, STATUS_TOP, W, H)],
  },
  // The extension's 🐈‍⬛, towards the right of the status bar.
  fishButton: rect(W - 260, STATUS_TOP, W - 230, H),
  // What the floors world.ts finds here are called in the reports, by height.
  floorNames: { [TITLE]: 'top', [PANEL_TOP]: 'panel', [STATUS_TOP]: 'status bar' },
};

const floorName = (y) => layout.floorNames[y] || `y=${y}`;

module.exports = { layout, floorName };
