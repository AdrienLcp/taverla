# Stage 00 — Bootstrap · **done**

The record of what exists, so a later stage does not rebuild it.

## Delivered

**Tooling.** pnpm workspace, TypeScript 7, Biome 2.5.7 (formatting, import
groups, the `console.log` ban), `.editorconfig`, ports offset
to 3100/5273 so the repo runs beside other dev servers.

**`packages/protocol`.** The whole wire contract: identifiers, room views split
by role, client and server message unions, error codes, the HTTP surface, and a
codec that strips host-only fields from player frames. 10 tests.

**`packages/core`.** Room-code generation and normalisation, clock-offset
estimation, buzz eligibility with a reason, competition ranking, `Result`. 39
tests.

**`apps/server`.** Hono, a native WebSocket endpoint, an in-memory room store
with a sweeper, host claiming, player seats that survive a reload, the roster
broadcast, and the Deezer adapter behind a domain port.

**`apps/game`.** One Vite SPA with three lazy routes, a socket hook that owns
reconnection and the clock handshake, design tokens, and three screens: join,
host console with QR code and live roster, player screen with a buzzer that
explains why it is disabled.

## Verified in a browser

Create a room → QR renders and encodes `location.origin` → a second tab joins →
the roster updates live without a reload → the clock handshake reports ±1 ms →
`host.startRound` surfaces `"host.startRound" is not served yet`. No console
errors.

## Two defects found and fixed during the pass

**The cascade order was decided by the import graph.** `main.tsx` imported the
router — which statically pulls in a page's stylesheet — above the global
stylesheet, so `@layer components` was registered before `@layer reset`, and the
reset won over every component rule. The symptom was strange enough to be worth
recording: `max-width` applied while `padding` and `background` silently did
not. The order now lives in `index.html`, where the module graph cannot reach
it. See `.claude/rules/sass-architecture.md`.

**Session ids were scoped by room only**, so hosting and playing the same room
from one browser — the normal way to try the game — had the two tabs claiming
each other's identity. Now scoped by room *and* role.

## Decisions taken here, and their reasons

| Decision | Reason |
|---|---|
| A server exists | Buzz order is the game, and a client timestamp is skewed and forgeable |
| Raw WebSocket, not Socket.IO | The reconnect and rooms cost twenty lines each; the stringly-typed event API costs correctness |
| One app, two lazy routes | The QR encodes `location.origin` — one origin, no CORS, one deployment |
| No `packages/ui` | One consuming app; it would be a boundary with nothing behind it |
| Contract in `packages/protocol`, not `hc<AppType>` | One answer to "where is the wire contract?", and `apps/game` stays independent of `apps/server` |
| Rooms in memory | A game lasts an evening; persistence buys a recovery nobody would use |
| TypeScript 7 | Nothing here consumes the TS JS compiler API, which is the only thing holding other repos back |
| `@babel/core` pinned to 7 | The React Compiler bails silently on Babel 8's AST for destructured defaults |

## Known gaps left on purpose

- Every round message answers `not_implemented` — stage 01
- The UI is English with no i18n layer — stage 07
- No component or end-to-end tests — stage 06
- The design is a coherent foundation, not a finished visual world — stage 05
- The host disconnecting is invisible to players
- No rate limiting on room creation

All six are closed. The four with a stage beside them landed with it; the last
two closed outside any stage — players see an absent host
(`host-absence.test.ts`), and room creation is rate limited in
`apps/server/src/infrastructure/http/rate-limit.ts`. The `not_implemented` code
itself is gone: it survived every stage that sent it and became dead vocabulary,
which is recorded as a rule in
[`../realtime-protocol.md`](../realtime-protocol.md).
