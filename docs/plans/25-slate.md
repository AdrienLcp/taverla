# Stage 25 — The slate

**Half done.** Session A (served) landed; session B (drawn) is owed. The brief
below is left as written — read "What the build disagreed with" at the end
first.

## Goal

A sixth game where **everyone writes, nobody hears anybody else, and the host
marks the papers**. The host sets how many things there are to guess, every
player's screen shows that many numbered answers to fill in any order, the host
collects the sheets, and then corrects them item by item on the big screen,
validating each answer by hand.

It was asked for as a chip tasting — 26 numbered cups passed round, each player
writing what they think is in each — where answering out loud let the table copy
whoever spoke first. It is kept only because it is not about chips: a wine or
cheese tasting, a quiz on paper read out in one go, *guess the price*, *who took
this photo*, a treasure hunt's answer sheet. The server serves no content, like
the buzzer; what it adds is **privacy until the correction**.

Working names: game key `slate`, translation prefix `slate.*`, shown as
*L'Ardoise* / *Slate*. The product name is Adrien's to confirm.

## Why one mode and not two

Two shapes were on the table: a fixed sheet of N answers set up front, and a
host who adds one thing to guess at a time while players move to the next. The
second is the first with N growing, so **one mode does both**:

- The host picks a number in the lobby (26 for the chips). That is the whole
  setup — no labels are required.
- While the sheets are open, the host can **add one more item**. A host who
  prefers to go one at a time starts at 1 and adds as they go.
- Cups circulating together or one by one make no difference to the sheet:
  a player fills whichever number is in their hand.

## Decisions taken

- **The host judges, by hand.** Approximations are the host's call ("paprika"
  for "barbecue fumé"). No server grading, no speed bonus, one point per
  validated answer. `single` verdict, reused.
- **Answers are editable until the sheets are collected**, then read-only. Each
  field saves on its own (on blur and on a short debounce) as an upsert of one
  item; an empty text clears it. What is saved comes back in the player's own
  snapshot, so a locked screen or a reload loses nothing.
- **A player's answers go to that player and nobody else until collection** —
  not to other players, **not to the host screen either**, because the host
  screen is the wall (Le Fake's argument). During writing, the console shows
  each player's progress only: *Julie 12/26*.
- **An optional answer key, host-only.** The host may note what each number
  is ("12 — Barbecue") in setup or during writing. It is part of the host arm
  only, never of a player frame, and is shown on the wall at that item's
  correction. The host never takes a seat in this game: they know the answers
  and they judge — `isJudgedByHost` says yes.
- **Latecomers can write.** The sheet phase has no clock and no race, so the
  shell's mid-round stamp is taken **at collection** for this game, not when the
  round opens: a friend arriving at the fifth cup gets a sheet. After
  collection, the shell's rule applies unchanged.
- **The whole sheet is one round.** Phases: `playing` is the writing, then a
  new phase name, **`correcting`**, holds an item cursor, then `revealed` and
  the final board. Adding a name, not splitting the enum — the rule Le Fake
  applied to `voting`.
- **Correction groups identical answers.** For the current item, answers are
  grouped after the shared normalisation (case, accents, whitespace, leading
  article), so one tap validates every *paprika*. A blank is shown and cannot
  be validated. An answer not validated when the host moves on is wrong. The
  host can go back to a previous item and change a verdict; the score follows.
- **Bounds**: 1 to 60 items. 26 is the case that asked for it.

## Screens

**Player — writing.** A grid of numbered tiles is the navigator *and* the
progress: a filled tile looks filled. Tapping 17 opens one large field for
number 17 — which is what a player holding cup 17 needs, rather than scrolling
a list of 26 inputs in the dark. The field shows the number huge; next/previous
move along. A line says the sheet is saved and editable until the host
collects it.

**Console — writing.** The item count with its *+1* control, the roster with
each player's progress, the collect button, and — folded away, because the
console is the wall — the answer key editor.

**Console — correcting.** One item at a time, readable at four metres: the
number, the key if one was noted (behind a reveal tap, so the host chooses the
moment), the grouped answers with who wrote them, and one validate toggle per
group. Previous / next, and the running scores.

**Player — correcting.** The current item's number, what *they* wrote, and the
verdict once given, plus their score. Their own full sheet stays reachable,
read-only.

Design goes through `impeccable` against `apps/game/DESIGN.md` in session B;
nothing above fixes a visual.

## Protocol

- `gameKinds` and `shelvedGames` gain `slate`; `PROTOCOL_VERSION` bumps.
- A `slate` arm on `gameSettingsSchema`: `itemCount`.
- `round.content` arms: the **host** arm carries the item count, per-player
  progress, the key, and — from `correcting` only — every answer; the **player**
  arm carries the item count and that player's own answers, and the current
  item's verdict for them once given. Encoded through the player schema as
  every player frame is.
- Messages (names settled in the session, following the prefix partition
  `HOST_ONLY_MESSAGE_TYPES` reads): a player writing one item; the host adding
  an item, setting one key, collecting, moving the cursor, and judging one
  item's answer group — `host.judge` today requires `buzzed` and an active buzz,
  so either it learns an item index for this game or the game gets its own.
- `RoomPhase` gains `correcting`.

## Size

Two sessions, split like the reflex race:

- **A — served.** Protocol, core (grouping, per-item scoring, the collection-time
  stamp), server handlers and projection, and `slate-game.test.ts` on the socket
  harness — including that no player frame ever carries another player's answer
  or the key, and that the host arm carries no answer before `correcting`.
- **B — drawn.** The four screens, both dictionaries, the picker entry, the
  shelf page, then a browser pass muted: a host, three players, one joining
  mid-sheet, one reloading mid-sheet, a full correction including a changed
  verdict.

## Out of scope

- Photos or text attached to an item for the players (the item is a physical
  thing in the room).
- A deadline on the sheet. The host collects when the table is done.
- Server grading against the key. The key is a memo for the host, not a rubric.

## Done when

- A room plays a 26-item sheet end to end in a browser: players fill numbers in
  any order, edit, reload, and find their answers; the console shows progress
  and never an answer; collection locks the sheets; correction walks the items
  with grouped answers; the final board matches the validated count.
- A player arriving after the sheets opened writes a full sheet.
- `pnpm validate` is green, and the anti-leak tests fail when the projection is
  broken on purpose.

## What the build disagreed with

Session A — served. Protocol, core, server, `slate-game.test.ts` (12 socket
tests, each broken once on purpose), `PROTOCOL_VERSION` 16 → **17**.

**`slate` is in `gameKinds` and not in `shelvedGames`.** The brief put it in
both; `shelvedGames` is exactly what refuses a game with no screens, so session
B adds it with the screens. Until then a room reaches the slate by a settings
frame alone, which is how the socket suite plays it.

**The host judges with its own frame, `host.judgeGroup`, not `host.judge`.**
`host.judge` names one player on the floor, requires `buzzed` and an active
buzz, and ends in a lockout, a resumed clip or a reveal. The slate's verdict
names a group of players on the item on the wall, is paid on the spot, and can
be taken back — teaching `host.judge` an item index would have made `playerId`
optional and put a branch on every line of `applyVerdict`. They share the
`single` verdict shape and nothing else. `itemIndex` must be the item on the
wall (`stale_round` otherwise), `groupKey` must name one of its groups
(`invalid_message` otherwise); a blank line is never a group, which is the whole
guard against validating one.

**The messages**: `slate.write` (player — `itemIndex`, `answer`, an upsert of one
line, `''` clears it); `host.addItem`, `host.setItemKey`, `host.collectSheets`,
`host.showItem` (move the wall to an item, back as well as forward),
`host.judgeGroup`. The host ones are `host.*` because the prefix *is* the
host-only partition — `client-message.test.ts` holds `HOST_ONLY_MESSAGE_TYPES`
to it. Every index is 0-based.

**The flow**: `countdown → playing` (writing) `→ correcting` on
`host.collectSheets`, wall on item 0 `→ revealed` on `host.reveal` from the
correction `→ finished` on `host.nextRound`, since the slate opens on
`roundCount: 1`. A `host.reveal` while the sheets are open is refused with
`wrong_phase`: collecting is a decision, not a reveal pressed early.
`correcting` is inside `isRoundInPlay`, so the game cannot be switched under a
correction whose scores are still moving.

**The mode narrows to `typed`**, and `isJudgedByHost` says yes for the slate
under it. `buzzer` would have made the judge fall out of the mode rule for free,
and it would also have put an answer window in the settings panel and let a
`player.buzz` through `registerBuzz`. A sheet is typed; who marks it is the
game's to say. `player.answer` in a slate round is refused `invalid_message` by
`grade`, which has no slate arm.

**The mid-round stamp is taken at collection.** `startRoundClock` leaves
`openedWithPlayerIds` null for the slate, and `host.collectSheets` stamps it.
Who is marked is the stamped players who still hold a seat, so a sheet whose
writer left is neither grouped nor paid. A seat taken after collection reads
`joinedAfterStart: true` and gets no verdicts rather than a column of wrongs.

**The key is not settable in the lobby.** The brief allowed it "in setup";
`settings` travels to every player, so a key there is a leak, and a room-level
store for a round that does not exist yet is state for a convenience. The key is
set on the round, from the countdown until the reveal — the console's writing
screen is where it is edited, and the players never see it either way.
`host.addItem` grows the *round's* count, not `settings.game.itemCount`, which is
where the next sheet starts.

**The host arm carries the item on the wall, not the whole pile.** The brief said
"every answer" from `correcting`; the wall shows one item and the cursor moves,
so `correction` is `{ groups, blankPlayerIds }` for the current item only and the
next snapshot carries the next. A group is `{ key, text, playerIds, isCorrect }`
— `key` the normalised form a verdict names, `text` the spelling most of the
group wrote, largest group first then alphabetical. `isCorrect` is `null` until
judged, `false` once the wall has passed the item unjudged.

**Grouping is `normalizeAnswer` and nothing else** — case, accents, spacing,
punctuation and a leading article. No typo tolerance (a near miss is the host's
call on the wall) and no catalogue-noise folding (the blind test's alone).

**Scores are recomputed, not accumulated.** Every verdict and every cursor move
recomputes each marked sheet's points (`sheetPoints` in
`core/slate/sheet-marking.ts`) and moves the player's score by the difference
from what the round had already paid; `round.awards` is rebuilt the same way,
one award per marked player, `speedBonus: 0`. A changed verdict on an earlier
item therefore moves the board at once.

**`slate.write` is not a floor frame.** A line moves nothing along — only the
host collects — so it is accepted while the console is away rather than lost to
a Wi-Fi blink.

**No new error code.** A late edit and a late `host.addItem` are `wrong_phase`,
an index past the sheet or a group that is not one is `invalid_message`, a tap on
an item the wall has left is `stale_round`.

### What session B consumes

- `round.content` (`kind: 'slate'`): `itemCount`, `currentItemIndex`
  (`number | null`, `null` while writing), `yourSheet` (`{ answer: string | null,
  verdict: boolean | null }[]`, one per item; `null` for the console).
- `currentContent` (`kind: 'slate'`, host only): `keys` (`(string | null)[]`),
  `progress` (`{ playerId, filledCount }[]`, every seat), `correction`
  (`null` | `{ groups: { key, text, playerIds, isCorrect }[], blankPlayerIds }`).
- Running scores are `players[].score`; the round's per-player tally is
  `round.awards`.
- Only `slate.name` and `slate.scoring` exist in the dictionaries — the type
  forced them. Everything else, `shelvedGames`, the picker, the shelf page and
  the muted browser pass are session B's.
