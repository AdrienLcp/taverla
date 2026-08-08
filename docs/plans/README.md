# The staged build

One file per stage, each scoped to a single session. Read the stage's plan
before starting, and update it when reality diverges — a plan that no longer
describes the code is worse than no plan.

| Stage | State | What it delivers |
|---|---|---|
| [00 — Bootstrap](00-bootstrap.md) | **done** | Contract, server, lobby, QR, join, live roster, clock sync |
| [01 — Round engine](01-round-engine.md) | next | The server actually runs a round: pool, countdown, buzz, verdict, reveal |
| [02 — Host console](02-host-console.md) | | Playlist picker, synchronised audio, the judging UI |
| [03 — Player round](03-player-round.md) | | Countdown, a live buzzer, lockout, honest feedback |
| [04 — Reveal & scoreboard](04-reveal-scoreboard.md) | | Reveal screen, running scores, end of game |
| [05 — Design pass](05-design-pass.md) | | `/impeccable`: a visual world, motion, the real polish |
| [06 — Testing](06-testing.md) | | Server socket tests, component tests, Playwright end-to-end |
| [07 — French UI](07-i18n.md) | | An i18n layer, then French — a product decision, not a default |
| [08 — Deploy](08-deploy.md) | | One origin serving both, somewhere friends can reach |

## Order, and what can move

01 → 02 → 03 → 04 is a real dependency chain: each needs the protocol and server
behaviour the previous one adds. 05 through 08 are independent of each other and
can be taken in any order once 04 lands — though running the design pass before
the screens exist wastes it.

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
