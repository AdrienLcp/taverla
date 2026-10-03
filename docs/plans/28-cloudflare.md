# Stage 28 — One Durable Object per room

**To do.** Three sessions, A → B → C, each ending on a green tree. Render keeps
serving until session C says otherwise.

## Why

Render's free instance, as deployed by [08](08-deploy.md), costs three things
the game pays for at the table:

1. It sleeps after ~15 minutes idle, so the first room of the evening waits
   ~50 s for a cold start.
2. Rooms live in a `Map` in one process (`domain/room/room-store.ts`), so a
   redeploy or a restart ends every party in progress.
3. `numInstances: 1` is load-bearing (`render.yaml`), so the design can never
   scale out.

A room is already a closed world — its own code, its own sockets, its own
clock — which is exactly the unit a Durable Object is. One object per room
removes all three at once: no sleep, state in the object's own SQLite storage
across deploys, as many rooms as the account has. The free plan covers it: an
object holding its sockets for a three-hour party is ~1 350 GB-s against a
daily 13 000, and hibernation makes that smaller still.

Paying for an always-on Node instance was weighed and refused: it fixes the
sleep and nothing else. This should have been the hosting choice in 08; it was
not weighed then. The reference shape is `C:/git/scoreboard/apps/worker`
(one object per event, hibernating sockets, server clock, one Worker serving
the assets) — copy its layout rather than redesign it.

## Decisions taken

- **One Worker serving assets, not Pages + a Worker.** The QR code encodes
  `location.origin`, so both surfaces must stay on one origin (08's argument,
  unchanged). Workers static assets do that with
  `run_worker_first: ['/api/*', '/ws/*']`, as Scoreboard does. The
  prerendered documents of [19](19-locale-urls.md) become plain assets
  (`fr.html`, `en/…`) served by `html_handling`; `robots.txt` and
  `sitemap.xml` stay Worker routes because they read the origin.
- **`packages/protocol` and `packages/core` do not move.** Nothing in them
  touches Node. If a session finds itself editing one for the runtime, stop
  and say why in this file.
- **The Hibernation API, with alarms and a persisted snapshot.** A hibernated
  object loses its memory, timers included, so the room is written to storage
  after every accepted frame and every timer is a **deadline in the room**,
  not a closure. Rule 3 already makes the room a whole snapshot; `Room` holds
  `Map`s and `Set`s, which `ctx.storage.put` stores natively through
  structured clone — no codec to write.
- **One alarm per object.** `round-timers.ts`' four kinds (`advance`,
  `answer`, `countdown`, `round`) plus the room's own expiry and the seat
  sweep become deadlines; the alarm is set to the earliest, and `alarm()`
  runs whatever is due and re-arms. `room.ts` already computes a deadline
  before arming its `setTimeout`, so the deadlines exist — the work is
  storing them instead of closing over them.
- **Both sweepers disappear as loops.** `startRoomSweeper` and
  `startSeatSweeper` iterate every room every minute; an object only ever
  sees its own, so each becomes a deadline: *ten minutes with no socket* deletes
  the object's storage, *a seat nobody has been behind* releases it.
- **Codes stay unique without a registry.** `idFromName(code)`; the object's
  `create` refuses when it already holds a room, and `POST /api/rooms` retries
  with a new code, as `createRoom` already does in-process.
- **Wall pairing gets its own class**, `WallPairing`, keyed by pairing code:
  a pairing exists before any room does, so it cannot live in one.
  `forgetExpired` becomes the object's alarm at `WALL_PAIRING_TTL_MS`.
- **Rate limiting** moves from `hono-rate-limiter` (in-memory, one process) to
  the Workers Rate Limiting binding; `getConnInfo` becomes `CF-Connecting-IP`.
- **Configuration** comes from bindings, not `process.env`: `env.ts` keeps its
  Zod schema and parses the Worker's `env` instead.

## Open, to measure in session B

- **The question bank is 5.8 MB of JSON** (928 KB gzipped). It fits the
  bundle limit; whether parsing it on every cold isolate fits the free plan's
  CPU budget is not known. Measure a cold quiz room under `wrangler dev` and
  on the deployed Worker. If it does not fit, the bank moves to D1 and
  `drawQuestion` queries one category at a time — only quiz rooms pay, and
  only for the rows they draw.

## Session A — the room engine, still on Node

The refactor that carries the risk, done where every test already runs.
Nothing is deployed differently at the end of it.

- Turn the module-global maps keyed by room code — `room-store.ts`,
  `round-timers.ts`, `connection-registry.ts` — into **one engine per room**
  that receives its ports: a clock, a scheduler that takes deadlines, the
  room's connections, and a `persist(room)` hook. Module globals are the
  thing to remove, not to keep keyed: several Durable Object instances can
  share one isolate, and a map that outlives an evicted object is a stale room.
- A Node adapter owns the remaining `Map<RoomCode, Engine>` and the
  `setTimeout` scheduler, so `index.ts`, the harness and the 18 socket suites
  keep working unchanged.
- Rebuild the timers from the room's deadlines on load, and test that path:
  a room restored from a snapshot mid-countdown, mid-answer-window and with a
  hold running must fire on time. That test is what session B's hibernation
  leans on.

— cut here: engine extracted, `pnpm validate` green, Render deploy unchanged —

## Session B — the Worker, beside Render

- `apps/server` becomes a Worker: `wrangler.jsonc` (copy Scoreboard's,
  `new_sqlite_classes: ['RoomObject', 'WallPairing']`), Hono's Worker entry,
  `RoomObject` adapting the engine to `acceptWebSocket` /
  `webSocketMessage` / `webSocketClose`, seat identity in the socket's
  serialized attachment, alarms for the scheduler, `ctx.storage` for
  `persist`.
- The socket harness moves to `@cloudflare/vitest-pool-workers`, so the 18
  suites run against the real object in the Workers runtime. Change `room-harness.ts`, not
  the suites; if a suite has to change, the engine leaked a Node assumption.
- Add a hibernation test: evict the object between two frames and check the
  room, the seats and a pending deadline come back.
- e2e: `e2e/playwright.config.ts` starts `wrangler dev` instead of
  `pnpm --filter @taverla/server start`, on its own port; the Deezer stub
  stays.
- Measure the question bank (see *Open*), and settle it.
- Deploy to `taverla.<account>.workers.dev` by hand, play a room from two
  screens, muted.

— cut here: the Worker serves a full game on workers.dev, `pnpm validate` green, Render still the address —

## Session C — cutover

- CI deploys on `main` with `wrangler deploy` (secrets through the
  `cloudflare-pages` skill: `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`).
- Remove the Node adapter, `ws`, `@hono/node-server`, `hono-rate-limiter`,
  `static-site.ts`'s `node:fs` path and `render.yaml`.
- Rewrite what describes the old host: [08](08-deploy.md)'s *live at*,
  `CLAUDE.md`'s commands and ports, `docs/browser-driving.md`.
- Suspend the Render service only once Adrien has played an evening on the
  Worker; deleting it is his call.
