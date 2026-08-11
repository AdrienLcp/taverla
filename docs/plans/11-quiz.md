# Stage 11 — The second game

**Goal.** A general-knowledge quiz, answered the same three ways the blind test
is: the first thumb on the buzzer, four choices, or everyone typing at once.

**Depends on** stages 01–04 and 09. It is the first stage that is not about the
blind test, and the first that changes the shell.

## Where it stands

**The seam is built; no quiz round exists yet.** `beginRound` answers
`not_implemented` when the room's game is a quiz, which is the honest marker of
what is missing.

Landed:

- `settings.game` and `round.content`, discriminated on `kind`, with the whole
  cascade — plus two things this file did not anticipate. The host's secret half
  became one `currentContent` union rather than staying `currentTrack` +
  `currentAudioUrl`, because a quiz host needs the question the way a blind test
  host needs the track. And `audioStartsAt` / `playbackElapsedMs` became
  `startsAt` / `roundElapsedMs`: a question appearing is as much a round opening
  as a first note is.
- `PROTOCOL_VERSION` 4.
- `packages/protocol/src/question.ts` and the quiz arm of `gameSettingsSchema`,
  still imported by nothing that runs.

Left, in order:

1. Split `packages/core/src/scoring/`. It is flat and mixes owners: `pointsFor`,
   `isMiss`, `pointsForTypedAnswer` and `pointsForChoice` are the blind test's;
   `speedBonusForRank`, `scoreboard` and `answer-matching` are the shell's and
   serve both games.
2. The server's quiz round — the source, the draw without repeats, the quiz arm
   of the server's `Round`, of `room-view.ts`, and of the grading.
3. The content, whose size depends on the decision below.
4. The screens, including the lobby's game picker, then `pnpm validate` and a
   browser pass over both games × three modes.

**One decision is open again**, and it changes the size of 3 by an order of
magnitude: which `QuestionSource` arm ships first. This file assumed `bank`;
`docs/game-catalogue.md` ranks `hosted` first and costs it at an evening,
because the server serves a round with no content at all and the host reads the
question from wherever they like. Read that section before writing a question.

## What the typed rework changed under this stage

Not planned here, and it moves what a quiz answer has to be. Typed mode is now
**one field with as many guesses as the clip allows**, each guess graded against
both halves and banked as it lands. A quiz answer is one claim rather than two,
so it inherits the field and the retries and needs neither halved.

`answerAppearsIn` is the matcher it inherits: whole-word runs inside a line,
with the same typo forgiveness. A quiz answer typed inside a sentence — "je
crois que c'est la Seine" — therefore already works.

## Why this one, and why now

`docs/game-catalogue.md` costed it as the cheapest game on the shelf, because it
is the shape already built: a stimulus on the big screen, a countdown every
device lands on together, an unforgeable buzz order, a lockout, a verdict, a
reveal, a scoreboard. What differs is that the stimulus is a question and not a
clip.

More importantly, the catalogue says **two games is when the shared shape becomes
knowable**, and refuses to invent it before then. This is that moment. The seam
below is not built in advance — it is built because a second case now exists to
measure it against.

## The seam, and its exact shape — built

`RoomSettings` and `RoundView` were the blind test's, wearing the room's name.
Three fields were the game's rather than the room's — `difficulty`,
`playbackDurationMs`, `source` — and three more on the round: `audioStartsAt`,
`choices` typed as tracks, `revealedTrack`.

The fix was one discriminated union in each place, keyed on the game:

```ts
RoomSettings = {
  answerMode, autoAdvanceMs, countdownMs, roundCount   // the room's
  game: { kind: 'blindtest', … } | { kind: 'quiz', … } // the game's
}
```

and the same on the round's content. `lobby` and `finished` stay on the room,
where they belong; every other phase keeps its name, because a countdown is a
countdown and a reveal is a reveal in both games.

**What must not happen:** a `Record<string, unknown>` payload, a plugin
registry, or a `GameEngine` interface. Two implementations is enough to see the
shape and not enough to abstract it. Three would be the moment to look again.

## What the quiz reuses unchanged

The room, the codes, the seats, the roster, the clock handshake, the snapshot
broadcast, the lockout, the speed bonus, the scoreboard, the final board, the
corner menu, both themes — and, more usefully than any of those,
`normalizeAnswer` and `matchesAnswer`. Typed mode already forgives accents,
punctuation and a slipped finger; a quiz answer needs exactly the same
tolerance, and reusing it means the same table of cases defends both games.

## What is genuinely new

- **A question bank, in a file.** A few hundred questions are a JSON asset
  reviewed in a merge request, loaded once at boot. A database is what you need
  when questions are *written from inside the app*, and that is a feature, not a
  prerequisite. `room-store.ts` already argues the same thing about rooms.
- **Its own decoys.** The blind test draws three wrong candidates from its pool.
  A quiz cannot: "1789" is not a plausible wrong answer to "which river runs
  through Paris". Every question carries its own three.
- **One claim, not two.** A blind test answer is a title *and* an artist, judged
  independently, worth a point each. A quiz answer is one claim, right or wrong.
  `pointsFor` is therefore the blind test's and moves there; the speed bonus is
  the shell's and stays.

## The question language is a room setting, not a locale

Decided, and forced rather than preferred: the interface locale is stored per
**device**, so two players in the same room can hold different ones. Drawing
questions from it would deal a different question to each phone. The host picks
the language in the lobby, beside the other settings, and it travels in
`RoomSettings` like everything else that decides a round.

The bank is written in French and English rather than translated into one from
the other. A question that only works in one culture belongs to that language's
bank; a translated quiz question is usually a broken one.

## Protocol

- `RoomSettings.game`, discriminated on `kind`.
- `RoundView.content`, likewise, host and player scoped as ever: the player's
  arm of a quiz round carries the prompt and the choices, and never the answer
  or which choice is right.
- `PROTOCOL_VERSION` bumps: an old client would mis-read a settings object whose
  shape moved, which is exactly what the version is for.

## Done when

- A quiz round runs in all three modes, and the blind test still runs in all
  three, unchanged
- No player frame carries a quiz answer or the index of the right choice —
  asserted over a whole round's transcript, the way stage 01 does it
- A typed quiz answer accepts the near-misses a real room produces, defended by
  the same table the blind test's matcher is
- The host picks the game in the lobby, and the settings shown are the ones that
  game actually has
- Verified in a browser, both games, three modes

## Out of scope

A question written from inside the app. Categories chosen per round. Images.
A third game — and the moment one is wanted, this file's seam is what gets read
first.
