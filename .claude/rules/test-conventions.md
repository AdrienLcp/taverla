# Tests

Vitest, in plain Node. `pnpm test` runs `protocol`, `core` and `server`.

## Where the tests are, and why they are there

`packages/protocol` and `packages/core` are pure by construction — no browser,
no network, no server — so their suites finish in under a second and are the
right place for a red-green loop (`pnpm test:core:watch`).

That is also where the rules that matter live. Test the **rule**, not the
plumbing around it: the anti-cheat strip, the buzz shape, the clock estimator,
the ranking, the room-code alphabet. A test over a function that only forwards
its argument restates the code and gets in the way of the next refactor.

## Every test has a bracketed tag

```ts
it('[clock] recovers a known offset from a symmetric round trip', …)
```

Tags make a targeted run possible: `pnpm test -- -t "[clock]"`.

## A test you have not seen fail is not a test

Before considering one done, **break the code on purpose and watch it fail for
the right reason**. The anti-cheat test earns its place because removing the
schema strip turns it red with `expected … not to contain 'Daft Punk'`; a test
that stays green under a mutation is an assertion, not a test.

Write the failing test **first** for a bug fix, always: it costs nothing — you
were going to reproduce the bug anyway — and it proves you found the cause
rather than a coincidence.

## Derive the fixture from the answer

`clock-sync.test.ts` builds its samples from a known offset and round trip
rather than hard-coding the numbers the implementation happens to produce. A
fixture computed the same way as the code under test cannot disagree with it.

The mirror of that rule: **never compute an expected UI string from the same
source the component reads.** Spell the literal out.

## UI is verified in a browser, not asserted into existence

A type-check and a green build say nothing about whether a screen works. Any
change to what a user sees is verified by driving the real app — see
`CLAUDE.md`. Component and end-to-end tests arrive with the stage that adds
them (`docs/plans/`); until then the browser pass is the coverage, and saying a
UI change is done without one is the lapse.
