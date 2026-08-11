# The staged build

One file per stage, each scoped to a single session. Read the stage's plan
before starting, and update it when reality diverges — a plan that no longer
describes the code is worse than no plan.

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
| [11 — The second game](11-quiz.md) | **in progress** | The seam between the shelf and one game on it, then a quiz through it |

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
hat on. That half has landed; the quiz itself has not.

07 was taken first, out of order and deliberately: routing strings and colours
through a layer costs an afternoon before a design pass and a rewrite after one.
Everything built from here reads its strings from
`presentation/i18n/` and its colours from `--tokens`, in both themes.

## Work that is not a stage

Playing the game produced a round of shell revision that belongs to no stage:
the corner menu replacing the preferences footer, the recovery screen a dead
socket now shows, desktop layouts for the two screens that were still phone
shaped, the room-code copy, a design pass on the form controls, and the lobby
controls for the three settings the protocol always carried. It is
recorded where it will be read — [`apps/game/DESIGN.md`](../../apps/game/DESIGN.md)
for the materials and the icon family,
[`.claude/rules/react-components.md`](../../.claude/rules/react-components.md)
for the rules that came out of it, and the changelog for the list.

The typed mode's rework is the largest of these so far, and it came from the
same place: one field instead of two, as many guesses as the clip allows, and a
matcher that finds each half *inside* a line. Two fields asked a player to know
which half they were holding before they could say it, and one guess per round
made a near-miss the end of it. None of that was visible until a room typed into
it.

Expect more of this than of stages. The plans cover what is missing; what is
*wrong* surfaces by playing.

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
- A UI change is verified by driving the real app
- `not_implemented` shrinks; if a stage leaves a message unserved, say so here
