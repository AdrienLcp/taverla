---
description: Bracketed tags, the mutation check, the one socket harness, what deserves a test
paths:
  - "**/*.test.ts"
  - "apps/server/src/__tests__/**"
---

# Tests

## Test the rule, not the plumbing

`packages/protocol` and `packages/core` are pure by construction, so their
suites finish in under a second and are the right place for a red-green loop
(`pnpm test:core:watch`). That is also where the rules that matter live: the
anti-cheat strip, the buzz shape, the clock estimator, the ranking, the
room-code alphabet. A test over a function that only forwards its argument
restates the code and gets in the way of the next refactor.

Where a component holds a *decision*, move it into `packages/core` and test it
there, as `findBuzzBlocker` and `buildScoreboard` already are. What a browser
has to answer for instead is in
[`../../docs/browser-driving.md`](../../docs/browser-driving.md).

## Every test carries a bracketed tag

```ts
it('[clock] recovers a known offset from a symmetric round trip', …)
```

Tags make a targeted run possible — but `-t` is a **regex**, so pass the tag
without its brackets: `pnpm test -- -t "clock"` matches, while `-t "[room-code]"`
is a character class with an out-of-order range and vitest refuses to start.

## A test you have not seen fail is not a test

Before considering one done, **break the code on purpose and watch it fail for
the right reason**. The anti-cheat test earns its place because removing the
schema strip turns it red with `expected … not to contain 'Daft Punk'`; a test
that stays green under a mutation is an assertion.

Write the failing test **first** for a bug fix, always: it costs nothing — you
were going to reproduce the bug anyway — and it proves you found the cause
rather than a coincidence.

## Derive the fixture from the answer

`clock-sync.test.ts` builds its samples from a known offset and round trip
rather than hard-coding the numbers the implementation happens to produce. A
fixture computed the same way as the code under test cannot disagree with it.

The mirror of that rule: **never compute an expected UI string from the same
source the component reads.** Spell the literal out.

## The socket suites share one harness

`apps/server/src/__tests__/room-harness.ts` boots the app on an ephemeral port
and hands back `connect`, `openRoom`, `seat` and `stop`. A new suite is a file
with the two-line `vi.mock` of the music client and its tests — never a second
copy of the plumbing. `openRoom` takes the whole `RoomSettings` and creates the
room for `settings.game.kind`, so a suite for another game is a fixture rather
than a second harness: `buzzer-game.test.ts` is one file and no plumbing, and
`quiz-game.test.ts` stubs `question-bank` the way the others stub the music
client, which also keeps eighteen hundred questions from being parsed on every
run.

`CATALOGUE` and `QUESTIONS` live in the harness because the anti-cheat assertion
searches raw frames for those exact strings, and a per-file copy that drifted
would still pass. That assertion is over **the whole round's transcript**, not
the latest view: a leak in any frame is a leak, and a later frame tidying it
away proves nothing.
