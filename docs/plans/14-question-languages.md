# Stage 14 — The quiz picks its language

**Goal.** A second question bank, in English, and the control that chooses
between them — defaulted to what the host is reading and moving independently of
it afterwards.

**Depends on** stage 12, which built the quiz and left `QuizSettings.language` in
the protocol written by no UI, on purpose: while every row was French, shipping
the control would have shipped an option that always failed.

## The source, settled

[Open Trivia DB](https://opentdb.com) is the mirror of OpenQuizzDB and the same
object in every way that decided the first one: **CC BY-SA 4.0**, a bundled
asset rather than a service, and `incorrect_answers` carrying exactly three
candidates on every `type: multiple` row — so choice mode is free here too.

| | OpenQuizzDB (fr) | Open Trivia DB (en) |
|---|---|---|
| Licence | CC BY-SA 4.0 | CC BY-SA 4.0 |
| Author | Philippe Bresoux | PIXELTAIL GAMES LLC |
| Banked | 1 800 | **4 506** |
| Decoys | 3, checked per row | 3, checked per row |
| Anecdote | 1 438 of 1 800 | **none** |
| Adult rating | 92 rows | **none** |

**[OpenTriviaQA](https://github.com/uberspot/OpenTriviaQA) was measured and
rejected**, and it is worth recording why because it wins on every number:
49 716 questions, 42 715 of them with exactly four options, zero rows where the
answer is missing from its own options, same licence, repository still alive.
It loses on the only axis that matters when a question is read aloud to a room —
`Were was it raining for singer Buddy Holly?`, `Apolon` for Apollo, `AE` because
the ampersand of A&E did not survive the scrape, and rows that are not questions
at all (`In February of this year, the last episode of M*A*S*H was broadcast.`)
because they were written for a quiz round that supplied the year. OpenTDB
separates 5 298 **verified** questions from 10 883 pending and serves only the
first. Four thousand relied on beats forty thousand scraped when nobody can
retract a typo at the microphone.

[The Trivia API](https://the-trivia-api.com) is **CC BY-NC and API-only**, which
fails both the licence this repository ships under and the rule that a party
cannot depend on somebody else's uptime.

## What the drain costs, and why it is cached

There is no bulk download. `amount` is capped at 50, a session token guarantees
no repeat until a query is exhausted, and the documented rate limit is one
request every five seconds — so a cold run takes about a quarter of an hour.
Two details are not guessable and cost a run each if missed:

- **A page asking for more rows than remain is refused whole rather than served
  short**, so the tail of every rubric is only reachable by asking for less.
  `PAGE_SIZES` steps 50 → 10 → 1 for exactly that.
- **Everything is HTML-entity encoded by default** — `&amp;`, `&quot;`, `&#039;`
  reach a third of the prompts. `encode=url3986` round-trips through a decoder
  every runtime already has. A raw entity on a screen the whole room is reading
  looks like a rendering fault, which is the same class of bug as stage 12's
  stray anecdote dash.

Upstream publishes **no identifier**, so the prompt is the identity: the id is a
hash of it, which makes a rebuild stable — a room's `playedIds` survives one —
and collapses the handful of questions filed under two rubrics.

## The skew is worse than French, and it is the source's

Folded onto the six categories a host picks from:

| | fr | en |
|---|---|---|
| arts | 728 (40%) | **2 483 (55%)** |
| everyday | 588 (33%) | 446 (10%) |
| science | 160 (9%) | 631 (14%) |
| geography | 156 (9%) | 320 (7%) |
| sport | 116 (6%) | 160 (4%) |
| history | 52 (3%) | 466 (10%) |

Nine of OpenTDB's twenty-four rubrics are Entertainment, and video games alone
are 1 017 rows — a fifth of the English bank. A room that ticks no category will
meet a video-game question about once in five. **Left as it is**: the draw is
uniform over what is eligible, weighting it is a different change from ingesting
a bank, and `categories` already lets a table narrow. Recorded here so the next
person does not discover it mid-party.

The one place English is better is `history`, which French has 52 of.

## The language is the host's, and only the host's

Three things were settled with Adrien before any of it was built, and they are
the whole design:

1. **It is a room setting, not a locale.** Stage 12 already decided this, for a
   reason that has not moved: the interface locale is stored per *device*, so two
   players in one room can hold different ones, and drawing from them would deal
   each phone its own question.
2. **It defaults to the host's interface language**, which is the only evidence
   available at the moment a room opens.
3. **It moves independently afterwards.** A player may switch their app between
   English and French mid-game and the room keeps drawing what it was drawing.
   Verified in a browser rather than deduced.

### The default is a map, not an identity

`Locale` and `QuestionLanguage` are separate unions that happen to hold the same
two members. `questionLanguageFor` in `@taverla/core/quiz/question-language` is
the map between them, with English as the fallback — the day a third dictionary
ships with no bank behind it, a host reading it must be dealt a language the
bank has rather than an empty draw and `no_content_available` on the first round.
Its test is a tripwire as much as an assertion: it goes red on the locale that
has no bank, which is when somebody has to decide.

### `Locale` moved into the protocol

`POST /api/rooms` now carries the host's locale, so the set of locales is a shape
both sides agree on and belongs in `packages/protocol/src/locale.ts`.
`pickLocale` — negotiating one out of `navigator.languages` — is a rule and
stayed in core.

**The door carries the shell's fact, not the game's.** Sending
`questionLanguage` would have been one field cheaper and put a quiz setting on
the request that opens *any* room; what the server is told is what the host
reads, and each game decides what to do with it.

It is **defaulted rather than required**, because this door has no version
handshake the way the socket does: a tab opened before the field existed still
posts. `PROTOCOL_VERSION` is therefore unchanged — no peer can mis-read a frame.

## What English does not have

- **No anecdote.** `note` is `null` on all 4 506 rows, so an English reveal shows
  the answer alone where a French one has something to read out. The field was
  already nullable; nothing broke, and the asymmetry is visible on screen.
- **No adult rating.** `allowsAdultContent` filters nothing in English because
  nothing upstream is flagged. **The switch stays visible**: the setting is still
  honest — draw adult questions if there are any — and a control that appears and
  disappears as a language is flipped is worse than one with nothing to filter.
  Revisit if an English source with a rating ever lands.

## Done when

- A room opened from either front door draws in the host's interface language
- The control is on the host console, in the quiz's settings, and nowhere else
- A player switching their app locale mid-game changes their chrome and nothing
  about the questions
- Neither bank leaks into the other, asserted over four hundred draws per
  language
- Verified in a browser, muted, in both locales

## Where this stage stopped

**Done and covered.** The ingestion is three files — `question-source.ts` holding
what both upstreams produce, and one module each — and the French half rebuilds
from `.cache/` in a second, which is what proves the split. 246 tests.

`question-bank.test.ts` lost `[bank] has nothing to serve in a language it does
not hold`, which was a guard on a *decision* rather than on a rule, and gained
`[bank] stays inside the language the room is playing`. That swap is the stage in
one line.

`QUESTION_BANK_ATTRIBUTION` was a dead export — nothing but the test stub named
it — and went. The attribution the licence actually asks to travel with the work
is the `attributions` header of the bank, now one entry per source, and the menu
credit, now two lines.

**The bank is 2.75 MB** for 6 306 questions, and Zod parses the lot once at
boot — **380 ms measured**, under `tsx`, so the built server is quicker. Worth
watching rather than acting on: nobody is playing yet when it happens, and a
bank that no longer matches its schema is a broken deploy instead of a round that
fails in front of a room. A third language is where loading per language starts
to beat parsing everything.
