# Tests

Vitest in plain Node for the rules and the sockets, Playwright for the two
journeys. `pnpm test` runs `protocol`, `core` and `server`; `pnpm test:e2e`
runs the journeys; `pnpm validate` runs the lot.

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

Tags make a targeted run possible — but `-t` is a **regex**, so pass the tag
without its brackets: `pnpm test -- -t "clock"` matches, while `-t "[room-code]"`
is a character class with an out-of-order range and vitest refuses to start.

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

## The socket suites share one harness

`apps/server/src/__tests__/room-harness.ts` boots the app on an ephemeral port
and hands back `connect`, `openRoom`, `seat` and `stop`. A new suite is a file
with the two-line `vi.mock` of the music client and its tests — never a second
copy of the plumbing, and never a second catalogue, because the anti-cheat
assertion searches raw frames for those exact strings.

`openRoom` takes the whole `RoomSettings` and creates the room for
`settings.game.kind`, so a suite for another game is a fixture rather than a
second harness — `buzzer-game.test.ts` is one file and no plumbing.

## Three journeys, and no fourth

`e2e/` holds them: a whole buzzer game across two browser contexts, two phones
answering over the same clip in a simultaneous one, and the screen a dead socket
leaves behind. The third earns its place because the two shapes are opposites —
one player taking the floor against everyone writing at once — and neither is a
rule a socket suite could stand in for: it is two browsers, two forms, and a
screen that has to end up showing both answers. They run on ports of their own against
`e2e/support/deezer-stub.ts`, so neither the dev server nor today's charts can
turn them red. Locators are roles and accessible names, gathered in
`e2e/support/locators.ts` — never a `data-testid`.

**Everything Playwright owns lives in `e2e/`**, config included: `ls e2e`
answers "which journeys exist?" and nothing else, and `support/` holds the two
files that are not tests — the stub is a fake upstream service, not a spec.

Two paths resolve from two different places, and guessing gets one of them
wrong. `webServer.cwd` defaults to the **config's** directory, so the stub is
started as `support/deezer-stub.ts` and not `e2e/support/deezer-stub.ts`.
`outputDir` defaults from the **process's** working directory instead, so traces
still land in `test-results` at the repository root — which is where CI collects
them, and why moving the config did not move them.

**`pnpm build` does not type-check `e2e/`.** It is `pnpm -r build`, per package,
and the root `tsconfig.json` includes only `apps/**/*` and `packages/**/*` — so
the only thing that reads a locator file is the `tsc --noEmit -p e2e` bolted to
the front of `test:e2e`. That is accepted rather than overlooked: it runs before
Playwright starts and costs about a second, and `pnpm validate` runs the lot.
Closing it is one line — `"build": "pnpm -r build && tsc --noEmit -p e2e"` — for
the day a type error in `support/` gets through a bare `pnpm build`.

**The locators are shaped by screen**, which is how a spec reads, and the buzzer
shipped without changing that. Two members of `hostConsole` have started to
diverge — `answer` and `verdictBoth` are the blind test's, not the room's, where
`buzzerMode` is a room setting the game narrows. The split, when it comes,
follows the seam the domain already has: `support/locators/room.ts` beside
`support/locators/blindtest.ts`, so a spec composes `hostConsole(page)` with
`blindTestHost(page)`. **The trigger is the third case**, same threshold
`CLAUDE.md` sets for the `mode` axis — the quiz bringing its own, or the first
locator only the buzzer can use. Not the second.

**Build before running them.** Playwright starts the server with
`pnpm --filter @taverla/server start`, which is `node dist/index.mjs` — the
bundle, not the sources the app is served from. A `pnpm test:e2e` after a server
or protocol edit therefore runs yesterday's server against today's client, and a
`PROTOCOL_VERSION` bump turns every journey red at once with a refusal that has
nothing to do with what they assert. `pnpm validate` builds first, which is the
reason to prefer it.

Playwright is the slowest tool available. Before adding a third spec, ask what
it covers that a socket test cannot; the answer is usually "nothing".

## Mute the browser before you drive it

**Every browser session opened to verify something here starts at volume 0.**
This repo's host console plays music, the stored volume defaults to 80%, and it
survives across sessions in `localStorage` — so a page that merely *reaches* a
round makes noise on whatever machine is running the dev server, which is
somebody's flat.

Write the muted value **before** the first navigation rather than dragging the
slider afterwards, because by then the clip has already played:

```ts
await context.addInitScript(() => {
  localStorage.setItem('taverla:volume', '0')
})
```

Raise it to 5% at most, and only when the audio itself is what is being tested —
the countdown landing on the first note, a buzz pausing the clip, a reload
seeking back into a round.

## UI is still verified in a browser

There is **no component runner in this repo** — no jsdom, no testing-library —
and stage 06 left it out on purpose (`docs/plans/06-testing.md`). A type-check
and a green build say nothing about whether a screen works, and neither does a
journey that never opens the screen you changed. Any change to what a user sees
is verified by driving the real app — see `CLAUDE.md`. Saying a UI change is
done without one is the lapse.

Where a component holds a *decision*, move it into `packages/core` and test it
there, as `findBuzzBlocker` and `buildScoreboard` already are.
