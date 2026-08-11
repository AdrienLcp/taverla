# Stage 12 — Trivia

**Goal.** A general-knowledge quiz, answered the same three ways the blind test
is: the first thumb on the buzzer, four choices, or everyone typing at once.

**Depends on** stage 11, which built the seam between the shelf and one game on
it, and on stage 09 for the three answer modes.

## The order this ships in, decided

**Buzzer mode first, then a French API.** Not the other way round, and not both
at once:

1. **Buzzer mode needs no content pipeline at all** beyond the question itself,
   and it is the mode that tolerates a thin or awkward source — a host reading a
   question aloud can skip a bad one, where four candidates on a phone cannot be
   unasked.
2. **Then `api`, in French only.** `docs/game-catalogue.md` ranked `api` last on
   the grounds that "the free banks are thin and often ambiguous in French" —
   which assumed an English-first source. [OpenQuizzDB](https://www.openquizzdb.org/)
   is the opposite: French-first, JSON, and six languages if the room ever wants
   them. Three things decide whether it can ship and none were confirmed from
   their site — an API key, the licence and attribution, and **whether each
   question carries its own wrong answers**. That last one is structural: with
   decoys, choice mode is free; without them, the quiz runs in buzzer and typed
   only until somebody writes them.

A curated `bank` file stays the fallback, not the plan.

## Why this one

`docs/game-catalogue.md` costed it as the cheapest game on the shelf, because it
is the shape already built: a stimulus on the big screen, a countdown every
device lands on together, an unforgeable buzz order, a lockout, a verdict, a
reveal, a scoreboard. What differs is that the stimulus is a question and not a
clip.

## What the quiz reuses unchanged

The room, the codes, the seats, the roster, the clock handshake, the snapshot
broadcast, the lockout, the answer window, the speed bonus, the scoreboard, the
final board, the corner menu, both themes — and, more usefully than any of
those, `normalizeAnswer` and `answerAppearsIn`. Typed mode already forgives accents,
punctuation and a slipped finger; a quiz answer needs exactly the same
tolerance, and reusing it means the same table of cases defends both games.

## What is genuinely new

- **A source of questions.** See the order above: a host reading them aloud
  first, then a French API. A curated file is the fallback — a few hundred
  questions are a JSON asset reviewed in a merge request, loaded once at boot. A
  database is what you need when questions are *written from inside the app*,
  and that is a feature, not a prerequisite.
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

The seam is already built — stage 11 did it. What this stage adds is arms:

- The `quiz` arm of `RoomSettings.game`, which already exists in
  `packages/protocol/src/game.ts` and is imported by nothing that runs.
- The `quiz` arm of `RoundView.content` and of `hostRoundContentSchema`, host
  and player scoped as ever: the player's arm carries the prompt and the
  choices, and never the answer or which choice is right.
- `packages/protocol/src/question.ts` exists and is unused. Read it before
  adding to it.

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
Choice mode, if the source turns out not to ship decoys — say so here rather
than authoring three hundred wrong answers to unblock it.
