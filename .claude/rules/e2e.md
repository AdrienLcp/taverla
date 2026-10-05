---
description: Playwright journeys — build first, three specs and no fourth, where the two paths resolve from
paths:
  - "e2e/**"
---

# The end-to-end journeys

## Build before running them

Playwright serves the server through `wrangler dev`, so the Worker itself is
rebuilt from source on every run — but its static assets are `apps/game/dist`,
which `wrangler dev` refuses to start without, and the app the journeys drive
comes from Vite. `pnpm validate` builds first, which is the reason to prefer it.
Each run gets a fresh `--persist-to` directory, so no room from a previous run
still holds its code.

## Three journeys, and no fourth

`full-game.spec.ts` plays a whole buzzer game across two browser contexts,
`everyone-answers.spec.ts` puts two players on the same clip in a simultaneous
round, and `dead-socket.spec.ts` covers the screen a dead socket leaves behind.
The second earns its place because the two shapes are opposites — one player
taking the floor against everyone writing at once — and no socket suite can
stand in for two browsers, two forms and a screen that has to end up showing
both answers. They run on ports of their own against `support/deezer-stub.ts`,
so neither the dev server nor today's charts can turn them red.

**One journey per door**, which is how the room-first flow got covered without a
fourth: the buzzer game goes through the front page and picks its game on the
console, the simultaneous one goes through a game's own page. Both pages carry a
**"Open a table"** — clicking before the navigation lands opens a room with no
game, and that failure surfaces a minute later at a launch that stays greyed
out, so the landing is awaited between the two clicks.

Playwright is the slowest tool available. Before adding a fourth spec, ask what
it covers that a socket test cannot; the answer is usually "nothing".

## Two specs that are not journeys

`choice-fits.spec.ts` plays nothing: it answers the player's socket in
the page (`page.routeWebSocket`) with a snapshot built in the spec, so the
question on screen is the bank row under test, and measures the choice screen
— a player's and a seated host's — at sixteen viewports: no scroll, every tile inside the viewport, nothing under
the 14px floor — and the player's buzzer screens the same way, the reflex
race's included. It measures every other stage of the room's console too, from
900px wide — the reveal, the countdown, the verdict, the final board, the
slate's two stages and the reflex race's wait, flip and finishing order: no
scroll, and no row drawn past the list that holds it nor squeezed narrower than
its own contents — a size container keeps its overflow off the page, so a
scroll check alone never sees a chip under the hold bar, nor a board drawn 0px
wide. A geometry claim, for the same reason as the one below.

It runs under `reducedMotion: 'reduce'`. Every page arrives on `page-enter`,
8px low for 260ms, and the first viewport is measured inside that window: a
slow CI runner caught a full-height page one or two pixels under the fold, a
failure Windows never reproduced. A transform still counts as overflow, which is
also why `#root` clips its block axis.

`strip-rows.spec.ts` plays nothing either. It opens one room, walks every game in both
locales, and asserts that no choice strip ever holds rows of two different
lengths — the defect where a wrap leaves a short row, `flex: 1` stretches it,
and an unselected stamp ends up wearing the shape of a selected one.

It is the answer to the question above rather than an exception to it: the
stacking widths in `_strip.sass`'s call sites are **measured numbers**, a
dictionary edit moves them, and geometry is the one thing no socket test has an
opinion about. It cost 21 seconds when it was written.

It sweeps the **strip's own box**, not the viewport — one `page.evaluate` per
game instead of eighty resizes — and starts each strip at the width the layout
hands it at 320px, so it never reports a band no screen can reach. The box is
the nearest ancestor with `container-type: inline-size`, because the playlist
picker's two grids take their column count from the picker and not from
themselves.

Its floor, `STRIPS_EXPECTED`, is the guard that matters: a sweep that stopped
finding controls reports exactly what a console with nothing wrong reports.

## Locators are roles and accessible names

Gathered in `support/locators.ts` — never a `data-testid` — and shaped **by
screen**, which is how a spec reads. Two members of `hostConsole` have started
to diverge: `answer` and `verdictBoth` are the blind test's, not the room's. The
split, when it comes, follows the seam the domain already has —
`support/locators/room.ts` beside `support/locators/blindtest.ts`, so a spec
composes `hostConsole(page)` with `blindTestHost(page)`. **The trigger is the
third case**: the quiz bringing its own, or the first locator only the buzzer
can use. Not the second.

Everything Playwright owns lives here, config included, so `ls e2e` answers
"which journeys exist?" and nothing else.

## Two paths resolve from two different places

`webServer.cwd` defaults to the **config's** directory, so the stub is started as
`support/deezer-stub.ts`. `outputDir` defaults from the **process's** working
directory instead, so traces land in `test-results` at the repository root —
which is where CI collects them, and why moving the config did not move them.

**`pnpm build` does not type-check `e2e/`.** It is `pnpm -r build`, per package,
and the root `tsconfig.json` includes only `apps/**/*` and `packages/**/*` — so
the only thing that reads a locator file is the `tsc --noEmit -p e2e` bolted to
the front of `test:e2e`. That is accepted rather than overlooked: it runs before
Playwright starts and costs about a second.
