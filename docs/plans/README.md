# The staged build

One file per stage, each scoped to a single session. Read the stage's plan
before starting, and update it when reality diverges — a plan that no longer
describes the code is worse than no plan.

**[`backlog/`](backlog/README.md) is where a session that is not a stage is picked
up** — the faults a room has already met, the polish it asked for, and the two
decisions still open. It is ordered, and each entry is scoped to one session the
same way a stage is.

| Stage | State | What it delivers |
|---|---|---|
| [00 — Bootstrap](00-bootstrap.md) | **done** | Contract, server, lobby, QR, join, live roster, clock sync |
| [01 — Round engine](01-round-engine.md) | **done** | The server actually runs a round: pool, countdown, buzz, verdict, reveal |
| [02 — Host console](02-host-console.md) | **done** | Playlist picker, synchronised audio, the judging UI |
| [03 — Player round](03-player-round.md) | **done** | Countdown, a live buzzer, lockout, honest feedback |
| [04 — Reveal & scoreboard](04-reveal-scoreboard.md) | **done** | Reveal screen, running scores, end of game |
| [05 — Design pass](05-design-pass.md) | **done** | `/impeccable`: a visual world, motion, the real polish |
| [06 — Testing](06-testing.md) | **done** | Socket suites, the clock under skew, two Playwright journeys |
| [07 — Language & appearance](07-i18n.md) | **done** | English and French, light and dark, the corner menu |
| [08 — Deploy](08-deploy.md) | **done** | One origin serving both, somewhere friends can reach |
| [09 — Answer modes](09-answer-modes.md) | **done** | Four choices or a typed answer, everyone at once, scored by speed |
| [10 — Per-device audio](10-per-device-audio.md) | **dropped** | Audio stays on the host. See the plan for why, and what replaces it |
| [11 — The seam, and the buzzer](11-buzzer.md) | **done** | The split between the shelf and one game on it, and the second game that proves it: a buzzer the room supplies |
| [12 — Trivia](12-trivia.md) | **done** | A quiz through the seam, in all three modes, on 1 800 bundled French questions. The third game on the shelf |
| [13 — The room comes first](13-room-first.md) | **done** | A room is opened before the game is chosen: `settings.game` goes nullable, and the picker moves onto the lobby stage |
| [14 — Question languages](14-question-languages.md) | **done** | A second bank, 4 506 English questions, and the control that picks between them — defaulted to what the host reads, independent of it after |
| [15 — Room social](15-room-social.md) | **dropped** | A chat in the room, and public rooms with a directory. Both evaluated and declined; the file holds why, and the smaller thing worth building in each case |
| [16 — Le Fake](16-le-fake.md) | **done** | The fourth game: write a lie, fool the table. It bought the submit-then-vote phase seven of the remaining games want, on the quiz bank and for one new `RoomPhase` name |
| [17 — Mid-game join](17-mid-game-join.md) | **done** | A round stamps who it opened on and waits for those players alone, so a phone arriving mid-clip no longer holds it up. It kept the seat, the refusal and one screen saying *au prochain tour* |
| [18 — Reflex race](18-reflex-race.md) | done | The fifth game, and the cheapest: the screen flips, the first thumb wins. Session A served it — protocol, the false-start floor, the heat, `reflex-game.test.ts` — and it bought the **fifth guarantee**: the stimulus is a server timestamp every device schedules locally. Session B drew it: the field inverts at the flip (`data-flipped`, no seventh colour), the wait is the one screen in the product that never moves, and the reveal is a board of reaction times. It is on the shelf, and `shelvedGames` now equals `gameKinds` — which is a coincidence of today, not a rule |
| [19 — A URL per language](19-locale-urls.md) | done | `/fr` and `/en`, seven indexable pages prerendered into **fourteen** served documents, each with its own `lang`, `title`, `description`, `canonical`, `og:` and reciprocal `hreflang`. Two problems with one build step: it is also the only thing that touches the **83% of LCP spent waiting for JavaScript**, because the served `index.html` had nothing to paint. A second Vite build emits a Node bundle, `scripts/prerender.ts` writes the documents and a manifest, and Hono registers one route per URL from it. The plan said six pages and twelve documents and was already wrong by two — `reflex` had reached the shelf — so the build reads `shelvedGames` and `LOCALES` and a hardcoded list is what it refuses to keep. Head copy lives in `presentation/head/document-head.ts`, the one user-visible string outside the dictionary, which is the exception the i18n rule already carved. **Measured**: the documents are right and the scores are flat, because the first paint stopped waiting for React and now waits for three render-blocking stylesheets that arrive at 1 930 ms — 16 KB queued behind 550 KB of JavaScript and a 90 KB font. Inlining what the first paint needs is the whole remaining win and is not in this stage |

## Order, and what can move

01 → 02 → 03 → 04 is a real dependency chain: each needs the protocol and server
behaviour the previous one adds. 05 through 08 are independent of each other and
can be taken in any order once 04 lands — though running the design pass before
the screens exist wastes it.

09 and 10 are the first stages added after the game shipped, from playing it
rather than from planning it. 09 is much the larger: it is the first thing that
breaks the assumption that exactly one player acts at a time.

11 is the first stage that is not about the blind test. Its front half — the
seam between the shelf and one game on it — is the one piece that had to wait
for a second game to exist, because inventing the shared shape before there are
two cases to measure it against is the abstraction anti-pattern with a different
hat on. Both halves have landed, and the second one is what corrected the first:
five settings called "what every game needs" turned out to be three.

**Read the divergences at the end of [11](11-buzzer.md) before trusting a detail
written earlier in that file.** The second game corrected the first half in four
places, which is what a second case is for — and the same caution applies to
every plan here: a stage file is what was decided *then*, corrected in place
when a later stage disagreed.

11 and 12 were one file until the second game turned out not to be the quiz. A
bare buzzer serves no content at all, which makes it both the cheapest game on
the shelf and the sharpest test of the seam: it is the one that disagrees with
what "every game needs". Trivia is a whole content question on top of a shape
the buzzer will already have proved, so it goes second.

07 was taken first, out of order and deliberately: routing strings and colours
through a layer costs an afternoon before a design pass and a rewrite after one.
Everything built from here reads its strings from
`presentation/i18n/` and its colours from `--tokens`, in both themes.

## Work that is not a stage

Playing the game produced a round of shell revision that belongs to no stage:
the corner menu replacing the preferences footer, the recovery screen a dead
socket now shows, desktop layouts for the two screens that were still phone
shaped, the room-code copy, a design pass on the form controls, the lobby
controls for the three settings the protocol always carried, and a host's setup
surviving the room it was made in. It is
recorded where it will be read — [`apps/game/DESIGN.md`](../../apps/game/DESIGN.md)
for the materials and the icon family,
[`.claude/rules/design-system.md`](../../.claude/rules/design-system.md) and
[`component-shape.md`](../component-shape.md) for the rules that came out of it,
and the changelog for the list.

The typed mode's rework is the largest of these so far, and it came from the
same place: one field instead of two, as many guesses as the clip allows, and a
matcher that finds each half *inside* a line. Two fields asked a player to know
which half they were holding before they could say it, and one guess per round
made a near-miss the end of it. None of that was visible until a room typed into
it.

A third: the large screen. Both front doors were a 620px column at every width
while the type scaled with the viewport, and the host's console had no maximum at
all — so one read as a phone screenshot enlarged and the other sprawled across a
21:9 display. It landed in two passes, and the second is the one worth having:
bounding the field and widening the column only stopped the page being wrong,
where splitting the front doors into a poster past 1 200px is what the width is
actually *for*. Recorded in [`apps/game/DESIGN.md`](../../apps/game/DESIGN.md),
where the rules that fell out of the ceiling are worth more than the ceiling.

Two more before it: the i18n layer learning what a count does to a sentence — a
scoreline that read "1 POINTS" in both languages was the visible half — and the
settings moving into the host's footer, reachable for as long as the game runs.
The second came with the rule underneath it, `reshapesRound`: three settings the
round in play is built on, refused by the server until it ends. Both are the
same lesson as the typed rework, that what is *wrong* surfaces by playing.

One came from a question rather than from a room: *what happens if a second
browser opens the host URL?* Two tabs of one profile are both let in on
purpose — it is what lets a socket be torn down and reopened without the room
noticing — and nothing below that ever asked how many consoles were left.
Closing one froze the round for the other, opening one rewound its clock, and a
browser refused at the door kept a seat it had never been given.
`second-console.test.ts` is the suite that did not exist, and the lesson runs
the other way from the ones above: a rule written for *the* host breaks the day
there are two of them.

The same question asked once more — *and which of the two owns the room?* — is
what closed the last open decision in [`backlog/`](backlog/README.md). A room now
mints a token for the screen that opened it, and a claim carrying it beats
whatever is connected; without one, a second console waits out a minute's grace
before the code alone is enough. What that session is worth remembering for is
where it was caught: the token was first kept on the host seat, everything was
green, and it took *driving two consoles in a browser* to see that the refusal
which displaces a console also voids the seat — so being taken over deleted the
one thing that could undo it.

Expect more of this than of stages. The plans cover what is missing; what is
*wrong* surfaces by playing.

The first playtest with somebody who had not built it — 14 August 2026, two
people, an iPhone and a laptop — produced thirteen notes in one evening, which
is more than any stage has. They were diagnosed and split into nine sessions in
[`backlog/`](backlog/README.md), and **all nine landed on 15 August 2026**.

What that day is worth remembering for is how much of it the diagnosis got
wrong, and in which direction:

- **Two of the three "faults" in the bank were not faults.** `Brasil` is the
  Portuguese word the question asks for and `Thwimps` is what tiny Thwomps are
  called; the audit that reported them was measuring a near miss. The real fault
  was one layer down and far larger — the *matcher* was forgiving its way onto
  the answer a question called wrong, on ninety numeric rows and two hundred
  spelling quizzes.
- **The browser pass caught what no build could, three times**: a caption folded
  onto itself by a `letter-spacing` inherited as a computed length, every
  nickname on the phone's final board printed as one letter, and a console that
  reloads mid-round playing the rest of the game in silence — that last one
  *visually identical* to a round that plays.
- **The e2e caught the one thing the browser pass could not**: a name appearing
  in two lists at once, which reads fine and breaks a locator.

Expect the same ratio next time. A note from a room is evidence that something
is wrong; it is rarely evidence of what.

**The second playtest — 16 August 2026, on Android — proved that in one
evening.** Eight notes, diagnosed into one entry each in
[`backlog/`](backlog/README.md), and **two of the eight were reports of things that
already work**: the speed bonus [shipped the day
before](backlog/speed-pays-by-rank.md) is wired into
every simultaneous round, and a seated host is still sent the clip it thinks it
is being denied. In both cases something *is* wrong — the bonus is on no screen
the room looks at, and the console cannot say why it failed to arm — but neither
is the thing the note named. The second one was sent the wrong way by this
repository's own documentation, which said the server "stops sending the track"
to a seated host when it withholds only the title and artist.

## Beyond the blind test

This game is the first of several. [`docs/game-catalogue.md`](../game-catalogue.md)
holds the candidates, the five shapes they fall into, and — more usefully — the
seams in the current code that should stay open, with the honest cost of each.
It is a map, not a stage: nothing there is scheduled, and the blind test ships
whole first.

## The shape of a stage

Every plan states its goal, the protocol changes it needs, the files it touches,
the decisions left open for the session, and — most importantly — **how to tell
it is done**. That last section is the contract: a stage is finished when its
criteria are demonstrated, in a browser where the change is visible, not when
the code compiles.

## Conventions that apply to every stage

- `pnpm validate` before declaring anything working
- A new rule in `packages/core` arrives with a test, and the test is broken on
  purpose once to prove it can fail
- A UI change is verified by driving the real app. Note what
  [06](06-testing.md) deliberately did *not* buy: no component runner exists
  here, so a claim about a single screen still rests on a browser pass
- A stage leaves no message unserved. The `not_implemented` code that used to
  cover one is gone — see [`../realtime-protocol.md`](../realtime-protocol.md)
