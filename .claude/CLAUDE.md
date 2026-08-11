# CLAUDE.md

**Taverla** is a shelf of party games sharing one room, one QR code and one set
of screens. **Blind test** is the first of them: one screen runs the game and
shows the QR code, everyone else plays on whatever screen they have to hand,
and the first to buzz gets to name the track.

A phone is the common case, not the contract. The room code is displayed to be
read aloud and typed, so a laptop in the same room joins the same way — nothing
user-facing may assume the device.

Two names, two scopes, and the distinction is load-bearing. The product owns
`@taverla/*`, the `taverla:*` storage keys and the repository name. The game
owns the `blindtest.*` translation prefix and nothing else. When the second game
lands it takes its own prefix and touches none of the first's.

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
pnpm test:e2e         # two Playwright journeys, on ports of their own
pnpm validate         # build + test + e2e — run before saying something works
```

Ports are offset from 3000/5173 so this repo runs beside other dev servers.

## The four rules that matter most here

1. **A player is never sent the answer.** Host and player have separate message
   unions, and player frames are encoded *through* their schema so Zod strips
   anything that leaked. See `.claude/rules/realtime-protocol.md`.
2. **The server owns time.** Buzz order is stamped on arrival; `player.buzz`
   carries no timestamp, and never will.
3. **State travels as a whole snapshot**, never a delta.
4. **UI is verified in a real browser, muted.** A type-check and a green build
   say nothing about whether a screen works — and this one plays music, at a
   stored volume that defaults to 80%. Set `taverla:volume` to `'0'` in an init
   script before the first navigation. See `.claude/rules/test-conventions.md`.

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
- **Host** — the screen running the room. Shows the QR code, plays the audio,
  judges answers. It can also take a **seat** and play, outside buzzer mode —
  and the server then stops sending it the track
- **Player** — anyone who joined, by scanning the QR code or by typing the room
  code. Holds a seat and a score
- **Round** — one track. `lobby → countdown → playing → buzzed → revealed`
- **Answer mode** — `typed` (one field, the default), `choice` (four candidates)
  or `buzzer` (one player, judged by the host). The first two are everyone at
  once, decided by the server, and scored by speed on top of being right. Typing
  pays 3 for the pair where a right pick pays 1: producing the answer from
  nothing is not the same act as recognising it among four
- **Guess** — one typed line. Each half is looked for *inside* it, over runs of
  whole words, so "jean jacques goldman on ira" banks both and "daniel balavoine
  on ira" banks the title and still owes the artist. Whole words rather than raw
  substrings is the guard: `normalizeAnswer` drops whitespace, and on the bare
  string `Hell` is inside `Michelle`. Typed mode allows as many guesses as the
  clip does and closes for a player once they hold both halves; a pick is one
  shot, because four candidates with retries is the answer with extra steps
- **Buzz** — a player claiming the answer; the server stamps when it arrived
- **The floor** — what a buzz takes. It is held for `answerWindowMs`, or until
  the host judges when that is `null` and the screens count up instead. Running
  out is the same outcome as answering wrong, because taking the floor and
  saying nothing is what it cost everyone else
- **Lockout** — a player who answered wrong, or held the floor and said nothing,
  sits out the rest of the round
- **Reveal** — the moment the track identity becomes public
- **Verdict** — the host judging title and artist independently, 1 point each
- **Session id** — minted by the client, stored per room and role; what lets a
  device that locked its screen come back to the same seat

## The blind test is the first game, not the product

The plan is a shelf of party games sharing one room, one QR code and one set of
screens. That changes nothing about finishing this one — it ships whole, first —
but it does mean not welding the seams shut on the way.

[`docs/game-catalogue.md`](../docs/game-catalogue.md) holds the candidates and,
more usefully, the seams: room state versus game state, message namespaces, the
role-scoped unions worth defending, and the one shape of game that legitimately
breaks the snapshot rule. Read it before generalising anything — the short
version is that **two games is when the shared shape becomes knowable**, and
inventing it now is the abstraction anti-pattern with a different hat on.

## The build is staged

`docs/plans/` holds one file per stage, in order, each scoped to a session.
**00 through 09 are done** — the game is playable end to end in three answer
modes, deployed, and covered by socket suites plus two Playwright journeys.
`docs/plans/README.md` is the authority on which; do not trust this paragraph
over that table.

**10 is dropped** — audio stays on the host screen, and the case it was for is
remote play, which will get its own stage when it is wanted. The plan file keeps
the reasoning. Note what 06 deliberately did *not* buy: no component runner
exists here, so a claim about a single screen still rests on a browser pass.

**11 is half done.** The seam between the shelf and one game on it is built —
`settings.game` and `round.content`, discriminated on `kind` — and the game that
proves it is not. That game is a **bare buzzer**, not the quiz: the server
serves no content at all, and the room supplies whatever it likes. The quiz is
12, and ships buzzer mode before a French API.

Start a session by reading the stage's plan. Update it when reality diverges.
