# Roaming Pixel Cats

Three tiny pixel-art cats that live in your whole VS Code window, not in a panel. They
walk along the edges of the sidebar, editor and panels, jump between them, climb up and
slide down their sides, and nap on the status bar.

- **Jexit**, orange: sleepy.
- **Erik**, black: the everyday cat.
- **Boris**, brown: lazy, and not much of a climber.

Now and then a cat curls up to sleep next to another sleeping cat.

**Feeding:** click the 🐟 in the status bar to throw the cats a fish. It lands
near a cat, and an awake cat close by trots over and eats it. Sleeping cats ignore fish
until they wake up. Up to 10 fish can lie around at once.

**Hunger:** the cats get hungrier as you work (full to starving in about 40 minutes), and
each fish fills a cat halfway. A nearly full cat ignores fish; a hungry one asks for food
now and then: a little fish floats up over its head, like the Zs.

**Trust:** each cat's trust in you (0 to 1, starting at 0.1) grows by 0.01 with every fish it
eats, and drops by 0.01 for every 10 minutes it is left starving. It builds over weeks.
Hunger and trust only change while VS Code is open, and are remembered across reloads.

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
| Pixel Cat: Toggle Jexit / Erik / Boris | Send one cat away or bring it back |
| Pixel Cat: Toggle Debug Mode | Show the floors and walls the cats get around on, and each cat's hunger and trust. Alt+click the 🐟 to make the cats hungrier, Shift+click to make them fuller; Ctrl+click adds trust, Ctrl+Shift+click takes it away |
| Pixel Cat: Remove from VS Code | Take the cats out and restore VS Code's files |
| Pixel Cat: Let the Cat Back In | Put the cats back after removing them |

## Settings

- `pixelCat.scale`: size of one cat pixel, in screen pixels (default 2).

## Credits

All art and code are original, drawn from scratch.
