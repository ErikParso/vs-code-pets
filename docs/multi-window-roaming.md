# Multi-window roaming

## Problem

Each cat is owned by one VS Code renderer at a time through a browser Web Lock. A cat walks out of its current window, releases its lock, then another open window waiting for that lock can spawn it.

When a VS Code window is minimized, Chromium can stop or heavily throttle `requestAnimationFrame`. A hosted cat then stops walking before it reaches an edge, so it continues to hold its Web Lock. Other VS Code windows cannot receive that cat until the minimized window resumes or closes. This is the **hostage cat** case.

## Current behavior

- The animation loop is capped at 30 FPS.
- Cat movement and normal departures are driven by `requestAnimationFrame`.
- Lock acquisition is started by the normal 700 ms poller.
- A minimized renderer can retain a cat's lock because the cat's departure never completes.
- Closing the owner window still releases its browser locks.

## POC: release cats when animation becomes stale

A local, uncommitted proof of concept was implemented for evaluation. It records the time of the last animation callback and treats the renderer as stale after three seconds without one.

When the poller runs in a stale renderer, the POC:

1. saves each hosted cat's care;
2. removes its local cat instances;
3. resolves their lock-held visits, releasing the Web Locks;
4. clears local acquisition bookkeeping; and
5. refuses both new and already queued lock acquisitions while the renderer remains stale.

The proof of concept changes are in:

- `src/browser/app.ts`
- `src/browser/roaming.ts`
- `src/world/driver.ts`
- `src/world/world.ts`

## Limitation

This is best effort, not guaranteed. Chromium may throttle or suspend the poller as well as animation frames in a minimized renderer. If the poller is fully suspended, it cannot run the release until the renderer receives CPU time again.

## Options

| Option | Result | Trade-off |
|---|---|---|
| Keep current ownership | Minimized windows retain their cats until restored or closed. | Simple and preserves the current roaming model, but cats can be temporarily unavailable. |
| Adopt the stale-animation POC | A renderer that stops animating releases cats after the poller observes a stale timestamp. | Reduces hostage cats; best effort due to timer throttling. |
| Release on `document.hidden` | Release cats immediately when Chromium reports the document hidden. | Faster in many cases, but visibility is not identical to animation capability and can move cats unexpectedly. |
| Show the same family in every window | Remove one-cat-per-window Web Lock ownership. | Simplest behavior, but eliminates actual cross-window roaming. |
| Build custom lease ownership | Use shared storage heartbeats and expirations instead of Web Locks. | More control, but significantly more complex and less robust than browser-managed locks. |

## Recommendation

Keep the existing Web Lock roaming model unless real users report that minimized-window ownership is disruptive. If an improvement is needed, revive and test the stale-animation POC before considering custom ownership or lease protocols.
