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

> **The three unknowns are answered, and the order above is void.** See
> [the source, settled](#the-source-settled) — there is no API, the fallback is
> the only option, and it is the better one. Read that section before this one.

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

## The source, settled

**There is no OpenQuizzDB API.** `api.php` and `api_config.html` soft-404 onto
the landing page, the API is documented only in a PDF nothing links to any more,
and the data mirror the old docs pointed at is a parked domain. What they
publish now is downloads, and the answers to the three unknowns fell out of
reading one:

| Unknown | Answer |
|---|---|
| An API key | None to get. The packs are public and need no account |
| Licence | **CC BY-SA 4.0**, named in every pack's own header alongside its author |
| **Decoys** | **Yes.** `propositions` is four candidates, one of which is `réponse` |

So the "fallback" is the only option and it is the better one: a bundled asset
cannot go down in the middle of a party, which a live API can and a blind test
already does.

**What the packs actually are.** 516 themed packs of **four questions each** —
the free tier is a taster, not the 285 348 questions the site advertises
holding. `apps/server/scripts/build-question-bank.ts` ingests them, and the
numbers it produced are **1 708 questions over 427 packs, 780 KB, zero
rejections**: every pack carried exactly four propositions with the answer among
them, which is checked per question rather than trusted.

Two rubrics are refused with reasons in the script, because a rubric that simply
went missing reads as an oversight. **QUADRIQUIZZ** asks for four answers and
the pack carries one; **MOTS CROISÉS** is a crossword clue that names the
length and the first letter. **POUR ADULTES** is skipped as a room where anyone
can scan the code.

**The distribution is lopsided** and worth knowing before the picker is built:
arts 636, everyday 588, science 160, geography 156, sport 116, **history 52**.
Every category is the default, so it does not bite until a room ticks one.

**`accepted` is empty on every row.** Upstream names no alternate spellings, so
typed mode rests entirely on the matcher's own tolerance. The field is on the
schema and can be filled later without touching it.

## What the second game corrected in the first

Four things, and they are the reason a second case is worth having:

- **`answerAppearsIn` is not reused, contrary to what this plan said above.**
  Searching *inside* a line is what makes the blind test's single field honest,
  because that field holds two claims and a room types them together. A question
  holds one, and containment would pay a hedge: "trois ou quatre" contains the
  answer to how many languages Switzerland has. `normalizeAnswer` and
  `matchesAnswer` are reused; `answerAppearsIn` is the blind test's.
- **`pointsFor` never moved to `blindtest/`.** Stage 11 already found it reads
  either shape; it lives in `scoring/verdict.ts` with `isMiss`,
  `verdictKindFor`, `nothingScored`, and now `isFullyBanked` and
  `pointsForSimultaneousAnswer`.
- **`yourVerdict` is the whole union, not the halves arm.** Stage 11 reasoned
  that a game judged on one claim has no half to hold. True, and beside the
  point: a claim the *server* judges in silence needs the same feedback a pair
  of halves does. Without it a player who is already right keeps typing, and the
  refusal they eventually get says "you have had your go".
- **The simultaneous path was still entirely the blind test's shape.** Stage 11
  opened the seam on the host-judged buzzer only. `PlayerAttempts.verdict`,
  `grade`, `bank`, `everyoneIsDone` and `settleSimultaneousRound` were all
  `HalvesVerdict`, and generalising them was the real work of this stage — not
  the questions.

`not_implemented` is now used nowhere, which is what the protocol rule said
should happen to it as the stages land.

## What the screens turned out to be

The stage shipped in two sessions: the server first, then the screens, and the
second half is where the shelf's own vocabulary moved.

**Four strings left a game's namespace**, and the i18n rule's test decided each
one: would the second game show this unchanged? The host's right/wrong pair is
`host.verdict.*` where it was the bare buzzer's, and the field a simultaneous
round is answered in is `round.answer.*` where it was the blind test's. What
stayed behind is what only one game can say — the halves, and "it was".

**The clip's drain bar was the round's all along.** `.clip-progress` is
`.round-progress`, drawn whenever `roundDurationMsOf` is not null rather than
whenever the game is a blind test, and nothing else changed: a question has a
duration for the same reason a clip does.

**The question is rendered by the two screens, never by the answer forms.** The
host console shows those forms too when its owner has taken a seat, and a prompt
inside them would have been read twice on that one screen.

**`AskedQuestion` is one component for both surfaces**, in
`presentation/components/`, sized off `vmin` like everything else here. It is
read at four metres and in a hand, and two components would have been the same
clamp written twice.

**The verdict panel takes the content, not a track.** It held a `HostTrack` and
a `GameKind` — the same fact twice, and only the blind test's half of it. It now
takes `HostRoundContent` and renders whichever arm it got; `holdsTheAnswer` is
the guard that used to be a `game.kind !== 'blindtest' || track !== null`.

**The reveal defaults to one column.** Only the blind test has anything to print
beside its words, so the two-column grid is a `with-cover` modifier rather than
the base — the quiz's answer and the bare buzzer's scoreline are the ordinary
case now, not the exception.

**One content bug surfaced the moment a screen rendered it.** Upstream keeps its
`anecdote` field when it has nothing to say, and leaves `-`, `P` or an empty
string there — 362 of 1 800 rows. `build-question-bank.ts` drops an anecdote
with no sentence in it, and the bank was rebuilt from the cache.

**The language control is still not shipped**, and that is a decision rather
than an omission: every row in the bank is French, so a host who picked English
would get an empty draw and the "nothing left to play" error —
`question-bank.test.ts` asserts exactly that. The field stays in the protocol,
written by no UI, which is what gives the bank's own `language` column meaning
and makes a second bank one `if` in the settings panel. A player whose interface
is in English is served French questions with English chrome, which is what the
blind test already does with French titles.

## Where this stage stopped

**Done and covered**: the protocol arms, the generalised simultaneous path, the
bank and its ingestion script, the server round in all three modes,
`quiz-game.test.ts` — eight tests including the whole-transcript assertion that
no player frame carries the answer, an accepted spelling, a note, or
`correctChoiceIndex` — and both screens, verified in a browser at 414 px and on
a desktop, in both locales, muted.

`quiz` is **in `shelvedGames`**, and `PROTOCOL_VERSION` is 8 so a tab left open
across the deploy reloads rather than meeting a round it cannot render. The two
sets now hold the same three games, which is what shipping every game looks
like: the distinction exists for the window between a game being served and
having screens, and this one spent a stage in exactly that window.

**Raised and done**: `no_tracks_available` was the protocol code a quiz that has
run out of questions sends, and it said "tracks". It is `no_content_available`,
across the Deezer client's own error union, `routes.ts`, both dictionaries and
the harness.
