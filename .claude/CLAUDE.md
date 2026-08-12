# CLAUDE.md

**Taverla** is a shelf of party games sharing one room, one QR code and one set
of screens. **Blind test** is the first of them: one screen runs the game and
shows the QR code, everyone else plays on whatever screen they have to hand,
and the first to buzz gets to name the track. **Buzzer** is the second: the same
room, the same unforgeable race for the floor, and no content at all — the host
brings the charade, the quiz on paper or the lesson. **Quiz** is the third, and
it serves its own: 1 800 French questions bundled with the server.

A phone is the common case, not the contract. The room code is displayed to be
read aloud and typed, so a laptop in the same room joins the same way — nothing
user-facing may assume the device.

Two names, two scopes, and the distinction is load-bearing. The product owns
`@taverla/*`, the `taverla:*` storage keys and the repository name. A game owns
its own translation prefix — `blindtest.*`, `buzzer.*`, `quiz.*` — and nothing
else. A string the next game would show unchanged belongs to the shell, and the
third game moved four of them there.

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
- **Game** — what the room is playing, and **`null` until somebody says**. A
  room is opened before the table decides: the code goes up, the phones arrive,
  and the picker is on the lobby stage beside the QR code. The guard on
  `host.startRound` is what narrows it for everything downstream — and a round
  already on screen is asked `round.content`, not `settings.game`, because that
  is the game it was *opened* on.

  `blindtest`, `buzzer`, `quiz`; `shelvedGames` is the ones a game's own front
  door may open a room for, and the create-room request carries which when it
  came through one. It holds all three today, and must not collapse into
  `gameKinds`: it is what refuses a game that is served but has no screens yet,
  and every game so far has spent a stage in that window. The game owns its arm
  of `settings.game` and `round.content`, and narrows the room's answer mode
- **Round** — one track, one question, or nothing at all.
  `lobby → countdown → playing → buzzed → revealed`. `roundCount` is nullable,
  and `null` means until the host ends it
- **Answer mode** — `typed` (one field, the default), `choice` (four candidates)
  or `buzzer` (one player, judged by the host). The first two are everyone at
  once, decided by the server, and scored by speed on top of being right. Typing
  pays 3 for the pair where a right pick pays 1: producing the answer from
  nothing is not the same act as recognising it among four. It stays a *room*
  setting and the game narrows it — the bare buzzer offers only `buzzer`, and
  the server refuses a frame that sets anything else
- **Guess** — one typed line. Each half is looked for *inside* it, over runs of
  whole words, so "jean jacques goldman on ira" banks both and "daniel balavoine
  on ira" banks the title and still owes the artist. Whole words rather than raw
  substrings is the guard: `normalizeAnswer` drops whitespace, and on the bare
  string `Hell` is inside `Michelle`. Typed mode allows as many guesses as the
  clip does and closes for a player once they hold both halves; a pick is one
  shot, because four candidates with retries is the answer with extra steps.
  **Searching *within* a line is the blind test's alone.** The quiz matches
  against the whole of what was typed, because containment is what makes one
  field honest when it holds two claims and a question holds one — "trois ou
  quatre" contains the answer to how many languages Switzerland has
- **Buzz** — a player claiming the answer; the server stamps when it arrived
- **The floor** — what a buzz takes. It is held for `answerWindowMs`, or until
  the host judges when that is `null` and the screens count up instead. Running
  out is the same outcome as answering wrong, because taking the floor and
  saying nothing is what it cost everyone else
- **Lockout** — a player who answered wrong, or held the floor and said nothing,
  sits out the rest of the round. The blind test always locks out, because its
  round is a clip that runs out; the bare buzzer has no such clock, so its host
  chooses (`locksOutOnMiss`) and can reopen the field with `host.clearLockouts`
- **Reveal** — the moment the round's answer becomes public, and the scoreline
  alone in a game whose question the room owns
- **Verdict** — what the host granted, in the shape the game is judged in:
  `halves` for the blind test's title and artist, 1 point each and judged
  independently, `single` for one claim worth one point everywhere else
- **Session id** — minted by the client, stored per room and role; what lets a
  device that locked its screen come back to the same seat

## The blind test is the first game, not the product

The shelf is real now — two games share the room, the QR code and every screen —
but the rule that got it here has not changed: do not weld a seam shut, and do
not invent a shared shape before there is a second case to measure it against.

[`docs/game-catalogue.md`](../docs/game-catalogue.md) holds the candidates and,
more usefully, the seams: room state versus game state, message namespaces, the
role-scoped unions worth defending, and the one shape of game that legitimately
breaks the snapshot rule. Read it before generalising anything.

**The `mode` axis is built.** `settings.mode` is a union discriminated on
`kind`, beside `settings.game` and for the same reason: which game the room is
playing and how it is answered are independent choices, and each owns settings
the other cannot read. `answerWindowMs` lives in the buzzer arm alone, so the
guard in `registerBuzz` against a hand-written buzz *is* the narrowing that
produces the window — a mode where nobody buzzes cannot reach it.

It was built on one field rather than the two the threshold asked for, because
the field was in the wrong place and that is a different fault from a missing
abstraction. A union invented for symmetry is premature; a union that makes an
unreachable field unrepresentable pays for itself the day it is written.

**`RoomPhase` stays fused, and that is a decision rather than a delay.** It is
the one candidate with no payload: `settings.game`, `settings.mode`,
`round.content` and `Verdict` each split because a field belonged to one arm and
sat on all of them, and a phase carries no field at all — it is a name. All six
mean the same thing in both games on the shelf, and splitting a name costs every
check in the shell the ability to spell what it is checking. Revisit only when a
game needs a phase these six cannot carry, which is a *new* name and not a
reshuffle of these.

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

**11 is done, and it is the first stage that is not the blind test's.** The seam
between the shelf and one game on it — `settings.game`, `round.content` and the
verdict, all discriminated on `kind` — and the game that proves it: a **bare
buzzer**, where the server serves no content at all and the room supplies
whatever it likes.

**12 is done, and the quiz is the third game on the shelf.** It runs in all
three modes on 1 800 French questions bundled with the server — ninety-two of
them adult and off until the host says otherwise. There is no API to take —
OpenQuizzDB publishes downloads now, which is better, because a bundled asset
cannot go down in the middle of a party. Its real work was not the questions but
the **simultaneous path**, which stage 11 left entirely in the blind test's
shape, and then the four shell strings the screens forced out of a game's
namespace.

**13 is done: the room comes first.** `/` creates a room with nothing chosen and
the game is picked on the console, so `settings.game` is nullable and
`PROTOCOL_VERSION` is 9. A game's own page keeps its button as a shortcut. Read
`docs/plans/13-room-first.md` before touching anything that reads
`settings.game` — three of the sites it swept were reading it where
`round.content` was the honest source.

**14 is done, and the quiz has two banks.** 4 506 English questions from Open
Trivia DB beside the 1 800 French, same CC BY-SA 4.0, same bundled asset, and the
control stage 12 deliberately withheld. Three things worth knowing before
touching it:

- **The language is the room's and the host's alone.** It defaults to the host's
  interface locale and moves independently after — a player switching their app
  between English and French mid-game changes their chrome and nothing else.
- **The default is a map, not an identity.** `Locale` and `QuestionLanguage` are
  separate unions holding the same two members today;
  `@taverla/core/quiz/question-language` maps between them with a fallback, and
  its test is the tripwire for a locale that ships without a bank.
- **`Locale` lives in the protocol now**, because `POST /api/rooms` carries it.
  `pickLocale` is a rule and stayed in core. The door carries the shell's fact —
  what the host *reads* — rather than a quiz setting, and each game decides what
  to do with it.

English has **no anecdotes and no adult rating**, so a reveal there shows the
answer alone and `allowsAdultContent` filters nothing. Its `arts` category is
55% of the bank, a fifth of it video games; the draw is left uniform, and
`docs/plans/14-question-languages.md` records why.

Read the divergences at the end of `docs/plans/11-buzzer.md` before trusting a
detail written earlier in that file: the second game corrected the first half in
four places, which is what a second case is for.

Start a session by reading the stage's plan. Update it when reality diverges.
