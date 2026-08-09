# Project structure

```
apps/server         → Hono + native WebSocket. Authoritative game state.
apps/game           → One Vite SPA serving both surfaces, by route.
packages/protocol   → The wire contract (Zod). Depends on nothing but zod.
packages/core       → Pure domain rules. Depends on protocol for types.
docs/plans/         → The staged build plan; each file is one session's work.
```

## One app, two surfaces

`apps/game` serves the host console at `/host/:roomCode` and the player screen
at `/play/:roomCode`, both lazily loaded. That is not a compromise — it is what
makes the QR code work: it encodes `location.origin`, so the phone that scans it
lands on the same origin the host is already served from. One deployment, no
CORS, no second domain, no environment variable pointing one app at the other.

The bundles stay separate because the routes are lazy. Keep them that way: a
phone on a party's Wi-Fi should not download the QR renderer and the audio
player it will never run. Anything imported from both surfaces lands in the
shared chunk, so think before hoisting.

**There is no `packages/ui`.** With a single consuming app it would be a
boundary with nothing on the other side. The design system lives in
`apps/game/src/presentation/`. Promote it to a package the day a second app
exists, not before.

## Inside the app

```
src/
├── infrastructure/   api, messaging, router, storage, env
├── features/         host, player, join, not-found
├── presentation/     app-shell, components, styles, i18n, theme
└── helpers/          pure utilities, no React
```

`presentation/app-shell.tsx` is the layout route every page renders inside. It
is where anything that must exist on *every* surface goes — the preferences bar
lives there because a phone arriving from a QR code never passes through the
home page.

| From | Importing | Syntax |
|---|---|---|
| App code | Same app | `@/features/…` |
| App code | Workspace package | `@taverla/protocol/…`, `@taverla/core/…` |
| Package code | Same package | relative only — never the package's own name |
| Package code | Another package | `@taverla/protocol/…` |

## Where a new thing goes

- Something both the server and the browser must agree on the *shape* of →
  `packages/protocol`.
- A rule with no I/O — scoring, eligibility, clock maths, code generation,
  locale negotiation → `packages/core`, with a test. Some of those are the blind
  test's and some are the shell's; keep them in separate directories, and read
  `docs/game-catalogue.md` before promoting either to a package.
- Anything touching a socket, `fetch`, `localStorage`, the router →
  `apps/*/src/infrastructure/`. See `abstraction-boundaries.md`.
- A React component used by one surface → that feature. Used by both →
  `presentation/components/`.

## No barrel files

No `index.ts` that only re-exports. Both packages expose `"./*": "./src/*"`, so
`@taverla/core/time/clock-sync` is the import and the file path at once.

## Ports

`3100` (server) and `5273` (app), offset from the usual 3000/5173 so this repo
runs beside the other dev servers on the machine. In dev, Vite proxies `/api`
and `/ws` to the server, which is what makes the app same-origin in development
as well as in production.
