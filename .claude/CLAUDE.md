# CLAUDE.md

**Taverla** is a shelf of party games sharing one room, one QR code and one set
of screens. **Blind test** is the first: one screen runs the game and shows the
QR code, everyone else plays on whatever screen they have to hand, and the first
to buzz names the track. **Buzzer** is the same unforgeable race for the floor
with no content at all — the host brings the charade, the quiz on paper or the
lesson. **Quiz** serves its own, two question banks bundled with the server in
French and English. **Le Fake** is the first where a wrong answer scores:
everyone writes a lie about a real question, the screen shows them all beside
the truth, and the room votes.

A phone is the common case, not the contract: the room code is displayed to be
read aloud and typed, so a laptop in the same room joins the same way. Nothing
user-facing may assume the device.

Two names, two scopes, and the distinction is load-bearing. The product owns
`@taverla/*`, the `taverla:*` storage keys and the repository name. A game owns
its own translation prefix — `blindtest.*`, `buzzer.*`, `quiz.*`, `lefake.*` —
and nothing else. A string the next game would show unchanged is the shell's.

## Tech stack

pnpm monorepo · TypeScript 7 · React 19 (+ React Compiler) · Vite 8 · Hono ·
native WebSocket · Zod 4 · react-aria-components · SASS · Biome · Vitest.

**No Socket.IO, and no OpenAPI codegen.** Realtime is a raw WebSocket carrying
messages defined in `packages/protocol`; the small HTTP surface is defined in
the same package. One answer to "where is the wire contract?".

**TypeScript 7** — the native Go compiler, viable here precisely because nothing
in this repo consumes the TypeScript JS compiler API (no `@hey-api/openapi-ts`,
no Storybook autodocs). Adding a tool that does means pinning back to 6.x.

**`@babel/core` stays on 7.x.** The React Compiler cannot parse Babel 8's AST
for a destructured parameter with a default and bails per function, silently —
see [`docs/component-shape.md`](../docs/component-shape.md).

## Commands

`pnpm dev` runs the server (3100) and the app (5273) in parallel, `pnpm test`
covers protocol, core and server, `pnpm test:core:watch` is the red-green loop,
and `pnpm test:e2e` runs three Playwright journeys on ports of their own.
**`pnpm validate`** is build, test and e2e together — run it before saying
something works. Ports are offset from 3000/5173 so this repo runs beside the
other dev servers on the machine.

## The four rules that matter most here

1. **A player is never sent the answer.** Host and player have separate message
   unions; player frames are encoded *through* their schema, so Zod strips leaks.
2. **The server owns time.** Buzz order is stamped on arrival; `player.buzz`
   carries no timestamp, and never will.
3. **State travels as a whole snapshot**, never a delta.
4. **UI is verified in a real browser, muted.** A green build says nothing about
   whether a screen works, there is no component runner here, and this one plays
   music at a stored volume defaulting to 80%. Set `taverla:volume` to `'0'` in
   an init script before the first navigation — see `docs/browser-driving.md`.

## Rules (auto-loaded from `.claude/rules/`)

`realtime-protocol` (the wire contract, anti-cheat, adding a message) ·
`project-structure` (where a new file goes) · `abstraction-boundaries` (which
module may import which library) · `i18n` (adding a string) · `locales` (adding
a locale) · `react-components` (the compiler owns memoization, the `style` prop)
· `design-system` (wrapping a react-aria primitive) · `sass-architecture`
(layers, tokens, both palettes, state attributes) · `code-style` ·
`file-naming` · `comments` · `test-conventions` (tags, the socket harness) ·
`e2e` (build first, three journeys) · `git-hooks` (the pre-commit biome pass)

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
- Fix a reported bug on sight — where it came from is a clue, never a defence
- Write a discovery into `.claude/` or `docs/` as you make it, not at the end

## Language

Everything committed is **English** — code, comments, docs, commit messages, and
every translation *key*; chat replies to the developer stay in French. The one
exception is the dictionaries: French *values* live in
`apps/game/src/presentation/i18n/` and nowhere else, which is why a user-visible
string written into a component is a bug — see `.claude/rules/i18n.md`.

## Domain vocabulary

- **Room** — one game, addressed by a 4-character code from an alphabet with no
  confusable glyphs (`O`/`0`, `I`/`1`, `S`/`5`, `Z`/`2` are all excluded)
- **Host** — the screen running the room. Shows the QR code, plays the audio,
  judges answers. It can also take a **seat** and play, outside buzzer mode, and
  the server then stops sending it the track. It is the only role that can
  **close** the room — see `Exits` below
- **Player** — anyone who joined, by scanning the QR code or by typing the room
  code. Holds a seat and a score
- **Game** — what the room is playing, and **`null` until somebody says**: the
  code goes up and the phones arrive before the table decides, and the picker
  sits on the lobby stage beside the QR code. The guard on `host.startRound`
  narrows it for everything downstream, and a round already on screen is asked
  `round.content` rather than `settings.game`, because that is the game it was
  *opened* on. `shelvedGames` is the ones a game's own front door may open a room
  for, and the create-room request carries which. The two sets coincide today,
  which is what shipping every game looks like — it must **not** collapse into
  `gameKinds`, because it is what refuses a game that is served but has no
  screens yet, and every game so far spent a stage in that window. The game owns
  its arm of `settings.game` and `round.content`, and narrows the answer mode
- **Round** — one track, one question, or nothing at all.
  `lobby → countdown → playing → buzzed → voting → revealed → finished`.
  `roundCount` is nullable, and `null` means until the host ends it. `voting` is
  Le Fake's alone; every other game goes from `playing` straight to a reveal. A
  round **stamps who it opened on** when its clip starts, and waits for those
  players and nobody else — one stamp for the whole round, Le Fake's vote
  included. A phone that arrives after keeps its seat, is refused everything it
  could send with `joined_mid_round`, and plays from the next round
- **Answer mode** — `typed` (one field, the default), `choice` (four candidates)
  or `buzzer` (one player, judged by the host). The first two are everyone at
  once, decided by the server and scored by speed on top of being right; typing
  pays 3 for the pair where a right pick pays 1, because producing an answer
  from nothing is not recognising it among four. It stays a *room* setting the
  game narrows — the bare buzzer offers only `buzzer`, and a frame setting
  anything else is refused
- **Guess** — one typed line. Each half is looked for *inside* it over runs of
  whole words, so "jean jacques goldman on ira" banks both and "daniel balavoine
  on ira" banks the title and still owes the artist. Whole words are the guard:
  `normalizeAnswer` drops whitespace, and `Hell` is inside `Michelle`. Typed
  mode allows as many guesses as the clip does and closes once a player holds
  both halves; a pick is one shot, because four candidates with retries is the
  answer with extra steps. **Searching *within* a line is the blind test's
  alone** — the quiz matches the whole of what was typed, because "trois ou
  quatre" contains the answer to how many languages Switzerland has
- **Buzz** — a player claiming the answer; the server stamps when it arrived
- **The floor** — what a buzz takes, held for `answerWindowMs` or until the host
  judges when that is `null` and the screens count up instead. Running out is
  the same outcome as answering wrong, because taking the floor and saying
  nothing is what it cost everyone else
- **Lockout** — a player who answered wrong, or held the floor and said nothing,
  sits out the rest of the round. The blind test always locks out, because its
  round is a clip that runs out; the bare buzzer has no such clock, so its host
  chooses (`locksOutOnMiss`) and can reopen the field with `host.clearLockouts`
- **Reveal** — the moment the round's answer becomes public, and the scoreline
  alone in a game whose question the room owns
- **Verdict** — what the host granted, in the shape the game is judged in:
  `halves` for the blind test's title and artist, a point each and judged
  independently, `single` for one claim worth one point everywhere else
- **Exits** — three nested scopes, never one "back". `player.leave` gives up a
  **seat**, `host.endGame` ends a **game** and puts the final board up,
  `host.closeRoom` disbands the **room**: everyone is sent a fatal `room_closed`
  and the code stops resolving. The stage carries the exit the moment asks for
  and nothing else, so the ones that must be reachable mid-round live in
  `AppMenu`, on every screen at every phase behind a popover no thumb aiming at
  the game can hit. A seated host is the only screen offering all three, and the
  server frees the seat on the frame rather than on the reconnect after it,
  because a judge waiting on that would read no answer until it landed. A room
  outlives its host by ten minutes so a reload keeps the game; closing is what
  says otherwise. `host.removePlayer` is the fourth and the only one nobody
  chooses, so it is the one that has to be **said**: a fatal `removed_by_host`
  to that phone alone, before the seat goes, and it voids the seat because the
  room still answers. **A plain navigation is never an exit** — the server cannot
  tell it from a closed tab, so the menu offers a link out of a room only where
  there is no room, which is why the credits are a front-door concern
- **Session id** — minted by the client, stored per room and role; what lets a
  device that locked its screen come back to the same seat
- **Host token** — minted with the room and returned by `POST /api/rooms` to the
  screen that opened it. The code says *which* room, this says *who may host it*,
  and it always wins a claim — which is what makes a takeover undoable. Without
  one a second console waits out `HOST_RECLAIM_GRACE_MS`, then the code alone is
  enough. It lives in `taverla:host-tokens` and **never on the seat**: the
  refusal that displaces a console voids its seat, and a token dropped with it
  would make the takeover final
- **The host's setup** — `HostPreferences`, stored on the console's own machine
  and split on the seam `movedToGame` turns on. A game answers three of the
  room's settings — `game`, `mode`, `roundCount`, together `GameSetup` — so
  those are remembered *per game*, and everything no game answers is remembered
  once and survives every switch. The console applies it over what the door
  decided, as one `host.updateSettings` in the **lobby** and only on the first
  view it draws: a mid-game reload must re-apply nothing, because the server
  would refuse the three a round is built on and the rest would rearrange
  somebody's evening between two rounds

## The blind test is the first game, not the product

Four games share the room, the QR code and every screen, and the rule that got
them there has not changed: **do not weld a seam shut, and do not invent a
shared shape before there is a second case to measure it against.** **Read
[`docs/game-catalogue.md`](../docs/game-catalogue.md) before generalising
anything** — before hoisting a field to the room, splitting a union, or naming
something "shared". It holds the open seams, the shapes the remaining games fall
into, and every argument already settled.

## The build is staged

`docs/plans/` holds one file per stage, each scoped to a session. **Start a
session by reading the stage's plan, and update it when reality diverges.**
[`docs/plans/README.md`](../docs/plans/README.md) is the authority on which
stages are done, which were dropped and why, and what each one bought — trust
that table over anything remembered, this file included.
