# CLAUDE.md

A party blind test: one screen runs the game and shows a QR code, everyone else
plays on the phone in their pocket. First to buzz gets to name the track.

## Tech stack

pnpm monorepo · TypeScript 7 · React 19 (+ React Compiler) · Vite 8 · Hono ·
native WebSocket · Zod 4 · react-aria-components · SASS · Biome · Vitest.

**No Socket.IO, and no OpenAPI codegen.** Realtime is a raw WebSocket carrying
messages defined in `packages/protocol`; the small HTTP surface is defined in
the same package. One answer to "where is the wire contract?".

**TypeScript 7** — the native Go compiler. It is viable here precisely because
nothing in this repo consumes the TypeScript JS compiler API (no
`@hey-api/openapi-ts`, no Storybook autodocs). Adding a tool that does means
pinning back to 6.x; check before introducing one.

## Commands

```bash
pnpm dev              # server (3100) + app (5273), in parallel
pnpm build            # type-check every package, then build the app
pnpm lint             # biome check --write
pnpm test             # protocol + core + server
pnpm test:core:watch  # the red-green loop
pnpm validate         # build + test — run this before saying something works
```

Ports are offset from 3000/5173 so this repo runs beside other dev servers.

## The four rules that matter most here

1. **A player is never sent the answer.** Host and player have separate message
   unions, and player frames are encoded *through* their schema so Zod strips
   anything that leaked. See `.claude/rules/realtime-protocol.md`.
2. **The server owns time.** Buzz order is stamped on arrival; `player.buzz`
   carries no timestamp, and never will.
3. **State travels as a whole snapshot**, never a delta.
4. **UI is verified in a real browser.** A type-check and a green build say
   nothing about whether a screen works.

## Rules (auto-loaded from `.claude/rules/`)

| File | Covers |
|---|---|
| `realtime-protocol.md` | The wire contract, anti-cheat, adding a message |
| `project-structure.md` | Where code goes, one-app-two-surfaces, imports |
| `i18n-and-theme.md` | Adding a string, adding a colour, the two locales |
| `abstraction-boundaries.md` | Which module may import which library |
| `react-components.md` | Props, the React Compiler, react-aria |
| `sass-architecture.md` | Layers, tokens, the `index.html` cascade order |
| `css-variables.md` | Tokens over SASS variables |
| `code-style.md` | `const` arrows, inline type imports |
| `file-naming.md` | kebab-case, no barrel files |
| `comments.md` | The default is zero |
| `naming-and-quality.md` | Name on merit, not on precedent |
| `test-conventions.md` | Tags, mutation checks, what deserves a test |
| `workflow-feedback.md` | Fix what is reported; run the full validation |
| `git-hooks.md` | The pre-commit biome pass |

## Never

- Write a user-visible string in a component — it belongs in the dictionary
- Write a colour in a component — it belongs in both palettes as a token
- Use `npm` or `yarn` — `pnpm` only
- Use `as any`, `as unknown as`, or any unsafe cast — `as const` is fine
- Use `// biome-ignore`, `@ts-ignore`, `@ts-expect-error`
- Write `function` declarations — `const` arrow functions (overloads excepted)
- Create a barrel `index.ts` that only re-exports
- Send a player frame with bare `JSON.stringify` / `encodeMessage`
- Trust a client-supplied timestamp for anything that decides a winner
- Import an external library outside its boundary module
- Write a comment a better name would have made unnecessary

## Always

- `react-aria-components` for anything interactive — check for an existing
  primitive before writing custom HTML with hand-rolled ARIA
- Style from react-aria's `data-*` attributes, never a hand-composed state class
- An object parameter when two arguments share a type — `fn({ from, to })`
- `type` for props, with a JSDoc on every prop that adds information
- A bracketed tag on every test — `it('[clock] …')`
- Break a new test on purpose once, and watch it fail

## Language

Everything committed is **English** — code, comments, docs, commit messages,
and every translation *key*. Chat replies to the developer stay in French.

**The UI is explicitly internationalised**, which is the documented exception to
the English-only rule: `apps/game/src/presentation/i18n/` holds an `en` and an
`fr` dictionary, and French *values* live there and nowhere else. A user-visible
string written into a component is a bug, not a shortcut — see
`.claude/rules/i18n-and-theme.md`.

## Domain vocabulary

- **Room** — one game, addressed by a 4-character code from an alphabet with no
  confusable glyphs (`O`/`0`, `I`/`1`, `S`/`5`, `Z`/`2` are all excluded)
- **Host** — the big screen. Shows the QR code, plays the audio, judges answers
- **Player** — a phone that scanned in. Holds a seat and a score
- **Round** — one track. `lobby → countdown → playing → buzzed → revealed`
- **Buzz** — a player claiming the answer; the server stamps when it arrived
- **Lockout** — a player who answered wrong sits out the rest of the round
- **Reveal** — the moment the track identity becomes public
- **Verdict** — the host judging title and artist independently, 1 point each
- **Session id** — minted by the client, stored per room and role; what lets a
  phone that locked its screen come back to the same seat

## The blind test is the first game, not the product

The plan is a shelf of party games sharing one room, one QR code and one set of
phones. That changes nothing about finishing this one — it ships whole, first —
but it does mean not welding the seams shut on the way.

[`docs/game-catalogue.md`](../docs/game-catalogue.md) holds the candidates and,
more usefully, the seams: room state versus game state, message namespaces, the
role-scoped unions worth defending, and the one shape of game that legitimately
breaks the snapshot rule. Read it before generalising anything — the short
version is that **two games is when the shared shape becomes knowable**, and
inventing it now is the abstraction anti-pattern with a different hat on.

## The build is staged

`docs/plans/` holds one file per stage, in order, each scoped to a session. The
bootstrap (stage 00) is done: contract, server, lobby, QR, join, live roster,
clock sync. `not_implemented` is the honest answer to everything else, and it
should shrink to nothing as the stages land.

Start a session by reading the stage's plan. Update it when reality diverges.
