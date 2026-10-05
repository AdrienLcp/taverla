# Stage 28 — One Durable Object per room

**In progress — session A done (2026-10-03).** Three sessions, A → B → C, each
ending on a green tree. Render keeps serving until session C says otherwise.

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

## The question bank stays bundled — measured

**The bank is 5.8 MB of JSON** (928 KB gzipped), parsed and validated at module
scope, so it is paid in the isolate's **startup**, never in a request. Measured
on the deployed Worker on 2026-10-05 with `wrangler tail` over four quiz rooms
opened and started from a script:

| What | CPU | Free plan limit |
|---|---|---|
| Startup, with the bank parsed (`wrangler deploy`) | 98 ms | 1 s |
| `POST /api/rooms` on a cold isolate | 10 ms | 10 ms |
| `POST /api/rooms`, warm | 1–5 ms | 10 ms |
| The room object's `open` | 1–3 ms | — |
| `host.startRound` in a quiz room, the draw included | 4–6 ms | — |

So D1 is not needed. The one number at the line is the cold room creation, and
the bank is not in it: it is the Worker's own first request. Revisit if the
startup figure, which grows with the bank, nears the second, or if a cold
creation starts failing with `exceeded CPU`.

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

**Done, and where it diverged:**

- The deadlines are **derived, not stored**. Every one of them was already a
  field of the room (`startsAt`, `runningSince` + `elapsedMs`, `expiresAt`,
  `advancesAt`, `disconnectedAt`, `lastActivityAt`), so
  `domain/room/room-deadlines.ts` reads them off and the engine's single
  `wakeAt` port is aimed at the earliest after every change. No timer state
  exists to persist, and `round-timers.ts` is gone. In the object, `wakeAt` is
  `ctx.storage.setAlarm` and `alarm()` is `wakeRoom`.
- **The host-away freeze is a rule of the derivation**: no round deadline is
  due while no console is attached. `holdRoundWhileHostIsAway` only freezes the
  clock now.
- `isDrawing` lives on the engine and is not persisted; while it is set the
  reveal's hold is not due, and `beginRound` spends `advancesAt` up front —
  otherwise a derived deadline already in the past re-fires on every wake.
- The room's expiry now counts from the **last socket leaving** (a close
  touches the room). With the old one-minute sweep it counted from the last
  frame, so a host idle in the lobby for a quarter of an hour lost the room on
  reload whenever the sweep fell in between.
- Every state change ends in `publishRoom` (broadcast, persist, re-aim the
  wake); the socket handler's functions are module-level and take the engine,
  so session B can call them from `webSocketMessage` with the connection read
  from the socket's attachment rather than from a closure.
- Left for B: `forgetSeat` mutates `connection.playerId`, which in the object
  must write the attachment back; `routes.ts` imports the in-process adapter
  directly (`openRoomInProcess`, `findRoomEngine`) and becomes a call to the
  object's stub; `room-view.ts` still reads `nowMs()` rather than the engine's
  clock; wall pairing is still a module-global map.
- Tests: `room-engine.test.ts` restores a snapshot mid-countdown, mid-floor and
  mid-hold and fires each on time; `in-process-rooms.test.ts` keeps the
  code-uniqueness check `room-store` used to own. The 18 socket suites and the
  harness did not change.

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
- Measure the question bank, and settle it — see *The question bank stays bundled*.
- Deploy to `taverla.<account>.workers.dev` by hand, play a room from two
  screens, muted.

**Progress so far:**

- `RoomObject` and `WallPairingObject` are written; `worker.ts` is the Worker
  entry, and `routes.ts` takes a `RoomDoor` and a `WallPairings` port so the Node
  and Worker entries share it. Seat identity rides the socket attachment and is
  rewritten on every `persist`.
- The runtime throws on `send()` or `close()` to a closed socket where `ws`
  dropped it, and a client's ping can land after the room closed it — the
  object only sends and closes while the socket is open.
- e2e run on `wrangler dev`, each run with a state directory of its own: 4/4.
- **The question bank stays bundled**: the deployed Worker reports a 71 ms
  startup with it, against a 1 s limit (Node: ~35 ms JSON, ~50 ms Zod cold).
- Deployed by hand to `taverla.adrienlcp.workers.dev`; a two-screen buzzer game
  played there muted, reload of the console included.
- **The socket suites stay on Node.** `@cloudflare/vitest-pool-workers` 0.22
  peers on vitest 4 and this repo is on 5. They exercise the engine, which is
  the code the object runs; what only the object holds — attachments, storage,
  the alarm — is `worker-object.test.ts`, which boots the Worker through
  `unstable_startWorker` and restarts the runtime mid-room. That eviction is
  harder than hibernation, since the sockets go too: the room, a seat's score
  and a pending countdown all come back. Move the 18 suites over the day the
  pool supports vitest 5; `harnessAt` already takes any origin.

— cut here: the Worker serves a full game on workers.dev, `pnpm validate` green, Render still the address —

## Session C — cutover

- CI deploys on `main` with `wrangler deploy` (secrets through the
  `cloudflare-pages` skill: `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`).
- Remove the Node adapter, `ws`, `@hono/node-server`, `hono-rate-limiter`,
  `static-site.ts`'s `node:fs` path and `render.yaml`.
- Rewrite what describes the old host: [08](08-deploy.md)'s *live at*,
  `CLAUDE.md`'s commands and ports, `docs/browser-driving.md`.
- Suspend the Render service only once Adrien has played an evening on the
  Worker; deleting it is his call. He played it and asked: deleted.

**Done, and where it diverged:**

- `deploy` in `ci.yaml` runs after `validate` on a push to `main`, one at a
  time and never cancelled, and stamps the commit with
  `--var GIT_COMMIT:…` — `/api/health`'s `build` read `RENDER_GIT_COMMIT`
  before. The token is the account-wide one in the password vault (`Cloudflare Pages
  token`): its Pages name undersells it, a throwaway script proved it can write
  Workers.
- **The Node adapter stays, as the socket suites' server.** Their `vi.mock` of
  the music client and the question bank only reaches code in the test's own
  process, so `infrastructure/node/` — `node-app.ts`, the in-process rooms and
  pairings, and an in-process stand-in for the rate-limit binding — keeps
  running them. `@hono/node-server` and `ws` are devDependencies; nothing
  deploys them. What went: `index.ts`, `tsdown`, `static-site.ts`,
  `hono-rate-limiter`, `render.yaml`, the Dockerfile and its CI job,
  `.env.preview`, and `PORT` / `SERVE_GAME_FROM` in `env.ts`.
- `limitRoomCreationWith(limiter)` is the one middleware for both: the Worker
  hands it `env.ROOM_CREATION_LIMITER`, the Node app a counter.
- The server's `build` type-checks both tsconfigs and runs
  `wrangler deploy --dry-run`, so the Worker is type-checked and bundled on
  every CI run — before this nothing type-checked `worker.ts`. That dry-run
  reads `apps/game/dist`, so `@taverla/game` is a devDependency of the server
  purely to order `pnpm -r build`.
- `pnpm dev` is `wrangler dev` on 3100; a room survives a reload of it.
  Lighthouse runs against it too.
- The canonical origin (`index.html`, `llms.txt`) moved to
  `taverla.adrienlcp.workers.dev`.
