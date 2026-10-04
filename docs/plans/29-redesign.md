# Stage 29 — A new UI, from zero

**Not started.** This file is the brief: open a fresh session, run
`/impeccable` with the prompt below, and update this file as decisions land.

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
