# Stage 06 — Tests worth having

**Goal.** Cover the three things that would actually break the game, and stop
there.

**Depends on** stages 01–04. Independent of 05, 07, 08. **Done.**

## What it delivers

**The socket handler, against a real server.** `apps/server/src/__tests__/`
boots the Hono app on an ephemeral port and drives it with the browser's
`WebSocket`. `room-harness.ts` owns the plumbing — the server, the peers, the
catalogue stub, `waitFor` — so a new suite is a file with a `vi.mock` and its
tests. `round-flow.test.ts` plays whole games; `socket-rules.test.ts` covers the
rules that hold whatever game is running:

- two buzzes in the same tick produce exactly one `activeBuzz`
- a host action arriving on a player socket is refused, non-fatally
- a socket whose first frame is not a `hello` is hung up on, and so is a host
  pointed at a room nobody holds — the seam the client's `refused` state needs
- a reloading player reclaims the same seat, the same id and the same score
- **no player frame contains a title, artist or preview URL before the reveal**,
  asserted over the whole recorded transcript rather than one frame

**The clock, under a skewed clock.** `[clock] lands the countdown on a device
four seconds ahead of the server` runs the real ping/pong handshake over a
socket, feeds `estimateClockOffset` the samples it produces, and schedules
against `audioStartsAt`. The last assertion is the failure it prevents: with no
estimate the same device computes a wait of zero and starts the clip early.

**Two end-to-end journeys, in Playwright.** `e2e/full-game.spec.ts` runs two
browser contexts — the big screen and a phone — through create → scan the join
URL → join → buzz → judge → reveal → score, and checks the title the host judged
is the title the phone was shown. `e2e/dead-socket.spec.ts` points a host at a
room nobody holds and asserts the console is *replaced* by a reason and a way
out, rather than annotated.

The journeys run on their own ports (`5274`, `3101`, `3199`) so they never
borrow — or evict — a dev server, and against `e2e/support/deezer-stub.ts`
rather than the real catalogue, reached through the `DEEZER_API_URL` seam.
Nothing about what is charting today can turn them red.

Selectors are roles and accessible names, in `e2e/support/locators.ts`. Two
reach for a class because the text they point at is prose with no role of its
own.

## What it deliberately leaves out

Components in isolation. A test that renders `<Button>Join</Button>` and asserts
the text says "Join" restates the code and gets in the way of the next refactor.
Where a component holds a *decision* it belongs in `packages/core` first —
`findBuzzBlocker` and `buildScoreboard` are already there, with tests.

There is therefore no jsdom, no `@testing-library/react` and no component
runner in this repo, and adding one should be argued for by a decision that
genuinely cannot move into `core`.

## Notes for whoever adds the next test

- `vitest -t "[room-code]"` is a **regex**: `[room-code]` is a character class
  with an out-of-order range and vitest refuses to start. Drop the brackets —
  `-t "room-code"` still matches the tagged title.
- The e2e server runs `pnpm --filter @taverla/server start`, not `dev`: the
  `tsx watch` wrapper never comes up when Playwright spawns it detached.
- Playwright's readiness probe resolves `localhost` to `::1` and does not fall
  back, while the Node server binds IPv4 — hence `127.0.0.1` throughout
  `e2e/playwright.config.ts`.

## Done when

- [x] `pnpm test` covers the socket handler end to end
- [x] The transcript assertion runs over a full simulated game
- [x] Playwright journeys pass against the dev stack
- [x] Every new test has been seen to fail — the guard, the reclaim, the offset,
      the fatal close, the verdict and the refusal screen were each broken on
      purpose and watched
- [x] `pnpm validate` runs the lot

## Out of scope

Coverage thresholds, visual regression, load testing. Twenty-four players in a
living room is not a scale problem.
