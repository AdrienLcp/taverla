# Abstraction boundaries

**Abstract capabilities, not libraries.** The repository, the adapter wrapping
an SDK, the design-system component — each of those already IS the boundary
between the application and an external library. Do not stack a second, thinner
abstraction below it: no generic `httpClient.request()`, no neutral
`storage.get()`, no "message bus" under the socket. Full rationale in
`C:/git/.claude/CLAUDE.md`.

## Where an external library may be imported

| Library | The only module allowed to import it |
|---|---|
| Deezer (via `fetch`) | `apps/server/src/infrastructure/music/deezer-client.ts` |
| `hono`, `@hono/*`, `hono-rate-limiter` | `apps/server/src/infrastructure/http/`, `apps/server/src/index.ts` |
| `WebSocket` (browser) | `apps/game/src/infrastructure/messaging/use-room-socket.ts` |
| `hono/ws` (server) | `apps/server/src/infrastructure/messaging/` |
| `localStorage` | `apps/game/src/infrastructure/storage/session-storage.ts` (seats) and `preferences-storage.ts` (locale, theme) |
| `navigator`, `location` | `apps/game/src/infrastructure/env.ts`, plus `location.origin` in `router/navigation.ts` |
| the clipboard | `env.ts` again — `navigator.clipboard` needs a secure context and a host served from a LAN address over plain HTTP has none, so the `execCommand` fallback lives behind `copyToClipboard` and nowhere else |
| `fetch` (browser) | `apps/game/src/infrastructure/api/taverla-api.ts` |
| `react-router` | `apps/game/src/infrastructure/router/`, plus `useNavigate` in `presentation/app-shell.tsx` — which hands it to react-aria's `RouterProvider`, so components navigate through the design system's `Link` and never import react-router themselves |
| `react-aria-components` | `apps/game/src/presentation/components/`, `presentation/i18n/i18n-provider.tsx` for `I18nProvider`, and a feature that genuinely needs a primitive the design system has not wrapped yet |

An import of one of these anywhere else is a design bug. Fix it by moving the
call behind the existing module, or by adding a missing one — never by adding a
wrapper underneath.

`zod` is the exception, and deliberately so: it is not an infrastructure detail
here, it is the language the contract is written in. `packages/protocol` is
nothing but Zod schemas.

## The catalogue swap this actually buys

`deezer-client.ts` is the one module that knows Deezer exists. Everything above
it speaks `TrackSource`, `TrackSearchResult` and `HostTrack`. Moving to another
catalogue means rewriting that file, and its two exported functions keep their
signatures. Nothing thinner underneath would reduce that work.

Note what the boundary does *not* hide, because it should not: preview URLs
expire, so `fetchHostTrack` is called when a round starts rather than when the
pool is built. That is a real property of streaming catalogues, not a Deezer
quirk to paper over.

## Related

- `project-structure.md` — where each layer lives
- `realtime-protocol.md` — the socket is a port; the protocol package is its language
