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
| [06 — Testing](06-testing.md) | next | Server socket tests, component tests, Playwright end-to-end |
| [07 — Language & appearance](07-i18n.md) | **done** | English and French, light and dark, the corner menu |
| [08 — Deploy](08-deploy.md) | **done** | One origin serving both, somewhere friends can reach |
| [09 — Answer modes](09-answer-modes.md) | | Four choices or a typed answer, everyone at once, scored by speed |
| [10 — Per-device audio](10-per-device-audio.md) | | A host switch so every phone plays the clip itself |

## Order, and what can move

01 → 02 → 03 → 04 is a real dependency chain: each needs the protocol and server
behaviour the previous one adds. 05 through 08 are independent of each other and
can be taken in any order once 04 lands — though running the design pass before
the screens exist wastes it.

09 and 10 are the first stages added after the game shipped, from playing it
rather than from planning it. 09 is much the larger: it is the first thing that
breaks the assumption that exactly one player acts at a time.

07 was taken first, out of order and deliberately: routing strings and colours
through a layer costs an afternoon before a design pass and a rewrite after one.
Everything built from here reads its strings from
`presentation/i18n/` and its colours from `--tokens`, in both themes.

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
