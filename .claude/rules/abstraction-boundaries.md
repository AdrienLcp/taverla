---
description: Which module may import which external library
paths:
  - "apps/**/src/**"
  - "apps/*/scripts/**"
  - "packages/**/src/**"
---

# Abstraction boundaries

**Abstract capabilities, not libraries.** The repository, the adapter wrapping
an SDK, the design-system component — each of those already IS the boundary
between the application and an external library. Do not stack a second, thinner
abstraction below it: no generic `httpClient.request()`, no neutral
`storage.get()`, no "message bus" under the socket. The second layer leaks the
library's shape anyway, the migration it promises never arrives, and its cost is
paid on every read of the code.

## Where an external library may be imported

| Library | The only module allowed to import it |
|---|---|
| Deezer (via `fetch`) | `apps/server/src/infrastructure/music/deezer-client.ts` |
| the question banks | `apps/server/src/infrastructure/questions/question-bank.ts` |
| `hyparquet` | `apps/server/scripts/polyfact-source.ts` — one upstream ships its half-million rows as parquet and nothing else here reads a byte of it |
| `hono`, `@hono/*` | `apps/server/src/infrastructure/http/`, `apps/server/src/worker.ts`, and `@hono/node-server` in `infrastructure/node/` |
| `cloudflare:workers` | `apps/server/src/worker.ts`, `apps/server/src/infrastructure/worker/` |
| `ws` | `apps/server/src/infrastructure/node/node-app.ts` — the Node process the socket suites run, which nothing deploys |
| `WebSocket` (browser) | `apps/game/src/infrastructure/messaging/use-room-socket.ts` |
| `hono/ws` (server) | `apps/server/src/infrastructure/messaging/` |
| `localStorage`, `sessionStorage` | `apps/game/src/infrastructure/storage/`: `session-storage.ts` (seats, host tokens) and `preferences-storage.ts` (locale, nickname, volume, host setup) through `@adrienlcp/safe-storage`, with `read-stored-with-schema.ts` for a blob a Zod schema must transform; `prepared-keys-storage.ts` (the slate's key, per tab) on `sessionStorage` directly, which the package does not cover. The theme is `@adrienlcp/theme-preference`'s own |
| `navigator`, `location`, `matchMedia`, feature detection | `apps/game/src/infrastructure/browser.ts` — `reloadPage()` included — plus `location.origin` in `router/navigation.ts` |
| the clipboard | `copyText` from `@adrienlcp/browser`, called only by `presentation/components/copy-button.tsx` — the package owns the `execCommand` fallback a host served from a LAN address over plain HTTP needs, since `navigator.clipboard` requires a secure context |
| the screen wake lock | `useScreenAwake` from `@adrienlcp/browser/react`, called by the host console, the player page and the wall — the package re-takes the lock on every `visibilitychange`. Each page holds it for as long as a game runs, lobby included, and lets go on an exit (a refusal, a finished board), never on a phase: a screen that sleeps through the lobby misses the countdown |
| `AudioContext`, `Audio` | `apps/game/src/features/host/round-audio.ts` for the clip's element, `apps/game/src/presentation/audio/buzz-cue.ts` for the synthesised buzz cue — two capabilities rather than one library, armed by the same press and refused the same way outside a gesture |
| `fetch` (browser) | `apps/game/src/infrastructure/api/taverla-api.ts` |
| `Date`, the wall clock | `infrastructure/clock.ts` in each app, through `nowMs()` |
| `console` in the browser | `apps/game/src/infrastructure/diagnostics.ts` |
| `process.env` | `apps/server/src/env.ts`; a flag is a function read when asked, never a constant fixed at module load, which a test cannot change |
| Making an id (`nanoid`) | `apps/server/src/infrastructure/ids.ts`, one function per kind of id owning its length — a secret is its own kind (`newWallSecret()`, `newHostToken()`). An id both apps mint lives in `packages/core`: `newSessionId()` in `room/session-id.ts`. The domain receives an id as an argument, the way it receives `now`. `crypto.randomUUID` is used nowhere: it exists only in a secure context, and a room tried over plain HTTP on a LAN address is not one |
| `Math.random` | `packages/core/src/helpers/random.ts` — `shuffled`, `pickRandom`, `randomIntBetween` — for a game's draw; secure randomness is `ids.ts`'s |
| `localeCompare`, `Intl.Collator` | `packages/core/src/helpers/collation.ts` — `compareText`, one constant locale, so every screen orders names alike whatever language it speaks |
| JSON a script reads — a file, a cache, a download | `apps/server/scripts/json-file.ts`: `readJsonFile(path, schema)` and `parseJson(text, schema)` return a `Result`, `orStop` ends the run on a failure; `withRetries` and `getJson` take the schema and parse through `jsonOf` |
| `crypto.getRandomValues` | `packages/core/src/room/random-code.ts` — `secureRandomIndex`, the rejection sampling that keeps a room code's alphabet uniform. A rule about the code's meaning, not an id library, so it stays in core and `ids.ts` calls it |
| `react-router` | `apps/game/src/infrastructure/router/`, plus `useNavigate` in `presentation/app-shell.tsx` — which hands it to react-aria's `RouterProvider`, so components navigate through the design system's `Link` and never import react-router themselves |
| `lucide-react` | `apps/game/src/presentation/components/icons.tsx` — every glyph leaves it already in the family's weight |
| `react-aria-components` | `apps/game/src/presentation/components/`, `presentation/i18n/i18n-provider.tsx` for `I18nProvider`, and a feature that genuinely needs a primitive the design system has not wrapped yet |

An import of one of these anywhere else is a design bug. Fix it by moving the
call behind the existing module, or by adding a missing one — never by adding a
wrapper underneath. An `@adrienlcp/*` helper already speaks the app's
vocabulary: its home re-exports it rather than wrapping it a second time.

**Dates go through the clock.** `nowMs()` is the one reading of the wall clock,
in epoch milliseconds because every deadline on the wire and every `setTimeout`
is written in them. Domain functions take `now` as an argument, so a test sets
the time by passing a number; code that reads the clock itself is moved with
fake timers, which steer `nowMs()` because it reads `Date.now()`. Test files
follow the `Date` ban too: `biome.json` exempts `clock.ts` and `dates.ts`, and
nothing else. Nothing here parses date
text or hands a `Date` to a library; the day one does, it gets a `dates.ts`
beside the clock that returns a `Result`, and the value is a Temporal type.
`nowMs()` keeps reading `Date.now()` then, because fake timers move `Date` and
never `Temporal.Now`; a timestamp written out keeps its millisecond fraction
(`smallestUnit: 'millisecond'`), and a test compares two Temporal values with
`.equals` — `toEqual` passes for any two, having no fields to walk.

`zod` is the exception, and deliberately so: it is not an infrastructure detail
here, it is the language the contract is written in. `packages/protocol` is
nothing but Zod schemas.

**A boundary hides the library, never the property.** Preview URLs expire and
question banks do not, and each port is shaped by that rather than flattened
into a common denominator — see
[`../../docs/architecture.md`](../../docs/architecture.md) for what each one
buys and what it deliberately leaves visible.
