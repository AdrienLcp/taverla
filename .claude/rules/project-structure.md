# Project structure

> **Unscoped on purpose**: it answers *where a new file goes*, decided before
> the file exists. It is the largest greedy rule here, and the first to
> re-examine if the floor must come down again.

```
apps/server         → Hono + native WebSocket. Authoritative game state.
apps/game           → One Vite SPA serving both surfaces, by route.
packages/protocol   → The wire contract (Zod). Depends on nothing but zod.
packages/core       → Pure domain rules. Depends on protocol for types.
docs/plans/         → The staged build plan; each file is one session's work.
```

```
apps/game/src/
├── infrastructure/   api, messaging, router, storage, env
├── features/         credits, home, host, join, not-found, player, shelf
├── presentation/     app-shell, components, connection, exits, i18n, styles, theme
└── helpers/          pure utilities, no React
```

**There is no `packages/ui`** — with one consuming app it would be a boundary
with nothing on the other side. Promote `presentation/` to a package the day a
second app exists, not before.

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
  locale negotiation → `packages/core`, with a test. The split is by directory:
  `time/`, `room/`, `i18n/`, `round/` and `scoring/` are the shell's, and
  `blindtest/` holds what only that game can say. The test is whether the rule
  still makes sense with no title and no artist — `pointsFor` does, over either
  shape of verdict; `gradeGuess` does not. Read `docs/game-catalogue.md` before
  promoting either side to a package.
- Anything touching a socket, `fetch`, `localStorage`, the router →
  `apps/*/src/infrastructure/`. See `abstraction-boundaries.md`.
- A React component used by one surface → that feature. Used by both →
  `presentation/components/`.
- Something that must exist on *every* screen → `presentation/app-shell.tsx`,
  which is the layout route every page renders inside.
