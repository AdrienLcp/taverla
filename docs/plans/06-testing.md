# Stage 06 — Tests worth having

**Goal.** Cover the three things that would actually break the game, and stop
there.

**Depends on** stages 01–04. Independent of 05, 07, 08.

`packages/protocol` and `packages/core` are already covered — 49 tests over the
rules that matter. What is missing is everything with I/O.

## What deserves a test here

**The socket handler, against a real server.** Boot the Hono app on an ephemeral
port and drive it with the browser's `WebSocket` (Node has it globally). This is
where the game's actual guarantees live, and none of them are covered:

- two buzzes in the same tick produce exactly one `activeBuzz`
- a host frame from a player socket is refused
- a reload reclaims the same seat and score
- **no player frame ever contains a title, artist or preview URL before the
  reveal** — assert over the whole recorded transcript of a full game, not one
  frame. This is the highest-value test in the repo.

Stage 00 has a throwaway version of this driver in the session scratchpad;
rewrite it as a Vitest suite rather than resurrecting it.

**The clock, under a skewed clock.** `estimateClockOffset` is unit-tested, but
the loop that feeds it is not. Fake a client whose `Date.now()` is four seconds
off and assert the countdown still lands.

**One end-to-end journey, in Playwright.** Two browser contexts — one host, one
player — through create → scan → join → buzz → judge → reveal → score. One
journey, not a suite: it is the slowest tool available and it should only cover
what nothing cheaper can.

Follow the selector discipline that works: roles and accessible names, never
`data-testid`, and locators in a companion file rather than inline in the spec.

## What does not deserve one

Components whose whole job is to render a prop. A test that renders
`<Button>Join</Button>` and asserts the text says "Join" restates the code and
gets in the way of the next refactor. If a component has a *decision* in it —
`findBuzzBlocker` choosing a label, the nickname form gating on a trimmed
value — test the decision, ideally by pulling it into `packages/core` first.

## The rule that makes any of this worth doing

**Break each new test on purpose once and watch it fail for the right reason.**
The anti-cheat test in `packages/protocol` earns its place because removing the
schema strip turns it red with `expected … not to contain 'Daft Punk'`. A test
that stays green under a mutation is an assertion, not a test.

## Done when

- `pnpm test` covers the socket handler end to end
- The transcript assertion runs over a full simulated game
- One Playwright journey passes against `pnpm dev`
- Every new test has been seen to fail
- `pnpm validate` runs the lot

## Out of scope

Coverage thresholds, visual regression, load testing. Twenty-four players in a
living room is not a scale problem.
