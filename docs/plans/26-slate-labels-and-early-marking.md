# Stage 26 — The slate names its items and marks them as they close

**Done.** Both sessions landed. Read "What the build disagreed with" at the
end first.

Two notes from the first look at [25](25-slate.md), both from the host who asked
for it.

## The line to hold

Built for a chip tasting, never *about* chips. Every word on screen, every
default and every control must read right for a wine tasting, a pub quiz on
paper, *guess the price* or *who drew this* — nothing names cups, tasting or
food. Numbers stay the default label; everything else is opt-in.

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

## What the build disagreed with

Session A — served. Protocol, core, server, `slate-game.test.ts` (18 socket
tests, the six new ones each broken once on purpose), `slate.test.ts` in the
protocol, `PROTOCOL_VERSION` 17 → **18**.

**`correcting` is gone; items carry the state.** The brief's likely answer
held. Writing and marking overlap now, and a phase is the room's: so the slate
lives in `playing` from the first line to the reveal, and each item is `open`
(writable on every sheet), `closed` (locked, on the wall's side) or `marked`
(closed and passed by the wall at least once — an answer nobody validated there
is wrong). `marking` was the brief's middle name; it reads as *on the wall
now*, which is `currentItemIndex`'s job, so the middle state is `closed`.
`isRoundInPlay` loses `correcting` with nothing to replace: `playing` was
already in it.

**Closing one item is `host.closeItem`.** It locks the item, stamps it and moves
the wall to it — passing whatever the wall leaves, as `host.showItem` does.
`host.collectSheets` survives as *close everything still open*, on one stamp,
with the wall moving to the first item it closed. `host.showItem` moves only
between closed items (`wrong_phase` on an open one). `host.reveal` is refused
`wrong_phase` while any item is open; there is no separate *finish* frame,
because the reveal already is one. `host.addItem` works until the reveal, not
until the first close — an item added after every other has closed reopens the
sheet for it.

**The roster is stamped per item, at its closing.** A closed item holds the
seats held when it closed; a player is grouped, marked and paid only on items
stamped with them (`itemVerdictFor` and `sheetPoints` in
`core/slate/sheet-marking.ts`). The round's own `openedWithPlayerIds` — what the
shell's `joinedAfterStart` reads — stays `null` while an item is open, so a
latecomer gets a sheet, and becomes the union of the item stamps once none is.
A player seated mid-marking writes the open items, is refused the closed ones,
and reads `null` verdicts on them rather than wrongs.

**The anti-leak invariants hold per item.** `answerGroupsFor` returns nothing
for an open item, and the host arm's `correction` is `null` unless the item on
the wall is closed. Player frames carry the reader's own sheet only, as before.

**Labels live in `settings.game.labels` alone**, `(string | null)[]`, at most
60, edited with `host.updateSettings` in any phase — there is no label frame.
One store serves the lobby and an item added mid-sheet, and a label set for
position 12 waits there until the sheet grows to it. Limits: trimmed, 1 to 12
UTF-16 units (enough for `Glass 12` or a flag; a joined emoji spends several),
and **every position of a 60-item sheet must read differently** once folded
(NFKC, lower case, runs of spacing) — which also refuses a label that reads as
another position's number, so a tile drawn `2` is always item 2. It is a
`.refine` on the schema, so a bad set is `invalid_message` from the decoder.
`.default([])` lets a setup stored before labels existed still parse.
`slateItemLabel({ itemIndex, labels })` in `protocol/slate.ts` is what a screen
draws.

**The app was bridged, not redrawn.** Removing `correcting` broke three type
checks; each now asks whether the wall holds an item (`currentItemIndex !==
null`) instead, so today's screens still play the old flow — collect
everything, then mark — against the new server. Nothing on screen closes one
item, edits a label or draws one yet.

### What session B consumes

- `round.content` (`kind: 'slate'`): `itemCount`, `itemStates`
  (`('open' | 'closed' | 'marked')[]`), `currentItemIndex` (`number | null`,
  always a closed item), `yourSheet` (`{ answer, closedBeforeYou, verdict }[]` or `null`).
- `currentContent` (`kind: 'slate'`, host only): `keys`, `progress`,
  `correction` (`null` unless a closed item is on the wall) — shapes unchanged.
- `settings.game.labels` and `slateItemLabel`; `SLATE_LABEL_MAX_LENGTH` (12)
  and `duplicateSlateLabelIndex` for the editor to refuse before sending.
- Frames: `host.closeItem { roundId, itemIndex }`, `host.collectSheets` (the
  shortcut), `host.showItem` (closed items only), `host.judgeGroup`,
  `host.addItem`, `host.setItemKey`, `slate.write` (refused `wrong_phase` on a
  closed item), `host.reveal` (refused while an item is open).
- Owed: the tile and field show labels, a closed tile reads locked on the
  sheet, the console closes one item and moves between closed ones while the
  roster keeps writing, the label editor (lobby fold and added items), the
  wall's phase colour now that `[data-phase='correcting']` matches nothing,
  dictionaries, and the muted browser pass at 390 and 1440.

Session B — drawn. Muted pass with a console and four seats in their own
contexts, players in French and the console in English, 390 and 1440, both
themes.

**The console needed a count per item, so the host arm grew one.**
`filledCounts` (`PROTOCOL_VERSION` 19) is how many sheets have something on
each item — the host's cue that an item is ready to close. A count, like
`progress`, so the anti-leak line is unchanged; `filledCountsPerItem` in
`core/slate/sheet-marking.ts` computes it.

**Wall or sheets is the console's choice, reset by the cursor.** `useSlateWall`
holds whether the host asked for the sheets, and clears it whenever
`currentItemIndex` moves — keyed on the last cursor *seen*, not the one the
sheets were opened over, because stepping through the wall comes back to that
very item and a first version then showed the sheets instead. Both the stage
and the footer read it, so it lives in `HostConsole`.

**Actions follow the order of the evening.** On the wall the primary press is
*Next* while a later item is collected, *Collect the rest* while any is open,
and *Show the scores* once none is — so the reveal is never offered disabled,
it simply is not the next thing yet. *Previous* stays, and *Back to the sheets*
sits under them while anything is open.

**The marking colour is `data-marking`, not a phase.** `useMarkingField` stamps
it on the console while it shows the wall, and on a player only once nothing
is left for them to write; a player still writing keeps `playing`'s field and
reads the wall in a band above the sheet.

**The label editor drops what lies past the sheet.** A label kept at position
6 by a longer sheet has no box on a sheet of 3, and still refused its own text
as a duplicate on a box the host could see. The editor now sends only the
sheet's positions. In the lobby it lives in the settings; once the sheets are
open, beside the answer key, sized to the sheet as it has grown.

## Follow-up — the key, revealed and prepared

Two requests from the host after the first evening.

**The key is revealed by a press the room can see, and reaches the players.**
The wall's key sat behind an underlined link nobody took for a button. It is now
a full-width *Reveal the answer* above the answers, and pressing it sends
`host.revealItemKey`: the key goes up as a stamped block on the wall and joins
`round.content.revealedKeys` on every screen. Sent to players because every
other game hands its answer over at the reveal, and a closed item is safe to
reveal — nobody can still write to it. The server refuses an open item
(`wrong_phase`) and an item with no key (`invalid_message`); a player frame
carries the key of a revealed item and of nothing else. The reveal is server
state rather than the console's, so a reload keeps it and each item has its own.

**The key is prepared before the evening, on the host's tab.**
It lives in `sessionStorage` under `taverla:slate-keys`, never in the settings,
which reach every player. It first shipped as `HostPreferences.slateKeys` in
`localStorage` and was moved the same day: answers are not a preference, and
the host did not want them kept on the machine past the evening. A tab keeps
them through a reload and through a new room opened in it — which matters,
because a free Render instance that restarts takes the room with it — and
closing the tab forgets them. `taverla:host-setup` rewrites itself on read
when it holds a field the schema no longer knows, so the old key does not
linger. The lobby's settings carry an *Answer key* fold under the labels that
writes there and nowhere else; a key typed mid-sheet is filed there too. It travels as
`slateKeys` on `host.startRound` — chosen over a `host.setItemKeys` sent at the
countdown because the press that opens the sheet carrying its key leaves no
window where the round exists without it, and nothing for a mid-game reload to
send again: the restore rule holds by construction. A key past the sheet waits
until `host.addItem` grows it, as a label does. Labels already travelled with
the per-game setup and survive a new room; checked in the browser, nothing to
fix.
