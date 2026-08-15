# The backlog

What a session picks up next, and nothing that is already in flight — the
uncommitted tree is [`HANDOFF.md`](../../HANDOFF.md)'s job, and that file is
local to one machine. This one is committed, because a backlog that dies with a
laptop is a to-do list somebody has to remember.

Each entry below is **scoped to one session**. Read it, read what it links, and
update it when reality diverges. A session that turns out to be two says so
here rather than half-landing.

## Where the new half of this came from

A playtest on **14 August 2026**, Adrien and Marina, on an iPhone and a laptop.
Thirteen observations, kept below under Adrien's own numbering so a note can be
traced back. It is the same lesson the plans' README already carries: *the plans
cover what is missing; what is wrong surfaces by playing.* Every item was traced
into the code before being written down here, so what follows is a diagnosis and
not a wish.

## The sessions, in the order worth taking them

| # | Session | Cost | Starts with | Holds |
|---|---|---|---|---|
| 1 | [A reconnecting phone stays half-dead](#1--a-reconnecting-phone-stays-half-dead--done-15-august-2026) | **done** | — | playtest 3 |
| 2 | [Three exits that say nothing](#2--three-exits-that-say-nothing--done-15-august-2026) | **done** | — | playtest 13, old D |
| 3 | [The question bank's spelling](#3--the-question-banks-spelling--done-15-august-2026) | **done** | — | playtest 9, `accepted` |
| 4 | [Speed pays by rank; it should pay by the clock](#4--speed-pays-by-rank-it-should-pay-by-the-clock--done-15-august-2026) | **done** | — | playtest 2 |
| 5 | [Two controls that break on their content](#5--two-controls-that-break-on-their-content--done-15-august-2026) | **done** | `/impeccable` | playtest 6, 12 |
| 6 | [The gap between two rounds](#6--the-gap-between-two-rounds--done-15-august-2026) | **done** | `/impeccable` | playtest 4, 7, 10 |
| 7 | [Say it the way a table says it](#7--say-it-the-way-a-table-says-it--done-15-august-2026) | **done** | `/impeccable` | playtest 1, 11, old C |
| 8 | [The winner gets a moment](#8--the-winner-gets-a-moment--done-15-august-2026) | **done** | `/impeccable` | playtest 8 |
| 9 | [Arriving cold in a running blind test](#9--arriving-cold-in-a-running-blind-test--done-15-august-2026) | **done** | `/impeccable` | old B |
| 10 | [Stage 18 — Reflex race](18-reflex-race.md) | large | its own plan | the fifth game |

Order is by **what is wrong before what is missing**: 1 through 3 are faults a
room already met, 4 is the one rule the room asked to have changed, and
everything after is polish and new work. 5 is out of order on purpose — it is an
hour, and it is the one players touch every single round.

**Everything above is done.** Sessions 1 to 9 all landed on 15 August 2026;
what each found that this file did not expect is written into its own entry —
and session 3's is the one to read before trusting any diagnosis here, because
two of the three faults it was given turned out not to be faults at all.

**What is left is [stage 18](18-reflex-race.md), the fifth game**, which is new
work rather than a fault a room met, and it has a plan of its own.

The one decision that was still Adrien's has been taken and built:
[who owns a room](#who-owns-a-room--done-15-august-2026).

---

## 1 · A reconnecting phone stays half-dead — **done, 15 August 2026**

> *Playtest 3 — "elle a quitté la partie et est revenue, ça fonctionne bien,
> mais son nom est resté grisé toute la partie, et un des 4 boutons apparaissait
> blanc."*

Two symptoms, three faults, and the first is the twin of a bug the working tree
has already fixed for the host.

**What shipped**, against what this entry expected:

- `isSeatConnected` in the connection registry, and the guard in `onClose`
  before both `markPlayerDisconnected` and `releaseBuzz`.
  `reconnecting-phone.test.ts` holds it, and both of its tests were watched
  failing with the guard removed.
- The second-order effect was **not** the seat sweeper failing to fire. Reading
  `isAbandoned` settles it the other way: the dead socket restamps
  `disconnectedAt` at the moment it dies, so the seat looks abandoned from
  *then* — and ten minutes later the sweeper would have taken the seat and the
  score of a player still sitting there. The playtest room did not run that long
  after the handover. The guard closes this too, since the stamp is never
  written.
- The white button was diagnosed further than it could be *confirmed*: the
  specificity is real and reproducible in any browser, and the disabled rule now
  wins in every variant. Whether the stuck attribute on the iPhone was
  `data-hovered` or `data-pressed` is still unread — the fix covers both, and
  `touch-action: manipulation` joins the buzzer's. The design question underneath
  it, what a hover should paint on a touch screen at all, is still session 5's.
- Deriving *I have answered* needed one thing this entry did not see: the host
  console holds no `youId`, so a seated host could not read itself in
  `round.answers`. `hostRoomViewSchema` carries a nullable one now — the server
  already had `seatId` and simply was not sending it. `useAnswering` is gone;
  `ChoiceAnswer` keeps one boolean for the 20–80 ms round trip and takes
  everything else from the snapshot, under the `key={round.id}` its two
  neighbours already had.
- The unshown refusal needed no screen of its own: the second tap it came from
  cannot happen now that a reloaded phone comes back locked.

### The grey name

`onClose` marks the seat disconnected without asking whether **another live
socket still holds it** (`apps/server/src/infrastructure/messaging/socket-handler.ts:891`).
Two sockets sharing a seat is normal — `seatPlayer` reclaims by `sessionId` and
`registerConnection` only ever appends. On iOS an app switch or a Wi-Fi→4G
handover leaves the old socket half-open server-side: she comes back, `hello`
lands, `joinAsPlayer` sets `isConnected = true`
(`apps/server/src/domain/room/room-service.ts:45-51`), and then the zombie TCP
finally dies and `onClose` sets it back to `false` **for good**. She plays
normally — nothing on the answer path reads `isConnected` — and she is grey until
the game ends.

The host half of exactly this is `socket-handler.ts:878-889`, guarded on
`isHostConnected` in the tree right now. The player branch below it never got the
symmetric guard: test `connectionsIn(roomCode).some(c => c.playerId === …)`
before `markPlayerDisconnected` **and** before `releaseBuzz`, or the dying socket
also takes the floor away from someone who has retaken it.

There is a second-order effect worth checking rather than assuming: with
`disconnectedAt` stuck, `startSeatSweeper` should have dropped her seat and her
score after ten minutes (`round-conductor.ts:412-438`,
`ABANDONED_SEAT_MS`). It did not, so either the room ran short or the ordering
was different — find out which before closing this.

### The white button

`ChoiceAnswer` has no *selected* state and no *correct/incorrect* state — at the
reveal it is unmounted for `Revealed`. So a filled button during `playing` can
only be `[data-hovered]` or `[data-pressed]`, and `.button.outlined[data-hovered]`
(0,3,0) outranks `.button[data-disabled]` (0,2,0) — a stuck state stays painted
after the button is disabled, in `--ink` on a dark field, which is white.

React Aria documents the WebKit quirk itself: iOS fires a second `pointerenter`
as `pointerType: 'mouse'`, guarded by a global 500 ms window armed on a `touch`
`pointerup`. Miss that window — a busy main thread on a snapshot re-render, a tap
that ends in `pointercancel` — and `isHovered` latches with nothing to lower it.
The buzzer carries `touch-action: manipulation` (`player-round.sass:107`); the
four choice buttons do not (`answer-forms.sass:28-35`).

**Confirm before fixing**: inspect the offending button on the iPhone and read
whether it carries `data-hovered`. Three levers, and the third is a design
decision that belongs to session 5 rather than here — `_control.sass:49-52`
asserts that `data-hovered` never fires on a touch screen, which is what this
bug disproves.

### The state that should never have been local

`useAnswering` keeps `answeredRoundId` in `useState` (`answer-forms.tsx:37-48`)
and that is the only memory of *I have answered*. After a reload the four buttons
are live again although the server holds her answer; a second tap is refused with
`already_buzzed` and **that refusal is displayed nowhere** — `player-round.tsx:60`
passes `error` to Le Fake's forms only. Derive it instead:
`round.answers.some((a) => a.playerId === youId)` is already on the wire
(`room-view.ts:142-145`), and `ChoiceAnswer` is the one form of the three with no
`key={round.id}` (`player-round.tsx:198` against `:185` and `:208`).

### How to tell it is done

- Two player sockets on one `sessionId`, close the first: the roster stays
  connected and the floor is not released. A socket test beside
  `second-console.test.ts`, which already has `sessionIdOf` for it.
- Reload a phone mid-round after answering: the buttons come back locked, from
  the snapshot.
- A real iPhone, muted, tapping a choice: no button stays painted.

---

## 2 · Three exits that say nothing — **done, 15 August 2026**

> *Playtest 13 — "« l'hôte a fermé le salon » ⇒ ok. Mais quand on est exclu, on
> n'a pas de message ?"*

He is right, and it is worse than a missing string.

**What shipped**, against what this entry expected:

- `removed_by_host` rather than `kicked`, because the code is read at a call site
  and in two dictionaries and the shorter name says neither who nor what from.
  The frame goes to that player's connections only, and the connection is
  **unregistered on the way out** — this entry stopped at the frame, and a
  socket left in the registry is handed one more view of the room it is out of.
- A console that took a seat is removed from the roster **in silence**, which
  this entry did not foresee: the lobby's ✕ sits beside the host's own seat too,
  and a fatal frame there would take the room's only screen down over a seat.
- The seated host's `onClose` is the seat *before* the room, not after. Holding
  the round for an absent host cancels every timer that releasing their buzz
  would have armed, so the other order re-arms a clip on a room with no screen.
- The credits page took the way home this entry asked for, and the string behind
  it moved: `notFound.back` was already borrowed by `ConnectionRefused`, so a
  third screen made the prefix a lie. It is `navigation.back` now, one key for
  one destination.
- Two faults the browser pass found in the menu itself, both shipped by the
  ownership session and neither in this entry: `Afficher le code de reprise` ran
  eleven pixels past its own block in French — the popover is a fixed 320px box
  and `_control.sass` refuses a line break on every control — and the build line
  pulled up under the exits the moment the credit above it went away. Both fixed
  here, so **session 5 does not need to rediscover the menu's half of playtest 6**.

The one thing left standing, deliberately: `host.removePlayer` aimed at the
console's *own* seat clears it server-side but leaves the console's local
`seatNickname` set, so that screen still thinks it is playing. Deriving it from
`view.seatId` is the fix and it belongs to whoever next opens that file.

**A kicked player is never told, and their socket stays open.** `evict()` is two
lines — `removePlayer` then `releaseBuzz` (`socket-handler.ts:754-757`) — with no
error frame, no `fatal`, no close. The connection is never unregistered, so the
phone keeps receiving `room.updated` with a `youId` that is no longer in
`players`; `Scoreline` falls back to *Toi* and `0`, `status` never turns
`refused`, `ConnectionRefused` never mounts. The screen stays alive and stops
counting. There is no `kicked` code in `error-code.ts` at all — the only fatal
the server sends is `room_closed` from `disband()`.

The fix is small and has one trap: send `kicked` **fatal**, to that player's
connection only, *before* `removePlayer`, and make sure `refusalVoidsSeat`
(`packages/core/src/room/session-memory.ts:51-57`) forgets the seat — otherwise a
reload walks straight back in.

**And two more exits in the same family**, carried over from the previous
handoff:

- **A host who took a seat is never marked disconnected.** `onClose` returns
  before `markPlayerDisconnected`, so that seat is `isConnected` forever and the
  sweeper never touches it.
- **Leaving a room by any in-app navigation is unannounced.** The credits link in
  `AppMenu` is the only one that does it today, and it is on every screen at
  every phase: navigating there unmounts the room page, whose socket cleanup
  closes with `disposed = true`. The server cannot tell that from a closed tab —
  a host freezes the round indefinitely with every phone on `buzz.blocked.host_away`
  and no timer running, and their own screen says nothing.

That last one is why the credits page belongs in this session rather than in a
design one: **the page needs a back link** (`credits-page.tsx` has three external
links and no way home, where `not-found-page.tsx:18-20` does the right thing
beside it), and reaching it from a room needs to stop freezing the game. The
shape was already decided — credits are a front-door concern, the menu entry
renders only when `RoomExitsProvider` reports no room exits, and the route stays
for a shared URL.

### How to tell it is done

- The host removes a player: that phone lands on `ConnectionRefused` with its own
  string, in both locales, and a reload does not get the seat back.
- A host who is also playing closes their tab: the seat goes away and is swept.
- The credits page has a way back, and cannot be reached from inside a room.

---

## 3 · The question bank's spelling — **done, 15 August 2026**

> *Playtest 9 — "il y a des fautes. On a eu une question sur une prison sur une
> île, et la proposition était « alvatraz »."*

**What shipped**, against what this entry expected — and the two disagree about
almost everything except Alcatraz:

- **Two of the three "typos" below were not typos.** `Brasil` is the Portuguese
  word for Brazil, which is exactly what its prompt asks for, and `Thwimps` is
  what tiny Thwomps are actually called in Super Mario World. Both were the
  Levenshtein-against-the-note audit reporting a near-miss as a fault — the same
  false positive this entry warned about for `Orthoquizz`, landing on the very
  rows it offered as confirmed. Only `Alvatraz` was real.
- **The audit worth keeping was a different one.** A row's three decoys are the
  bank saying out loud what it considers a different answer, so *a decoy the
  matcher grades right* is an oracle with no lexicon and no false positives. It
  found 333 rows against the note oracle's one, and it is a test now
  (`question-bank.test.ts`) rather than a script somebody remembers to run.
- **The fault underneath was the matcher, not the data.** `5 minutes` is eight
  characters, so one correction was forgiven — and the decoy was `7 minutes`. 93
  numeric rows had that shape, and around 200 spelling questions had it worse:
  `Accueil` beside `Acueil` is a question the matcher answered for the room.
  Forgiveness now stops one edit short of the nearest decoy, per row, so an
  answer nothing crowds keeps all of it.
- **`normalizeAnswer` was the blind test's, and the quiz had inherited it.**
  Stripping `(…)` and a ` - ` suffix is a *music catalogue* rule: it folded
  `River Horse (Greek)` onto `River Horse (Latin)` and `1915 - 1916` onto
  `1915 - 1918`. It is `answerAppearsIn`'s alone now. A leading article went the
  other way and is folded everywhere, which is the 312 rows a room answers
  without saying *Le*.
- **Twenty rows are gone**, and they are the ones no rule can save: eight French
  questions whose decoy differs from the answer by an accent, and twelve English
  ones whose answer is punctuation — `-` among Ed Sheeran's albums, `C++` beside
  `C#`, `♡♪!?`. Every one of them is unanswerable in typed mode, where choice
  mode compares by index and never sees the string. Dropping them beat carrying
  a mode flag through the protocol for 0.3% of the bank.
- **The generator wrote to a path that no longer existed** (`infrastructure/quiz/`
  against the bank's `infrastructure/questions/`), so a rebuild would have
  produced a second file and changed nothing. Fixed, and it now applies the same
  rejection and carries the one correction, so a rebuild does not undo this.

### `accepted` stays empty, and that is the answer

This entry called filling it the real content debt. It is worth less than it
looks, and the session says so with numbers: the two classes anybody would fill
it with — a leading article, an accent — are **rules**, and rules belong in the
matcher where they cover 6 286 rows rather than the ones somebody got to. What
is left is genuine synonymy (`Cervin` / `Matterhorn`), which no rule derives and
no pass over six thousand rows produces reliably without a human reading every
one. It is a content session with a person in it, or it is nothing; it is not
engineering work waiting to be scheduled.

The bank is a single bundled file,
`apps/server/src/infrastructure/questions/question-bank.json` — 6 306 questions,
1 800 French from OpenQuizzDB and 4 506 English from Open Trivia DB.

| id | Was reported as | What it turned out to be |
|---|---|---|
| `oqdb-163-1` | `"Alvatraz"` | **Real.** Alcatraz — the entry's own `note` spells it correctly, and it is the one correction the builder carries |
| `otdb-87737bf23efd` | `"Brasil"` | **Not a typo.** Its prompt asks for the Portuguese word for Brazil. The row is gone anyway: `"Brasíl"` is one of its decoys and folds onto the answer |
| `otdb-1f1bd4f1a19d` | `"Thwimps"` | **Not a typo.** Tiny Thwomps are Thwimps. Still in the bank |

**Do not "fix" the `Orthoquizz` themes.** Around 200 entries are spelling quizzes
whose decoys are deliberately misspelled (`"Ruminents"` and its neighbours); the
same goes for near-miss decoys like `"Aznavourev"`. They are answerable now
rather than excluded: the decoy cap is what makes a spelling question ask for
the spelling.

The audit this entry proposed — Levenshtein 1 between `answer` and the words of
`prompt`/`note` — is the one that produced the two false positives above. What
replaced it is in the session's notes at the top, and it is a test rather than a
script.

The two `--space-3xs` gaps this entry bundled in are fixed, at `--space-2xs`
rather than by adding a step: 4px is the scale's floor on purpose, and a 2px
token is a step nobody can see at forty centimetres, let alone four metres.

---

## 4 · Speed pays by rank; it should pay by the clock — **done, 15 August 2026**

**What shipped**, against what this entry expected — it was right about the
shape, and wrong about two things it could not see from outside:

- Every recommendation was taken: linear, `MOST_A_SPEED_BONUS_PAYS = 3`,
  continuous inside and rounded once at the end, the **first** banked half
  stamping the blind test's pair, nothing at all for a wrong answer.
- **`firstScoredAt` did not gain a sibling; it changed meaning and name.**
  `scoredAfterMs` is how far into the round the player first banked, and it is
  the only stamp — the wall clock it held was used for the bonus and for the
  award order, and both want the round's clock. The rename is what makes the
  next reader notice.
- **The socket assertions could not simply be rewritten to new numbers.** A
  bonus that falls with real elapsed time makes every total a function of how
  loaded the machine was, and four suites asserted totals. `basePointsFor` in
  the harness takes the clock's share back off, so a rate is asserted as a rate;
  the one assertion left on a total is the one that matters — two players who
  answered in the same breath now score **the same**, where the table always
  separated them.
- **The copy was four strings, not two.** `blindtest.scoring.*` and
  `quiz.scoring.*` each spell the rule out in `choice` and `typed`, in both
  locales, and every one of them said *+2 et +1*. Session 7 inherits their
  register, not their arithmetic.
- **The reveal says what the clock paid**, on the phone: `awardSchema` carries
  `speedBonus` beside `points`, and `+3` now has *dont 2 pour la vitesse* under
  it. The big screen still shows the total alone — placing it there is session
  6's, which owns that composition.
- **The browser pass earned its place again.** The bonus line was first written
  as a `<span>` inside `.you-scored`, and `letter-spacing` inherits as a
  *computed length*: `monument`'s -0.035em of a 12rem number reached a 14px
  caption as nearly seven pixels of negative tracking and folded the sentence
  onto itself. Nothing type-checks that. They are siblings under `.your-award`
  now.

> *Playtest 2 — "si on répond plus vite que les autres, on devrait avoir plus de
> points, pour tous les jeux. Plus on a répondu tôt, plus on a de points, on se
> base sur où en était le chrono."*

**It already exists.** `SPEED_BONUS_BY_RANK = [2, 1]`
(`packages/protocol/src/scoring.ts:48`): +2 to the first player who scores, +1 to
the second, nothing after — ranked among the players who *scored*, so being
quickly wrong takes nobody's bonus. Applied at `round-service.ts:502`, on the
blind test and the quiz, in `typed` and `choice`. The buzzer has none because the
order *is* the buzz. Le Fake has none deliberately, and the reason is written
into the constant: voting fast is voting without reading the board, which is the
half of that round worth having.

That rank bonus is what Adrien asked to replace, and the argument for keeping it
was made and turned down on 15 August 2026: *if the first answers at one second
and the second answers correctly at twenty-nine, the gap between them should be
proportional.* So this session swaps the rank for the clock, on the **quiz and
the blind test**. It is a decision taken against the recommendation recorded in
the constant's own comment, which is why that comment is rewritten rather than
deleted — otherwise the next reader restores the rank as an obvious improvement.

**Not the buzzer, and not Le Fake.** Both were asked about, and both are refused
by the mechanism rather than by taste:

- The **buzzer has no denominator**. `roundDurationMsOf` returns `null` — there
  is no round clock at all, because the host brings the content. Eight seconds
  into a charade acted out over forty is not the same eight seconds as into a
  riddle said in five, and nothing in the room knows the difference. It also
  needs the bonus least: one player takes the floor, so speed is already the
  whole prize.
- **Le Fake** stores no timestamp on a vote
  (`packages/core/src/lefake/tally.ts:10-13`) — a new field, and that part is
  easy. What a curve would pay for is the problem: voting fast is voting without
  reading the board, and on the other half of the round it would pay the lie
  written quickly, when a good lie is the one somebody thought about. Both phases
  push the wrong way.

### The shape

One insertion point, one missing datum, one new rule.

- **The datum.** `bank()` (`round-service.ts:399-413`) stamps `firstScoredAt`
  with a raw `Date.now()`. It has to stamp `elapsedRoundMs(round, now)`
  (`:1047`) instead, or beside it. The round clock **pauses** when the host is
  away (`holdRoundClock`), so `firstScoredAt - runningSince` is wrong for good
  the moment a round was ever held — and that is not a rare case, it is every
  round where a console blinked.
- **The rule.** `speedBonusForRank` in `packages/core/src/scoring/speed-bonus.ts`
  becomes `speedBonusForElapsed({ elapsedMs, roundDurationMs })` or near enough.
  It arrives with the unit test the current one never had: there is no
  `speed-bonus.test.ts` at all, the bonus is covered only at socket level
  (`answer-modes.test.ts:279-329`), and those assertions break with this and have
  to be rewritten rather than relaxed.
- **The call site** is the single line `round-service.ts:502`.

### What the session decides

- **Integers or decimals.** A curve naturally produces decimals and they are ugly
  on a party scoreline — *4.7 points* is not a number anybody says out loud.
  Recommendation: continuous inside, rounded to an integer at the end, so the
  bonus is `0…MAX` and the board still reads.
- **`MAX`, and the shape between the ends.** Linear —
  `round(MAX × (1 − elapsed ÷ duration))` — answers the request exactly: at 1 s
  of 30 the first player takes the whole bonus, at 29 s the second takes none.
  `MAX = 3` keeps it in the same range as the answer itself; larger makes speed
  worth more than being right, which is the failure mode to watch for.
- **Ties stop being broken by arrival.** Two players landing in the same second
  now score the same, where the rank table always separated them. More honest,
  and a real change in how the board reads.
- **Which bank counts on the blind test.** A player who takes the title at 3 s
  and the artist at 20 s has two elapsed times, and the pair is scored once — so
  one of them is the answer. Probably the first; say which, in the code.
- **Nothing changes for a wrong answer.** The bonus is still only paid to players
  who scored: being quickly wrong takes nobody's place.

### It is cheap, but it has a tail

The code is small. What costs is everything that *describes* it. The
`quiz.scoring.*` and `blindtest.scoring.*` hint strings spell the old rule out in
both locales — *"les deux premiers à la trouver gagnent +2 et +1 en plus"* — so
session 7 cannot be written until this lands. And a curve is **less** visible
than a rank bonus was: the reveal shows `+N` per player and never breaks it down,
so a player has no way to see the lead they were paid for, and no way to argue
about it. Making it legible is part of this session rather than an afterthought;
the surface it lands on belongs to session 6.

---

## 5 · Two controls that break on their content — **done, 15 August 2026**

**What shipped**, against what this entry expected:

- **The answer buttons wrap rather than ellipsise**, which the entry left open
  between its two precedents. The scoreboard ellipsises because a row is a fixed
  height and the name is only being *read*; these four are being **told apart**,
  and the tail is often what does it — `Sunday Bloody Sunday` against
  `Sunday Bloody Sunday - Live`. The box grows: `min-height` was already right,
  what was missing was vertical padding, `white-space: normal` and
  `overflow-wrap: anywhere` for a title with no spaces in it at all.
- **The arrow became a stamp**, not another mark. `.you .nickname` is the ink
  with the field's colour on it — the same block a banked half wears — which is
  the product's own way of saying *this one is yours*, survives all six phase
  fields by *being* the ink rather than a shade of it, and tells itself apart
  from every neighbour without hue. The word travels in the markup now, in
  `visually-hidden`: generated content is read by some screen readers and by
  none of the others, so the old `←` left the row either mislabelled or
  unlabelled depending on who was reading it. Two alternatives were rejected and
  are cheap to switch to — muting every *other* row's name, which makes a board
  about one player, and a thicker rule on the row, which reads as a section
  boundary rather than as a person.
- **The third lever is answered: a hover is painted only where a pointer can
  hover.** `@media (hover: hover) and (pointer: fine)` around the three
  `[data-hovered]` arms, with `[data-pressed]` left unconditional because it is
  the whole of a thumb's feedback. Session 1 could only fix the *cascade* — the
  disabled rule now wins — and this is the other half: a screen with no pointer
  has no business painting a hover at all, whatever react-aria latched.
- **A fault this entry did not know about, found on the way and fixed on
  sight**: the phone's final board printed every nickname as one letter and an
  ellipsis. `.player-round.centred` is `align-items: center`, which shrink-wraps
  a child to its min-content — and a nickname's min-content is *zero*, because
  `overflow: hidden` is what buys it the ellipsis in the first place. The board
  takes the column now. It is session 8's surface and it was broken today.

> *Playtest 6 — "quand le texte dans une proposition est trop long, il déborde
> hors du bouton."*
> *Playtest 12 — "il y a toujours la flèche sur notre pseudo dans la liste des
> joueurs, je ne suis pas fan, tu aurais d'autres idées ?"*

Both are one component each, and both have a precedent in the repo — which is
what makes this an hour rather than an afternoon. **Options belong to the
`/impeccable` pass that opens the session, not to this file.**

The menu's half of the overflow is already done — see session 2 — and what it
settled is worth reading first: a control whose width is a constant rather than
its content's is where `_control.sass`'s `white-space: nowrap` cannot hold. An
answer button is not that; it is as wide as its column. So the decision below is
still open, and the precedent above does not pre-empt it.

**The overflow is real and its cause is shared.** `_control.sass:28` puts
`white-space: nowrap` on *every* control, Button and Link alike, and
`answer-forms.sass:19-43` never lifts it: no `overflow`, no `text-overflow`, no
`overflow-wrap`, and no `min-width: 0` on the `li`. A long track title leaves the
button and takes the layout with it. Two precedents to weigh against each other:
`verdict-panel.sass:49-52` lets one control wrap on purpose (*"the one control in
the product allowed to wrap"*), and `scoreboard.sass:41-43` ellipsises. Note what
`DESIGN.md` requires: any server or typed text at display size must wrap, with
`min-width: 0` on the parent. The same component is rendered on the host console
when the host has taken a seat (`host-console-page.tsx:331`), so whatever is
decided is decided for both screens at once.

**The arrow is one CSS rule.** `scoreboard.sass:57-58`:
`.you .nickname::after { content: ' ←' }`, a literal U+2190, not an icon and not
a translated string. Two constraints for whatever replaces it: the comment above
it states the intent — the mark has to survive whichever of the six phase fields
is painted behind it, which is why it is not a tint — and generated content is
read aloud by some screen readers, so a purely visual replacement needs a
`visually-hidden` equivalent (the class exists, `globals.sass:36`). It is only
ever visible on the player's own phone: the host passes no `youId`.

The third lever from session 1 lands here too — whether a touch-first product
should paint a filled background on `[data-hovered]` at all.

---

## 6 · The gap between two rounds — **done, 15 August 2026**

**What shipped**, against what this entry expected:

- **Neither of the two merges this entry offered was possible**, and for a
  reason it had half-seen: `openRound` *replaces* `room.round`, so by the time a
  countdown is on screen the reveal it interrupted is gone from the snapshot
  entirely. Keeping the panel mounted through `countdown` had nothing to mount,
  and `advancesAt` would only have bought a clock on the reveal — not the reveal
  on the countdown, which is what playtest 10 asked for.
- **So the console remembers it.** `useRoundStillBeingTalkedAbout` holds the
  last `revealed` round view and the countdown draws it underneath the number.
  Nothing joins the wire: the server has nothing to say about a round it has
  finished with, and a second round on the room view would have to be kept
  honest through a reload, a takeover and a game change for one screen's sake. A
  console reloading mid-countdown gets the number alone, which is exactly the
  screen this replaced.
- **The field question answered itself once the content was the variable.** The
  merged screen is painted on the **countdown's** own field, because the colour
  is what says a new round is coming and the content is what says what the last
  one was — the two carry different halves of the same moment rather than
  competing. The number gives up the screen it had (42vmin → 18vmin) and keeps
  the size that reaches the far side of a room, and the panel's `card-strike` is
  suppressed there: it struck when the answer landed, and striking again would
  say a second thing had happened.
- **The standings join the reveal**, which is playtest 4 — they were on this
  screen during `playing` only, where nobody is looking at them. **Not on the
  phones**: [17](17-mid-game-join.md) declined that and this session found no
  reason it did not have.
- Playtest 7's overflow was one screen, not three: `AskedQuestion` and the lie
  board already wrap. The reveal's title and artist come from a catalogue, at
  `monument` size, and `min-width: 0` is only half a fix — a flex item stops
  growing where an unbreakable word does not. A nickname in the said/scored
  lists now ellipsises, because the number at the end of that row is the half
  the room is reading.
- ~~**Still owed, and cheap**: Le Fake's reveal was not driven in a browser, so
  its board *plus* the new standings is unmeasured on a tall room.~~ Measured
  and fixed on 15 August 2026 — see session 6's entry below. It was neither
  cheap nor a detail: the standings were entirely below the fold.

---

> *Playtest 4 — "ce serait pas mal de voir les points de tous les joueurs sur
> l'écran hôte, voire sur tous les écrans à chaque fois qu'on voit le
> classement."*
> *Playtest 7 — "ajoute des ellipsis sur l'écran hôte quand on montre la réponse
> + le décompte jusqu'au prochain round."*
> *Playtest 10 — "fusionner l'écran de décompte et de résultat d'une réponse ?
> Je trouvais ça répétitif — on pourrait afficher le décompte AVEC les résultats
> de la manche d'avant."*

Three notes about the same twenty seconds, which is why they are one session.
The facts it starts from:

- **The full scoreboard is already on the host screen — during `playing` only**
  (`host-console-page.tsx:341`). Not at `revealed`, not at `countdown`, not at
  `buzzed` or `voting`. The reveal shows the round's own `+N` and nothing
  cumulative (`reveal-panel.tsx:93`). So playtest 4 is not "add a scoreboard", it
  is "the one moment the table wants it is the one moment it is missing".
- **Reveal and countdown are two screens, and the countdown wins.**
  `host-console-page.tsx:278-284` returns early on the `countdown` phase, so the
  whole stage becomes one number. Merging them is not a layout question first —
  it is a protocol one: the round view carries `startsAt` only
  (`packages/protocol/src/room.ts:301`), which during `revealed` is the round
  *already played*, and the auto-advance deadline is a server-side timer that is
  never broadcast (`round-conductor.ts:251`). Either a field like `advancesAt`
  joins the round view, or the merge only works the other way round — keep the
  reveal mounted *through* the countdown phase, where `startsAt` is finally the
  right target.
- **Each phase owns a colour** (`_tokens.sass:111-129`), and `DESIGN.md` states
  the phase is the colour. A merged screen has to answer which field it is
  painted on. That is the real design question of the session, and it decides
  whether this is a merge or a reveal that grows a clock.
- Playtest 7's *"ellipsis"* is about the same screens overflowing on long
  content — the reveal and the countdown are where the answer text and the
  nicknames are largest. Session 5 fixes the choice buttons; this one has to
  check `RevealPanel`, `AskedQuestion` and the `lie-board`.
- The player's side of playtest 4 was already argued and declined once, in
  [17](17-mid-game-join.md): repeating the room's big-screen ranking on every
  phone asks the table to look down at a phone, against the product's first
  principle. If the phones are to show it, it needs a reason that plan did not
  have.

---

## 7 · Say it the way a table says it — **done, 15 August 2026**

**What shipped**, against what this entry expected — and most of it had already
happened before the session opened:

- **The register pass landed with the tavern copy**, in the session that renamed
  a room to *une table* and a host to *l'aubergiste*. The setup panel this entry
  wanted re-read in one sitting was re-read there: *Comment on répond · Quatre
  propositions · On tape · Le premier qui buzze* is what playtest 1 asked for.
- **The tagline question closed itself.** *Prenez place.* against *Prends
  place.* was a choice between two ways of addressing the room; the front door
  says **La taverne est ouverte.** now and addresses nobody, so there is nothing
  left to answer. Adrien never had to.
- **What was actually left was four sentences**, and they were the ones the note
  quoted: *"Tout le monde choisit parmi quatre, contre la montre"* — parmi four
  *what*, and then *la montre* twice in one breath once session 4 rewrote the
  arithmetic on top. They open on the shape of the round now: *Quatre
  propositions, et tout le monde répond en même temps.*
- **Playtest 11 is answered by naming them, up to three.** A count is what the
  room already knows; *Trouvée par Zoe* is the thing it does not. Past three the
  line is a wall of names on a board sized by how many candidates there are, and
  the count says more. **Naming who fell for a lie is the same call and it is
  deliberate**: the room watched the vote happen, the board already names who
  wrote each line, and the score pays the author per person caught — a count
  hides nothing and says less. Both strings are invariable (*Trouvée par …* /
  *Ça a mordu : …*), which is what keeps a name list out of the plural
  machinery.
- **Session 6's owed check is discharged here**: Le Fake's reveal carries the
  new standings without crowding, verified with a five-line board. A room of ten
  writing ten lies is still unmeasured, and that is the one to watch.
- **It was worth watching — measured 15 August 2026, and it was the worst
  overflow in the product.** Ten players, ten lies, votes spread so every line
  carries its own count: **2 377px of document against a 1080px screen**, 2.74×
  on a 1366 laptop. The standings ended at 2 028px — the half the room actually
  asks for, eight hundred pixels below the fold on a screen nobody walks over to
  scroll. Five lines fit and hid all of it.

  Three things fixed it, and none of them is new: the stage takes **two columns**
  above `$wide-screen` the way `voting` does one press earlier, the board
  **divides the viewport by its line count** the way the vote's board does, and
  each line stopped spending **three full-width rows** on a lie plus two short
  fragments — who wrote it and who it caught now share one row. 1920 tops out at
  1080px exactly; 1366 is a 1.26× scroll, down from 2.74×.

  Two traps, both of which cost a pass and neither of which fails loudly:
  **`container-type: size` needs a height imposed from outside** — a grid item
  that is `align-items: center`, or the stage itself getting its height from a
  chain of `flex: 1` under `min-height`, both resolve `100cqh` to nothing, every
  clamp lands on its floor and the screen merely looks a little small. And
  **`contain: size` also contains the overflow**: where ten lines do not fit at
  any legible size, the board ran out of its box and the launch button was drawn
  straight through it. Dividing `100dvh` minus the measured chrome keeps the
  worst case a scroll instead of a collision, which is what this screen already
  does below the split.

  ~~**Still open, and now measured**: the other three games' reveals print
  `Outcome`, one unbounded row per player.~~ Closed the same day, and it turned
  out to be four faults rather than one — three of them found by driving the
  screen the fix was for, which is the only place any of them were visible.

  **The list**, which is what was owed. `Outcome` writes `--outcome-rows` — its
  own count, not the room's, because a phone that never answered is in neither
  list — and the row divides `100dvh` minus the chrome, with its padding in `em`
  so a row is one multiple of its own type. The bare buzzer is excluded by
  selector rather than tuned: its reveal is a scoreline set in `billboard` on
  purpose, and only one player can ever be paid for a buzz.

  **The answer, which was worse and nobody had looked.** A quiz answer is
  catalogue text of unknown length at a fixed `9vmin`: the bank's median is 9
  characters, its 90th percentile 17, and its longest **83** — six lines and
  490px of a 587px budget, overrunning by 141px with *four* players on screen.
  `--answer-length` is published beside the row count and the clamp divides by
  it. Notes turned out to be French-only and on a fifth of the bank, which is
  why `:has(.note)` buys back six rows rather than a blanket allowance costing
  the other four fifths their type.

  **The bare buzzer's `billboard` had never applied.** `.reveal-panel.bare
  .scorers li` and `.reveal-panel .identity .scorers li` weigh exactly the same
  and `.bare` was written first, so the buzzer's entire screen carried one 28px
  line — *smaller than the standings beside it*. Moving the block to the end of
  the file is the whole fix, and nothing about it was visible in a build.

  **The count-in recap had inherited the same overflow**, because it is the same
  panel one phase earlier: eight players ran past the bottom and ten made
  1 291px. So the arithmetic moved to where both phases can reach it — the panel
  publishes `--outcome-header`, which is what it knows, and each stage subtracts
  it from the screen along with its own chrome, which is what the stage knows.
  A phase that sets no budget at all falls back to a number large enough that
  the clamp lands on its ceiling, so nothing else on the console moved.

  Measured at 1920×1080 across the bank's real distribution, seven answer
  lengths × four room sizes: **27 of 28 cases land at exactly 1080px**, every
  ten-player case included. The one left is French, a two-line answer, a note
  *and* twelve players, at 17px. The count-in fits to nine and scrolls 15px at
  ten, down from 211px. 1366×768 is a 1.19× scroll with no collision, and 414px
  is untouched — the arithmetic is inside the two-column branch, and the answer
  bound is inert wherever `9vmin` is already the smaller number.

---

> *Playtest 1 — "reformuler « tout le monde choisit parmi 4 ». La plupart des
> wordings ne font pas très naturels. Il faut ajouter « parmi 4 propositions » à
> la limite, ou reformuler autrement."*
> *Playtest 11 — "dans Le Fake, quand une seule personne a trouvé, on voit « 1 a
> trouvé » ; on pourrait afficher le pseudo ? Ou trop overkill ?"*

A copy pass over the host's setup panel and two reveal strings. English is the
reference — `dictionary-en.ts` types `dictionary-fr.ts`, so both move together or
neither compiles.

**The strings Adrien is quoting** are `quiz.scoring.*` and `blindtest.scoring.*`,
the hint under the answer-mode control (`settings-panel.tsx:291-293`, built by
`scoringKey`). *"Tout le monde choisit parmi quatre, contre la montre. La bonne
proposition rapporte 1 point, et les deux premiers à la trouver gagnent +2 et +1
en plus."* — one sentence carrying the mode, the clock, the base points and the
speed bonus. The mode labels themselves are `host.answerMode.*`
(`dictionary-fr.ts:174-179`): *Quatre propositions · On tape · Le premier qui
buzze*. The whole panel's inventory is worth re-reading in one sitting rather
than patching one line — it is roughly twenty-five strings, and their register
drifts.

Two things that are *not* only copy, and are why this session is not free:

- Whatever those hint strings end up saying, they **describe the scoring**, so
  they cannot be written before session 4 decides whether the bonus table
  changes. Take 4 first, or write these last.
- Playtest 11 is a one-line code change, not a translation.
  `revealedCandidateSchema` already carries `voterIds`
  (`packages/protocol/src/lefake.ts:40`) and it is on the player's view too;
  `revealed-lie-board.tsx:25-26` already holds `nicknameOf` and only uses it for
  authors. So *"Léa · Max · Sam"* is available without touching the protocol. The
  product question — whether naming who fell for a lie is funny or unkind at a
  table with children in it — is the session's, and `PRODUCT.md` names mixed-age
  families as the stricter audience.

**The tagline rides along**, since it is the same file and the same decision:
`home.tagline` is settled as **Prenez place. / Take a seat.**, with one thing
open — the four game taglines below it use *tu*, so vouvoyer above them is
inconsistent. The recommendation was ***Prends place.*** Adrien has not answered.

---

## 8 · The winner gets a moment — **done, 15 August 2026**

**What shipped**, against what this entry expected:

- **The podium is made of type, not of blocks.** Three rows that differed only
  by a muted numeral now step: the rank numerals run 1.9em, 1.45em, 1.15em down
  to the base, in the ink where the rest stay muted, on rows that are
  baseline-aligned so a taller numeral grows *off* the line the names sit on
  rather than pushing its row about. It is the one podium this world can draw —
  three stacked blocks would be a graphic in a product that has none.
- **Keyed on `data-rank`, never on the row's position.** `Scoreboard` carries
  the rank it was ranked with now, which is what lets two players sharing first
  both wear it while the row under them is third. Styling `nth-child` would have
  made the visual podium contradict the component's own doctrine — *ties are
  named rather than broken* — and it is exactly the kind of lie a room checks.
- **The fireworks are a rule and a strike.** A burst of particles is a costume
  on a product made of hard edges, ink and no shadows; the same *gesture* in
  this material is the name struck the way a second of the countdown is, and a
  3px rule drawn out from the middle underneath it as it settles. The board
  settles under both, one row every 60 ms, which is what makes the three read as
  one moment rather than three.
- `finished` is the phase with no clock, which is the whole reason there is a
  budget: everything above sits inside `prefers-reduced-motion: no-preference`
  and every duration falls back to `0`.
- **Everything this entry asked to keep is kept**: the two-column overflow past
  eight players, the `.tie` and `.nobody` arms, and a single winner whose name
  is twenty characters with nowhere to break.
- **The phone's final board is unchanged**, deliberately: it already tells that
  player where *they* finished, in `monument`, and the podium is what the room's
  screen is for.

---

> *Playtest 8 — "ajouter une petite animation « podium + feu d'artifice » pour le
> gagnant ?"*

`FinalBoard` today is a header — a label, the winners joined by ` · ` at
`clamp(3rem, 13vmin, 11rem)`, the winning score — over the full `Scoreboard`,
splitting into two columns past eight players (`final-board.tsx:16`). **There is
no podium**: first, second and third are three rows differing only by a muted
rank number. And there is **no animation of its own** — only the inherited
`page-enter` and the slow field transition.

Motion is not new here, which makes this cheaper than it sounds: seven keyframes
already exist (`card-strike`, `countdown-strike`, `round-drain`,
`popover-strike`, `connection-pulse`, `spinner-turn`, `page-enter`), every
duration token collapses to `0ms` under `prefers-reduced-motion`, and the reveal
already has a strike shared by both surfaces.

The one doctrine to respect, from `DESIGN.md`: **nothing inside a running round
animates.** `finished` is a terminal phase with no clock, so it is precisely
where the budget for this lives — and the only place in the product where a
celebration would not be competing with a question somebody is trying to read.

The design belongs to `/impeccable`. What this file can say is what the screen
must keep: the two-column overflow past eight players, ties (the label already
has `.tie` and `.nobody` arms), and a single winner whose name is long.

---

## 9 · Arriving cold in a running blind test — **done, 15 August 2026**

**What shipped**, against what this entry expected — which was right about all
of it, including that the premise it inherited was wrong:

- **The console admits it.** `isClipUnheard` is the rule and it lives in core
  with a test, because the fault is invisible from a browser: a silent round is
  *identical* to one that plays. Whenever no gesture has blessed an element on
  this screen and the round serves a clip, the stage carries *Le son ne sort pas
  d'ici.* and one press — during the countdown and during the clip alike.
- **The refused unlock could not have been retried, and now can.** The element
  was stored whether or not `play()` resolved, so the guard on it turned every
  later press into a silent no-op and the tab was mute for the evening. It is
  kept only on success now.
- **The thrown-away rejection had a use after all.** `NotAllowedError` means the
  element is not blessed, so the console disarms and offers the press again;
  `AbortError` is the next `load()` cutting this one short and is ignored, which
  is what the bare `.catch(() => {})` was right about.
- **One thing this entry did not see**: arming mid-round was not enough on its
  own. The phase effect is what loads, seeks and plays, and it read the element
  through a **ref** — so a press during a round changed nothing until the next
  phase turned over. The blessed element is state now and the effect's own
  dependency, which is what makes the press take at once; `canPlay` is derived
  from it rather than kept beside it, because a boolean next to a ref says the
  same thing twice and only one of the two is in the list.
- The seek at the heart of it is `seekTargetMs` in core now, with the rule the
  old inline comparison only implied: **only ever forward**. A clip ahead of the
  round is a rounding error, and yanking it back is audible where letting it run
  is not.
- **Verified muted**, deliberately: the press was driven on a console reloaded
  mid-round, the block appeared and went away. That the clip then *sounds* is
  the one thing a muted browser cannot answer, and it is what the unit test on
  the seek is for.

---

Carried over whole from the previous handoff, and still true.

**The premise "no gesture, so autoplay is blocked" is wrong, and the truth is
worse.** `.play()` is never reached: `audioRef.current` is populated only by
`unlock()`, called only from a press (`host-console-page.tsx:190-194`), and the
phase effect returns early on a null ref (`round-audio.ts:93-97`). A host who
reloads mid-round, pastes `/host/CODE` or restores a tab gets no `src`, no
`load()`, no seek, no `play()` and **no `NotAllowedError`** — the browser is never
asked. Everything else looks normal: `Listening…` renders unconditionally,
`RoundProgress` advances on the server's `roundElapsedMs`, buzzes work, the reveal
lands. **A silent round is visually identical to one that plays.** It recovers on
the next round, because opening one is a press.

`02-host-console.md:58` already requires the opposite, and the seek code at
`round-audio.ts:121-130` — whose comment names this exact case — is unreachable
after a real reload.

Volume is not the lever; `DEFAULT_VOLUME = 0.8` is right. What is missing is a
*gesture*, and the view already holds `audioUrl` and `roundElapsedMs`. The shape:
in `countdown` or `playing` with no audio element, the screen says so and offers
the one press that fixes it — unlock, seek, play. It would be the only screen in
the product that admits to being muted, which is why it starts with
`/impeccable`.

Two smaller faults in the same module: a refused unlock is never retried (the
guard is on the element existing, `round-audio.ts:167`, not on `play()`
resolving, and the element is stored even when the promise rejects, `:180-182` —
so the tab is mute for life), and both `.catch(() => {})` throw away the one thing
worth keeping, whether the rejection was `AbortError` or `NotAllowedError`.
Players are unaffected: audio is the host screen's alone. There is no test on this
hook at all.

---

## Who owns a room — **done, 15 August 2026**

The diagnosis, kept because it is what the shape answers: there was no ownership
token. `POST /api/rooms` returned only the code, so during any window where the
host's socket was down, anyone reading the code off the screen became the host —
and the real one came back to a fatal refusal with no recourse. **The takeover
was never the problem; the irreversibility was.**

Both halves were built, and the answer to "should a screen holding only the code
be able to take a room over?" is *yes, but never for good*:

- **A token decides who may.** `POST /api/rooms` mints one with the room and
  hands it to whoever opened it — eight characters from the room code's own
  alphabet, because it is read off one screen and typed on another. It travels
  in `hello` and nowhere else, and it **always wins**: the screen holding it
  takes the room back from whatever is connected, which is what makes a takeover
  undoable in both directions.
- **A grace window covers the Wi-Fi blinking.** `HOST_RECLAIM_GRACE_MS` is a
  minute, stamped on `hostLeftAt` when the room's last console goes, and a
  second screen arriving inside it is refused with `host_reconnecting` rather
  than handed the room. Past it, a room whose laptop is not coming back can
  still be picked up with the code alone — a party is not ended by a dead
  battery.
- **The token is read out of the host's own menu**, hidden behind a press
  because the console is often a television, and typed on the refusal screen the
  second console lands on. That is the whole of "the laptop died, we host from
  the TV", without the room ever seeing it.

What the browser pass corrected, and it is the reason the seam exists: the token
was first kept **on the host seat**, which `refusalVoidsSeat` drops — so being
displaced deleted the very token that was supposed to undo it. Two stores,
`taverla:seats` and `taverla:host-tokens`, because a seat and a room's own secret
do not die together.

## Settled, so nobody re-opens them

- **The 10 883 "pending" OpenTDB questions do not exist locally.** They are
  OpenTDB's own review queue; the API serves only the 5 298 verified rows, which
  are already bundled. Getting them means scraping, which
  [14](14-question-languages.md) rejected on purpose. Recommendation: no.
- **Emoji reactions**: not for now.
- **Mid-game joining stays**: a phone that arrives takes a seat and plays from
  the next round.
