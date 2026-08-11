# Stage 11 — The second game

**Goal.** A general-knowledge quiz, answered the same three ways the blind test
is: the first thumb on the buzzer, four choices, or everyone typing at once.

**Depends on** stages 01–04 and 09. It is the first stage that is not about the
blind test, and the first that changes the shell.

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

## The seam, and its exact shape

Today `RoomSettings` and `RoundView` are the blind test's, wearing the room's
name. Three fields are the game's rather than the room's — `difficulty`,
`playbackDurationMs`, `source` — and three more on the round: `audioStartsAt`,
`choices` typed as tracks, `revealedTrack`.

The fix is one discriminated union in each place, keyed on the game:

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
