# Stage 29 — A new UI, from zero

**In progress — the shell and the player's choice screen are built**, on the
`stage-29-redesign` branch so `main` keeps deploying the old world until the
new one is whole. This file is the brief: open a fresh session, run
`/impeccable` with the prompt below, and update this file as decisions land.

## Decisions so far

- **2026-10-04 — `PRODUCT.md` refreshed** (step 0): five games, three roles,
  Cloudflare hosting, the bank's real size, the no-scroll rule as operating
  context.
- **Ruled out by Adrien**: the party-game app (near-black, one neon accent,
  glows) and any period costume. The front door holds **two promises together**:
  playing in seconds, and a whole evening on the shelf.
- **Three directions, as example pages** in `.impeccable/directions/` (not
  committed; seed key `0a5a42fb`): `chrono.html` — bibs and race timing, the
  one the seed assigned; `boite.html` — the board-game shelf, impeccable's own
  top pick; `embarquement.html` — boarding pass and departures board, the
  challenger that held on product clarity. Declined challengers (star atlas,
  bitmap specimen, centre-rail setting, split-flap) each donated one discipline
  to `chrono`, written on its page.
- **Worst real content, measured**: the 192-char fr prompt is
  `mintaka-8db29866`; the 275-char choice is `vikidia-astronomie-2-1`; and
  `vikidia-bravelands-13` is the harder realistic case — four choices up to
  ~160 chars each, the stress row of every example page.
- **2026-10-04 — Adrien chose `boite`, the board-game shelf.** Its page,
  `.impeccable/directions/boite.html` (local, uncommitted, French copy), is the
  reference the build reproduces and the finish review is judged against; its
  contract is the comment at the top of `<body>`:
  - THESIS: Taverla is a shelf of game boxes on a table; every screen is a
    printed piece from that box, never an app panel of rounded cards on a dark
    ground.
  - WORLD: matte printed board, pale sky by day and slate blue by evening; four
    inks (coral, saffron, sky, leaf) on die-cut answer tiles with a 3 px
    chipboard edge, sprue nubs and a shape each (circle, triangle, square,
    diamond) so colour is never the only cue; paper question cards; eight pawn
    colours; a 50-square score track around every console edge, inked by the
    phase so the room reads the phase from across it; the room code on a
    saffron token; the five games as boxes on a shelf.
  - TYPE: Bricolage Grotesque, condensed axis, for lid titles and figures;
    Atkinson Hyperlegible Next for everything read. Both to be self-hosted.
  - Measured on the page: 0 px overflow at 390×844, 812×375 and 320×568 (long
    choices at the 14 px floor). Known gaps: the landscape question sits at
    17.9 px with room to spare; the reveal ranking was not re-checked with a
    20-character nickname.

## Built so far (2026-10-04)

- **The shell.** `_tokens.sass` is the board world in `light-dark()` pairs:
  board, track squares, chipboard, paper, socket, four tile inks with their
  shape marks, five game spines, eight pawns, primary coral. `--field` / `--ink`
  survive as the pair every component not yet redrawn reads, pointed at the board;
  the phase no longer repaints the ground and sets `--phase-ink` instead, for
  the track. Contrast measured in both palettes: worst text pair 5.93:1, worst
  shape mark 3.37:1. Bricolage Grotesque (display, width axis 75–100) and Atkinson
  Hyperlegible Next (read) are self-hosted in `public/fonts`; Archivo is
  deleted. `_piece.sass` is the die-cut material (`piece`, `pressable`,
  `card`), and `_control.sass` cuts `filled` as the coral token and `outlined`
  as a plain piece. The menu trigger and popover are pieces too.
- **The choice screen**, player side: `player-page` renders `framed` (held to
  `100dvh`, no scroll) whenever `isChoosing`. One chrome line (round + pips,
  pawn + score), the menu as an icon, the clock as a strip draining along the
  question card, four `AnswerTile`s (`presentation/components/answer-tile.tsx`,
  `TileMark`, `Pawn`). Sizes are `k / sqrt(length)` between a 14px floor and a
  box cap, with the question yielding to long choices. Upright: four rows, 2×2
  when ≥560px wide; lying down (≥13/10): the chrome and the question left, the
  tiles the whole right column, the menu moved to the left. Choices over 60
  characters are four full-width rows at every ratio. The status line is one
  sentence, visually hidden under 600px of height.
- **The seated host's choice screen** is the same screen: `host-console-page`
  renders `framed` whenever its host holds a seat in a choice round, and the
  header, footer, standings, hold strip and setup fold all leave for as long as
  the round runs. The shared pieces moved to where both surfaces reach them —
  `ChoosingRound` (`features/player/choosing-round.tsx`, the card and the four
  tiles), `RoundChrome` (`presentation/components/round-chrome.tsx`) and the
  frame itself as `framed.page` (`presentation/styles/_framed.sass`). The one
  control a round in play offers, *give it away*, moved to the head of the
  menu as `RoomActions.revealRound`, reported only while the screen is framed,
  so it costs the tiles no row. A refused frame or a speaker the browser has
  not let play takes a `.notice` row, which exists only while it has something
  in it.
- **The proof**: `e2e/choice-fits.spec.ts` answers the socket in the page with
  a stub snapshot and measures two seats (a player, a seated host on
  `/host/KWRH`) × sixteen viewports × four bank rows (the 192-char
  prompt, the 158-char choice, the most choice text, a long prompt over long
  choices): no document overflow, every tile and the card inside the viewport,
  no words spilling their box, nothing under 14px. Broken on purpose once per
  seat (an 18px floor fails three rows; a host page without `framed.page` fails
  all four).
- **The 275-char choice was repaired**, as §2 asked: at the 14px floor it ran
  84px past a 320×568 screen and 83px past 568×320. It is 123 characters now,
  in `question-repairs.json` and the built bank.

- **The score track** (`presentation/components/score-track.tsx`) rings the
  console and the wall above the split: a fixed grid whose band is
  `clamp(34px, 6.5vmin, 76px)`, its square count measured from the viewport
  (`ResizeObserver` on a probe the band's width), square nought the start and
  every fifth printed heavier. Each pawn stands on `score % squares`, keyed on
  its square so a move lands rather than teleports. The lobby keeps the printed
  blues; every other phase mixes `--phase-ink` into them. Below the split it is
  a 5px frame in the phase ink and nothing else. It raises `--layout-padding`,
  so the page and the fixed menu clear it, and publishes `--track-room` — the
  viewport less what it added — which every `100dvh - chrome` budget on the
  console now divides instead.
- **The console lobby**: above the split the page is the grid, the invitation
  down the left, the shelf, the table and the launch on the right (the wall
  keeps the old two columns, because its header carries the sound press). The
  code is a saffron token (`2.98em` for `WWWW` in Bricolage, measured), the QR
  sits on a white card in both palettes (an inverted square fails cameras), the
  game picker is `BoxShelf` (five lids, the chosen one pulled forward; the
  tagline goes under 800px of height), the roster is seats with pawns plus a
  socket for every pawn still in the box, the seat form is one line, and the
  launch sits beside the setup fold. The long pitch is the wall's alone now —
  the lids carry the promise — and the hold strip leaves the lobby: there is no
  reveal yet to hold. Removing a player is a ✕ named `Remove {nickname}`.
  Measured at 1280×720, 1024×768 and 1920×1080: no overflow, empty or with
  eight seated; only a 20-character name truncates.

- **The console's playing stage** (`features/host/playing-stage.tsx`) is the
  paper question card with the round's sand along its top, the four tiles
  *printed* (`PrintedChoices`, an `<ol>` of the same faces — nobody picks on
  this screen, so they are not buttons), and `AnsweredPawns`: the table's pawns,
  standing for an answer in, dashed for one owed — *that*, never *what*. The
  standings left: the ring already carries them. Lying down the card sits
  beside the tiles, or beside a seated host's typing field; upright it is one
  column. The page is a three-row grid (header, stage, footer) whose stage is a
  size container, and the footer is one row above the split or lying down: the
  fold and *give it away*. The hold strip is the reveal's alone now — it was a
  row of a screen the tiles could not spare. Under 576px of height the header
  goes; under 352px the pawns do too. The wall shares all of it.
  `choice-fits.spec.ts` measures it as a third seat (`room`: eight players,
  three in) over the sixteen viewports and four bank rows: 0px over everywhere,
  where it was 327px at 1280×720. Broken on purpose once (an 18px question
  floor fails two rows).

- **The console's reveal** is the box world's results card. A blind test's
  cover is a print mounted on paper; a quiz's answer is printed on the same
  paper card the question was, the card turned over. What the table said is a
  chip per player — the pawn, the name, the words, the points — filled for a
  right answer and an empty outline for a wrong one, dealt down then across in
  one, two or three columns (`dealtRows`). The standings sit beside it under a
  title (`Standings`, `host.standings`) with their pawns, and the hold is a
  groove draining in the phase's ink along the foot of the stage rather than a
  block of ink. Above the split the page is the playing stage's three-row grid,
  the stage a size container (`reveal`), and every list divides its own box by
  its rows — the `--outcome-header` / `24rem` / `--hold-bar` viewport budgets
  the old reveal carried are gone above the split. The countdown's recap is the
  same panel under the number and is held the same way. `choice-fits.spec.ts`
  measures it (`room`, a quiz with a note and a blind test, eight players, in
  French) over every viewport from 900px wide: no scroll, and no row drawn past
  the list holding it — the second check went red at 1024×768 before the chips
  were tightened, which a page-scroll check alone never sees inside a size
  container. Past about fourteen players a list scrolls in its own box rather
  than over the bar.

- **The countdown and the floor.** The countdown is a round paper token with
  the second struck onto it (`--token-size` is the one dial; the numeral is
  two thirds of it, and only the numeral re-keys, so the token stays put while
  each second strikes). Alone it is sized against a size-container stage
  between the header and the footer; over the recap it is a row of the
  reveal's grid. The buzzed stage is the buzzer's own pawn stood up oversize,
  the name, and the floor's clock on a smaller token — and **the track takes
  that pawn's colour** for as long as they hold the floor (`floorHolderOf`,
  `ScoreTrack`'s `floorHolderId`, `--on-pawn-N` beside each pawn; pawns 2 and 5
  darkened two points to clear 4.5:1 under white). On the console the answer
  sits on the question's paper and the verdicts are pieces two by two, *right*
  in the reveal's green, *missed* a dashed plain piece. Lying down the pawn and
  the presses share a row; upright the pawn stands beside the name. The wall
  keeps the pawn alone, larger. `choice-fits.spec.ts` measures both screens
  from 900px wide: no scroll — the verdict went red at 900×900 (278px) before
  the upright row existed.

Measured traps, so the next screen does not pay for them again: a `position:
fixed` element inside the page is fixed to the page, not the viewport, because
the entrance animation leaves a `transform` — the track renders beside `<main>`; `height` on the console's `<main>` does
nothing, because it is a `flex: 1` item of the app shell and that is what holds
it to the viewport; a folded `Disclosure` panel keeps its contents laid out
under `content-visibility: hidden`, so an overflow scan must skip what
`checkVisibility()` says nobody can see;
a size container with `flex: 1` answers its queries against a zero-height box in
Chromium (`flex: none` + an explicit height); a framed screen must not run the
page's entrance animation, whose leftover `translateY` is a 1px scroll.

## Next session

1. The rest of §1's inventory screen by screen — final board, the slate's two
   stages, reflex — each against
   the ring's `--track-room` and measured at 1280×720, 1024×768 and 1920×1080;
   the front door last (Persuade), `og.png` redrawn, then §6.
   `AskedQuestion`'s own sizing still carries Archivo's measured width
   (`494cqi`) everywhere the playing card does not override it; re-measure it
   on Bricolage when the next screen that shows it is redrawn.

## The prompt

> /impeccable Redesign Taverla from scratch — a **replacement visual world**,
> not a polish of the current one. Target `apps/game`. Mode: **Operate** for
> every in-room screen, **Persuade** for the front door (`/:locale`,
> `/:locale/:game`).

### 0. Before anything

- `apps/game/PRODUCT.md` is stale: it describes one game, Deezer only, and
  "answer modes are planned". Run `init` to bring it up to date from
  `.claude/CLAUDE.md` (domain vocabulary) and `docs/game-catalogue.md` before
  choosing a direction. Product truth below wins over the old file.
- `apps/game/DESIGN.md` (1 164 lines) is **evidence, not authority**. Read its
  `Layout`, `What is out of budget` and `What must not be broken` sections for
  the hard-won measurements; discard its world. It also still names *Le Fake*
  and a vote board — neither exists.
- The browser is **muted before the first navigation** (`taverla:volume = '0'`
  in an init script, see `docs/browser-driving.md`). The host and the wall play
  audio.

### 1. What the product is today

A shelf of five party games sharing one room, one 4-character code, one QR code
and every screen in the room. Nobody installs anything, nobody has an account.

| Game | What happens | Answer modes |
|---|---|---|
| Blind test | a 30 s clip plays on the room's speaker, players name title and artist (or the film, for score cues) | typed · choice (4) · buzzer |
| Quiz | a banked question in FR or EN (11 453 of them, 8 subjects) | typed · choice (4) · buzzer |
| Buzzer | a bare race for the floor; the host brings the content | buzzer |
| Reflex | race against a screen about to change colour; false start costs the round | buzzer |
| Slate | a private numbered answer sheet on every screen, marked item by item on the wall | typed |

**Three roles, never three devices.** A phone may be the host; a laptop may be
a player. Nothing may name or assume the device.

- **Host** (`/host/:code`) — sets up, starts rounds, judges the buzzer modes,
  may take a seat and play. Read by a group from 40 cm to 4 m.
- **Wall** (`/wall/:code`, paired via `/wall` + `/pair/:code`) — the room's own
  screen: shows the game, plays the clip, holds no answer, no control, no seat.
- **Player** (`/play/:code`) — reads in glances, standing, in the dark, between
  a conversation and a drink. Their screen must be enough on its own (score,
  round, clock, what just happened) without becoming a copy of the console.
- Also: `/invite/:code` (an unattended poster: code + QR only), `/:locale/credits`,
  not-found, error screen.

**Phases** every role walks through: `lobby → countdown → playing → buzzed →
revealed → finished`, plus connecting, reconnecting (status lives in the menu,
no banner), host away (wall), joined mid-round, removed by host, room closed,
refused. Reflex never passes `buzzed`; slate marks inside `playing`, each item
`open | closed | marked`.

**Always reachable, on every screen, at every phase**: `AppMenu` — connection
status, the room's QR and code, wall pairing (host), volume (only on the screen
that plays sound), language EN/FR, theme light/dark/system, rename, and the
three nested exits (leave seat, end game, close room). It must stay out of reach
of a press aimed at the game.

**Inventory of components** to redraw, not to keep: RoomInvitation, JoinReminder,
GamePicker, SetupFold (playlist picker, settings panel — the densest screen in
the product), Scoreboard, RoundBoard, FinalBoard, Countdown, RoundProgress,
RevealHold, FloorClock / FloorDial, Buzzer, ReflexBuzzer, AskedQuestion,
ChoiceAnswer, TypedAnswer (with the banked-halves stamps), VerdictPanel,
RevealPanel (cover art arrives at 250 px), ReactionBoard, SlateSheet,
SlateWritingStage, SlateCorrectionStage, HeldRooms, the game shelf.

### 2. The hard constraint — the question and its four choices never scroll

On every viewport, at every aspect ratio, **the question and all four choices
are visible at once with no scroll**, on a player's screen and on a seated
host's console, in the quiz and in the blind test (where there is no question
but four title/artist pairs). The current design accepted overflow as "out of
budget" (812×375 overflows 137 px); that bargain is revoked.

Design for the worst real content, measured from
`apps/server/src/infrastructure/questions/question-bank.json`:

| | median | p95 | p99 | max |
|---|---|---|---|---|
| Prompt, fr | 61 | 94 | 129 | **192** chars |
| Prompt, en | 65 | 111 | 128 | **140** chars |
| Choice | 9–11 | 24–27 | 40–46 | **275** chars (one outlier; 112 above 60) |

Longest unbreakable word: 29 characters. Blind-test choices carry a title *and*
an artist line.

What that means for the system, decided before any direction is drawn:

- **The viewport is the frame, not a page.** This screen is built against
  `100dvh` × `100dvw` minus safe areas, with no document scroll; type and
  layout fit the box, the box never grows to fit the type.
- **The layout changes with the ratio, not just the width**: four stacked rows
  in portrait, a 2×2 grid when the box is wide enough, question beside choices
  in landscape. Pick by aspect ratio and by container size, not by a device
  breakpoint.
- **Text sizes from its own length and its box** (container query units plus
  the length the component publishes, as `answer-fitting.ts` already does), with
  a legibility floor a grandparent can read. If the 275-character outlier still
  cannot fit at the floor, say so with a number and propose fixing the bank row
  — do not let one row lower the floor for 45 811 others.
- **Chrome yields to the question**: on this screen the round strip, scoreline
  and clock compress to one line; the menu trigger may not cost a row.
- **Proof, not intent.** A Playwright check (in `e2e/`) that loads the
  192-char fr prompt with its four longest choices, and the 275-char choice,
  and asserts `scrollHeight <= innerHeight` and every choice's box inside the
  viewport, at: 320×568, 360×640, 390×844, 430×932, 568×320, 667×375, 812×375,
  768×1024, 1024×768, 900×900, 1280×720, 1440×900, 1920×1080, 2560×1080,
  3440×1440, 1080×1920. Break it on purpose once.

Stretch, same principle: every `playing` screen (typed, buzzer with a question,
reflex, slate sheet) fits too, and the old out-of-budget list in `DESIGN.md` is
treated as a list of targets.

### 3. Product truth that is not up for redesign

- A player is never shown the answer while it can still be typed; the wall
  never holds it either.
- The server owns time; a client clock only ever draws the server's deadline.
- Every interactive element is a `react-aria-components` primitive wrapped in
  `presentation/components/`, styled from its `data-*` attributes.
- Every string is in both dictionaries (EN, FR — French runs longer), every
  colour a token in **both palettes**, sass in the `reset, tokens, base,
  components` layers declared in `index.html`.
- `prefers-reduced-motion` collapses all motion; contrast is measured at the
  size used, in both themes.
- The audience is adult friends at a party **and** families with children and
  grandparents in the same game: warm, federating, never laddish. The product
  name (`Taverla`) lives on the front door only; a game screen names the game.
- Party Wi-Fi: nothing blocks first paint; the font is self-hosted.

### 4. What to throw away

The current world — saturated phase fields (*the phase is the colour*),
Archivo at width 125, French TV title cards 1972–81, hard edges, the buzzer as
the only circle. It may be argued back in by a direction that earns it, never
kept by inertia. The phase change must stay legible across a room in some form:
that is a function, not a look.

### 5. How the directions are presented

Adrien chooses between **complete example pages**, not cards: one HTML file per
direction, openable on its own, real content (a real 192-char fr question and
its four choices, real nicknames, a real scoreboard), each showing at least the
player's choice screen in portrait and landscape, the console lobby with its QR
code, a reveal, and an empty state (a lobby with nobody seated yet). The
impeccable decision page and prose summaries do not let him choose.

### 6. Done means

Seen in a real, muted browser at the viewport set above, the Playwright
no-scroll check green, `pnpm validate` green, `DESIGN.md` rewritten from the
built world, `PRODUCT.md` current, this plan and `README.md` updated.
