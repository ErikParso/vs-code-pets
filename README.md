# Roaming Pixel Cats

Tiny pixel-art cats that live in your whole VS Code window, not in a panel. They walk along the
edges of the sidebar, editor and panels, jump between them, climb up and slide down, and nap
wherever they like.

Meet **Jexit** (orange, sleepy), **Erik** (black, the everyday cat) and **Boris** (brown, lazy).

## Looking after them

Click the 🐈‍⬛ in the status bar:

- **The bucket** throws a fish. Hungry cats ask for one with a little fish over their heads. Feed
  them about once a day, and they'll trust you more.
- **The yarn** throws a ball of yarn. The cats run over to bat at it, then swipe it away, until it
  rolls off an edge.
- **The boxes** show all your cats, their trust in hearts and how full they are in fish. Click a
  cat's box to pack it away: it stops roaming until you let it out (it still gets hungry).

With more than one VS Code window open, the cats wander between them.

## ⚠️ This extension modifies VS Code's files

VS Code doesn't let extensions draw outside their own panels, so Pixel Cat adds one `<script>`
tag to VS Code's `workbench.html`. **It asks first**, and changes nothing if you say no (it asks
again the next time VS Code starts).

- VS Code will then say its installation "appears to be corrupt". That's this change; you can
  dismiss it ("Don't show again").
- **To undo it,** uninstall the extension: that restores VS Code's files.
- After a VS Code update, Pixel Cat puts the cats back and reloads the window once.
- It needs write access to VS Code's install folder. If VS Code is installed for all users, run
  it once as administrator. Read-only installs (such as some Linux packages) can't be patched.

Developing Pixel Cat: see [docs/development.md](docs/development.md).

All art and code are original, drawn from scratch.

Like the cats? [Sponsor their keeper](https://github.com/sponsors/ErikParso) 💖
