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
| 2 | [Three exits that say nothing](#2--three-exits-that-say-nothing) | medium | — | playtest 13, old D |
| 3 | [The question bank's spelling](#3--the-question-banks-spelling) | small→open | — | playtest 9, `accepted` |
| 4 | [Speed pays by rank; it should pay by the clock](#4--speed-pays-by-rank-it-should-pay-by-the-clock) | medium | — | playtest 2 |
| 5 | [Two controls that break on their content](#5--two-controls-that-break-on-their-content) | small | `/impeccable` | playtest 6, 12 |
| 6 | [The gap between two rounds](#6--the-gap-between-two-rounds) | large | `/impeccable` | playtest 4, 7, 10 |
| 7 | [Say it the way a table says it](#7--say-it-the-way-a-table-says-it) | medium | `/impeccable` | playtest 1, 11, old C |
| 8 | [The winner gets a moment](#8--the-winner-gets-a-moment) | medium | `/impeccable` | playtest 8 |
| 9 | [Arriving cold in a running blind test](#9--arriving-cold-in-a-running-blind-test) | medium | `/impeccable` | old B |
| 10 | [Stage 18 — Reflex race](18-reflex-race.md) | large | its own plan | the fifth game |

Order is by **what is wrong before what is missing**: 1 through 3 are faults a
room already met, 4 is the one rule the room asked to have changed, and
everything after is polish and new work. 5 is out of order on purpose — it is an
hour, and it is the one players touch every single round.

**Session 2 is next.** Session 1 landed on 15 August 2026; what it found that
this file did not expect is written into its own entry.

One decision is still Adrien's and blocks nothing:
[who owns a room](#open--who-owns-a-room).

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

## 2 · Three exits that say nothing

> *Playtest 13 — "« l'hôte a fermé le salon » ⇒ ok. Mais quand on est exclu, on
> n'a pas de message ?"*

He is right, and it is worse than a missing string.

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

## 3 · The question bank's spelling

> *Playtest 9 — "il y a des fautes. On a eu une question sur une prison sur une
> île, et la proposition était « alvatraz »."*

Confirmed, and it is not the only one. The bank is a single bundled file,
`apps/server/src/infrastructure/questions/question-bank.json` — 6 306 questions,
1 800 French from OpenQuizzDB and 4 506 English from Open Trivia DB.

| Line | id | Is | Should be |
|---|---|---|---|
| `:14037` | `oqdb-163-1` | `"Alvatraz"` | Alcatraz — the entry's own `note` spells it correctly |
| `:32693` | `otdb-87737bf23efd` | `"Brasil"` | Brazil — **and `"Brazil"` is one of its decoys**, so the round is unwinnable in either mode |
| `:56133` | `otdb-1f1bd4f1a19d` | `"Thwimps"` | Thwomps |

**Do not "fix" the `Orthoquizz` themes.** Around 200 entries are spelling quizzes
whose decoys are deliberately misspelled (`"Ruminents"` and its neighbours); the
same goes for near-miss decoys like `"Aznavourev"`.

The cheap audit that found these three is worth keeping: Levenshtein distance 1
between `answer` and the words of `prompt`/`note`, since the note is written
independently and is a free oracle — it covers the ~55 % of entries that have
one. A full pass means filtering proper nouns against a lexicon and checking them
against Wikidata, and that is a session of its own if it is ever wanted.

**The real content debt is underneath.** `accepted` is empty on all 6 306 rows,
and `packages/core/src/quiz/question-answer.ts:30` reads
`[question.answer, ...question.accepted]` — so in typed mode there is no
alternate spelling accepted anywhere in the product, and a right answer phrased
differently is scored wrong. Filling it is worth more than any number of new
questions, and it protects against the bank's own typos as much as the players'.

Two free fixes to take with this one, since it is the only data-shaped session:
`--space-3xs` is referenced without a fallback in `revealed-lie-board.sass:15`
and `credits-page.sass:24` and **does not exist**, so both gaps silently collapse
to 0.

---

## 4 · Speed pays by rank; it should pay by the clock

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

## 5 · Two controls that break on their content

> *Playtest 6 — "quand le texte dans une proposition est trop long, il déborde
> hors du bouton."*
> *Playtest 12 — "il y a toujours la flèche sur notre pseudo dans la liste des
> joueurs, je ne suis pas fan, tu aurais d'autres idées ?"*

Both are one component each, and both have a precedent in the repo — which is
what makes this an hour rather than an afternoon. **Options belong to the
`/impeccable` pass that opens the session, not to this file.**

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

## 6 · The gap between two rounds

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

## 7 · Say it the way a table says it

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

## 8 · The winner gets a moment

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

## 9 · Arriving cold in a running blind test

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

## Open — who owns a room

Adrien's call, and nothing above waits on it.

There is no ownership token: `POST /api/rooms` returns only the code
(`routes.ts:97`), so during any window where the host's socket is down, anyone
reading the code off the screen becomes the host — and the real one comes back to
a fatal refusal with no recourse. The takeover is not the problem; the
irreversibility is. The dominant pattern (Jackbox, Kahoot, skribbl) is that the
room code is a public identifier and never a proof, with a secret only the
creator receives.

**Recommendation: both halves** — a token for *who may*, and a grace window
keeping the previous `hostSessionId` privileged for N seconds after losing its
socket, for *and if the Wi-Fi blinks*. Showing the token in the host's own menu,
behind the same popover as closing the room, answers "the laptop died, we host
from the TV" without the room ever seeing it.

## Settled, so nobody re-opens them

- **The 10 883 "pending" OpenTDB questions do not exist locally.** They are
  OpenTDB's own review queue; the API serves only the 5 298 verified rows, which
  are already bundled. Getting them means scraping, which
  [14](14-question-languages.md) rejected on purpose. Recommendation: no.
- **Emoji reactions**: not for now.
- **Mid-game joining stays**: a phone that arrives takes a seat and plays from
  the next round.
