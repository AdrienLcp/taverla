# Stage 26 — The slate names its items and marks them as they close

Two notes from the first look at [25](25-slate.md), both from the host who asked
for it.

## Goal

1. **Labels.** An item is not always a number. A tasting may use coloured
   stickers, letters, glass names. The host can give every item a short label —
   free text, emoji included (`🔴`, `B`, `Verre 3`) — and every screen shows the
   label where it shows the number today. Default stays `1..N`. Labels are
   **public** (players need them to know what they are answering), so unlike the
   key they may be set in the lobby and travel in the settings; they must stay
   distinct from each other, and short enough for a tile.
2. **Marking an item before the sheet is done.** Everyone has tasted cup 1 while
   cup 20 is still going round; the host wants to reveal and mark cup 1 now. So
   collection moves from the sheet to the **item**: the host closes one item,
   which locks it on every sheet and puts its grouped answers on the wall, while
   every other item stays open for writing. "Collect everything" remains as a
   shortcut for the items still open. The game ends when every item is marked.

## Decisions to take in the session

- Whether the whole-sheet `correcting` phase survives, or `playing` carries
  per-item state (`open | marking | marked`) and the wall cursor lives beside it.
  The second is the likely answer: one phase, item states on the content arm.
- The roster stamp: taken per item at its closing, or kept at the first closing.
  A latecomer should still be owed every item that is open when they arrive.
- The anti-leak invariants of 25 hold per item: a player frame carries no other
  player's answer for an item that is still open, and the host arm carries no
  answer for an open item.
- Label limits (length, uniqueness after normalisation) and where they are
  edited: the lobby, and while writing for an added item.

## Out of scope

A host controlling the room from a phone while the big screen only displays —
see [27](27-host-remote.md). It is a shell change, not a slate one.

## Done when

- A room labels five items with colours, fills them, closes the second item
  early, marks it on the wall while the others keep writing, then collects the
  rest and finishes — in a muted browser, at 390 and 1440.
- `pnpm validate` green, with socket tests for per-item locking and leaks.
