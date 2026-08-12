# Stage 16 — Le Fake

**Goal.** The fourth game: a question with a surprising answer, everyone writes
a **lie**, the screen shows every lie beside the truth, and the room votes. You
score for finding the truth *and* for every player who fell for yours.

**Done.** The brief below is left as written; where the build disagreed with it,
the divergences at the end are the record — read those first.

## Why this one is next

It pays for **submit-then-vote**, the phase seven of the fourteen remaining games
in [`game-catalogue.md`](../game-catalogue.md) are waiting on — half the
catalogue behind one engine. Le Fake is the smallest game that exercises it
completely, which is what makes it the right one to build it against: collection
with a deadline, a reveal that does not leak authorship, a vote, a tally.

It is also the first game whose **wrong answers are worth points**. Every game on
the shelf so far pays for being right; this one pays for being convincing, which
is what keeps a table that does not know the answer in the game.

## The content question is already answered

The obvious worry — "it needs a bank of fill-in-the-blank statements, in French,
and nothing like OpenQuizzDB exists for that" — dissolves on inspection.

**The fill-in-the-blank shape is Jackbox styling, not a requirement.** What the
game actually needs is a question with a short, factual, surprising answer. The
repository holds **6 306 of those**, in two languages, with categories and an
adult rating, already drawn without repeats.

So Le Fake runs on the quiz bank. No second ingestion, no licensing question, no
deploy pipeline — the largest cost this stage looked like it had is not there.

Two consequences worth taking seriously before writing code:

- **The decoys become padding.** Three players produce three lies and one truth,
  which is a thin board. `decoys` already holds three authored wrong answers per
  question, so a short table can be topped up from them. That is a better answer
  than a minimum player count, and it exists for free.
- **Not every quiz question makes a good prompt.** The ones that work have an
  answer you can lie about plausibly; the ones that do not are those whose answer
  is a bare number, or where every wrong answer is obviously wrong. This is a
  judgement call on real data — draw a hundred at random and read them before
  deciding whether the bank needs a flag, a category filter, or nothing at all.

## What is genuinely new

**The submit-then-vote phase.** Everything else on the shelf has exactly one
player acting, or everyone racing the same clock to the same answer. This is the
first round with two collection phases and a tally:

1. **Write** — every seated player submits one lie, against a deadline.
2. **Vote** — the board is shuffled and shown; every player picks one.
3. **Tally** — points for the truth, points per player fooled.

`RoomPhase` is the thing to watch. It is `lobby → countdown → playing → buzzed →
revealed → finished`, and [`game-catalogue.md`](../game-catalogue.md) has said
since the beginning that it stays fused until a game needs a phase these names
cannot carry. **This is plausibly that game** — "everyone is voting" is not
`playing`, and forcing it into `buzzed` would be a lie. Decide it deliberately in
the session, with the catalogue's own argument in hand: splitting a phase costs
every check in the shell the ability to spell what it is checking.

## What it reuses unchanged

The room, the code, the seats, the roster, the clock handshake, the snapshot
broadcast, the scoreboard, the final board, both themes, both locales — and two
that matter more:

- **The role-scoped unions.** The truth must not reach a player's phone before
  the reveal, and neither must the authorship of a lie. That is the same problem
  as the blind test's title, with the same mechanism: separate host and player
  message unions plus `encodeChecked` stripping what leaked. Assert it over the
  whole round's transcript, as every game before it does.
- **`normalizeAnswer` / `matchesAnswer`.** Needed for the first guard below, and
  already tolerant of accents, case and a slipped finger.

## The two guards the game cannot ship without

Small, and non-negotiable — they are why this is two sessions rather than one:

- **A player writes the truth by accident.** It has to be detected and refused
  with "try another", or the true answer appears twice on the board and the vote
  is meaningless. `matchesAnswer` is the comparison.
- **Two players write the same lie.** Merge them and credit both, or ask one to
  rewrite. Merging is the better game — being twinned is funny and the scoring
  stays honest.

## Protocol

- A `lefake` arm of `RoomSettings.game` and of `round.content`, host and player
  scoped as ever: the player's arm carries the prompt and, at vote time, the
  shuffled board — never the truth and never an author.
- Its own message namespace, per the catalogue: `lefake.submit`, `lefake.vote`.
  `HOST_ONLY_MESSAGE_TYPES` partitions by prefix, so the guard survives.
- `verdictSchema` needs nothing: this round is scored by the server, not judged
  by the host.
- Bump `PROTOCOL_VERSION`, because an older client meets a `round.content` arm it
  cannot render.

## Decisions left open for the session

- **Does the answer mode axis apply at all?** Le Fake is neither `typed`,
  `choice` nor `buzzer` — voting is its own thing. Most likely it offers exactly
  one mode and the strip hides itself, the way the bare buzzer already does.
- **Does the host play?** The seat mechanism exists, but the host reads the board
  aloud and sees the truth. Probably not, and the reason is the same as buzzer
  mode's.
- **How long is each phase, and is it a setting?** A writing deadline is not a
  round duration; it may be the second mode-specific setting the catalogue is
  waiting for.

## Out of scope

Custom prompts written from inside the app. Images. Any second submit-then-vote
game — the engine is proved by one, and generalising it before there are two is
the anti-pattern this repository names in three places.

## Done when

- A full round runs: write, vote, tally, reveal, scoreboard
- No player frame carries the truth before the reveal, or the author of a lie
  ever — asserted over the whole round's transcript
- A lie that *is* the truth is refused; two identical lies are merged and both
  credited
- A three-player table gets a full board
- The other three games still run, unchanged
- Verified in a browser, muted, both locales, at 414 px and on a desktop

## What the build disagreed with

Five, and the last three are the ones worth reading.

**`RoomPhase` gained one name, not two, and did not split.** The brief expected
the writing phase to be new. It is not: "everyone submitting against a deadline"
is exactly what `playing` already means, and `answers` already carries the names
filling the screen. Only `voting` was missing. Adding a member to the fused enum
is the opposite of the split the catalogue warns against — it keeps every shell
check able to spell what it is checking, and the next submit-then-vote game gets
it free.

**The answer mode narrows to `choice` rather than gaining a fourth member.** The
vote *is* a pick from a shuffled list. A fourth `AnswerMode` would have forced
`blindtest.scoring.vote` and `quiz.scoring.vote` into both dictionaries —
`scoringKey` is a cross product — for two strings that mean nothing. The writing
phase belongs to the game, not the mode: the mode says how a round is answered,
the game says what ends up on the board.

**The vote pays no speed bonus**, and it is the only settle on the shelf without
one. Voting quickly is voting without reading the board, which is the half of
that round worth having.

**The host screen is sent nothing at all** — its arm is `{ kind: 'lefake' }`,
the second to end up empty and for a different reason from the bare buzzer's.
Everyone in the room is looking at that screen while they write, so an answer
rendered there is an answer on the wall. The brief had it carrying the question
"so the host knows which line is not a lie"; they learn that at the tally, like
everybody else. This came out of building the screen, not of reasoning about it.

**Two shell bugs surfaced that belong to no game**, and both were invisible to
the type-checker and to every test:

- the socket keeps its last error until it reconnects, so a refusal from the
  writing phase was still on screen under the board — the first game with two
  phases in one round is the first place that could show;
- react-aria sets a **native** custom validity from `isInvalid`, so a form
  holding a refused field silently ignores `requestSubmit()`. The one refusal
  this game is built around was therefore unrecoverable. Both are recorded in
  `.claude/rules/`.

## Settled after the stage shipped

**The screen was built for a table, and a room of ten broke it.** The board
stacked under the question, so it started 307 px down a 1080 px screen and ran
off the bottom: five of ten lines were visible, and the page was 2 797 px tall on
a television nobody scrolls. The vote is now two columns — the question and the
count of who has voted beside the candidates — and the board's type is divided
out of the box it is given rather than fixed, so a table of five keeps the full
billboard and only a room that wrote ten reads them smaller.

Two things that came out of measuring rather than reasoning:

- **Sub-columns inside the board would help, and cannot be had in CSS.** Ten
  lines fit at 20 px in one column on a 1366×768 screen and at 31 px in two —
  the extra wrapping does not eat the gain, which is what I first assumed. But
  the size can only be found by measuring the text: a `height ÷ rows` formula
  says 72 px where 51 px fits, and one conservative enough never to overflow
  lands back on 20 px. It needs a runtime fit pass, and that is the open call.
- **The scoreboard left the voting phase.** At ten players it was nearly 900 px
  and set the height of the whole grid, for standings nobody reads while they
  are choosing. It is one press away on the reveal.

**Both clocks are optional now.** `roundDurationMs` and `voteDurationMs` are
nullable, and the settings offer *Tu décides* beside the seconds. Nothing else
had to change on the server: `roundDurationMsOf` and `voteDurationMsOf` already
returned `number | null` for the games without them, `remainingRoundMs` already
answered `null`, and `host.reveal` already closed whichever of the two phases was
open. What was missing was on the screen — `HostActions` had no `voting` case at
all, so the host had no control during the vote, which only ever worked because
the clock always arrived.

**The board is capped at ten lines.** It shipped uncapped, and twenty-four
players meant twenty-five lines — a list nobody can hold in their head is not a
vote. The cost of capping is that a lie left off the board cannot be voted for,
so its author cannot be fooled *for*; that is real, and it is bounded twice.
`MAXIMUM_BOARD_SIZE` sits at ten so nine writers and the truth fit whole and no
ordinary table ever loses a line, and the half of the round a cut player keeps
is the larger one — they still vote, and finding the truth still pays two.

The surplus goes loneliest-first, at random among equals: a line two players
arrived at independently keeps two of them in the round for one slot, so it
outbids a line with a single author. Rotating who is cut across rounds was
considered and left out — it needs per-room state across rounds for a case
(ten or more writers) that is already degraded, and random is unforgeable.

Nobody is told their line was cut. At the sizes where the cap bites, the board
is already too long to audit for your own lie; if that ever needs saying, it is
a reveal-time string and a field on the player's view, not a change here.

`writtenPlayerIds` exists for a related reason: the shell's `answers` is
projected from the attempts a *graded* round accumulates, and a lie is graded by
nobody, so the count of who has written had to be the game's own.
