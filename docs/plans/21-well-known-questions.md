# 21 — Questions the room has heard of

A quiz the host can hold to subjects everybody at the table knows, in French as
well as in English.


## Why

A family playtest asked for a difficulty control, and the room was entirely
French speaking — so a control that only worked on the English half would have
been worth nothing to it. [20](20-critical-css.md) shipped, the bank reached
8 355 rows, and the question of what difficulty is *made of* was deliberately
left to this stage because the answer needed measuring first.

Open Trivia DB declares an `easy | medium | hard` on every English row and the
cache already holds it, 4 510 of 4 510. Nothing declares anything on the French
half.


## What was measured before anything was written

**The French signal exists, and it is French Wikipedia traffic.** The PolyFact
ingestion already resolves a subject's French article and its sixty-day
pageviews, for 1 900 rows. The other 2 018 French rows come from OpenQuizzDB,
and every one of its packs carries a `wikipédia` field naming the article the
question is about — 1 744 of 2 084 upstream rows point at a real one. Filling
those in cost 1 248 title lookups and left **3 601 of 3 918 French rows rated**.
The 317 without an article are the word puzzles — ALPHAQUIZZ, MOTSCROISES,
ORTHOQUIZZ — which are about no subject at all.

**Three bands break the draw in French.** `drawQuestion` picks a category
uniformly and *then* a question inside it, so a level is only as good as its
thinnest category. Cut the rated French rows into thirds by traffic:

| | facile | moyen | difficile |
|---|---|---|---|
| arts | 604 | 765 | 794 |
| everyday | 246 | 283 | 291 |
| science | 100 | 34 | 20 |
| geography | 85 | 17 | **10** |
| sport | 64 | 29 | 21 |
| history | 43 | 13 | **5** |

A twenty-round *difficile* game draws about three history questions from a pool
of five. The English half has no such problem — its thinnest band is sport at
28, and every other category holds 77 or more.

**Cutting the thirds per category instead rescues the pools and ruins the
label.** Split each category into thirds *of itself* and history holds 20/20/21,
geography 37/37/38. But the boundary moves with the category: *difficile* starts
below 764 views in arts and below 6 079 in history, because French history rows
are almost all OpenQuizzDB — which links the *topic* of a pack — while arts is
mostly PolyFact, which links the individual *work*. One word, six scales.

**A single threshold behaves.** The tail is where the thin categories are
*already* thin, because a history question is about something famous anyway:

| threshold | arts | everyday | science | geography | sport | history | total |
|---|---|---|---|---|---|---|---|
| ≥ 1 000 | 1 271 | 495 | 134 | 101 | 92 | 55 | 2 148 |
| **≥ 2 000** | **919** | **374** | **122** | **94** | **87** | **53** | **1 649** |
| ≥ 5 000 | 544 | 218 | 96 | 78 | 61 | 43 | 1 040 |
| ≥ 8 000 | 416 | 142 | 66 | 67 | 49 | 32 | 772 |

**Zero views is not obscurity, it is a missing measurement.** 177 OpenQuizzDB
rows read zero: 152 because the pack's `wikipédia` field is bare, the rest
because it names an article that does not exist — *Noeud double* for what French
Wikipedia files under *Nœud*. Left as a number, the hardest bucket opened on
*who directed Apocalypse Now*. A threshold reads them as not-well-known, which
is the safe way round: they are dropped from a filtered game rather than
promoted into it.


## What is decided

- **One switch, not a level picker.** `isWellKnown` on every banked row, and a
  boolean on the quiz's settings that keeps only those rows. Off by default, so
  a room that says nothing plays the whole bank. It is the control the playtest
  asked for, it is the only one both languages can honour, and it costs the
  settings panel a `Switch` rather than a third segmented strip.
- **The row carries the verdict, not the evidence.** A pageview count would be a
  number nothing reads, unstable between rebuilds and meaningless across the two
  sources' scales. `isWellKnown` is the same shape as `isAdult`: a boolean the
  draw filters on, decided by the rule that owns the source.
- **Each source decides it its own way.** French: the subject's article drew
  **2 000 views or more** over sixty days. English: Open Trivia DB did not call
  it `hard`. Neither is the other's measure, and neither has to be — the field
  says what the room is promised, not how the source arrived at it.
- **The word is the blind test's.** `difficulty: wellKnown | mixed | obscure`
  already exists at the protocol root for the blind test, so *well known* is
  this repository's word for exactly this idea. The quiz's own arm is
  `isWellKnown` under `quiz.*`, not a second `difficulty`.
- **Open Trivia DB's three bands are not carried.** Recoverable from
  `.cache/opentdb-*.json` at any time, and a field nothing reads is dead weight.
  The day a hard mode has somewhere to work — the English bank could serve one
  today — is the day to add it.


## What it touches

`apps/server/scripts/question-source.ts` — `isWellKnown` on `BankedQuestion`.

`apps/server/scripts/frwiki-notability.ts` — the views half is already keyed by
article title; export the title-only entry point so a source that knows its
title need not go through Wikidata.

`apps/server/scripts/openquizzdb-source.ts` — read the pack's `wikipédia` field,
resolve the batch, set the flag.

`apps/server/scripts/polyfact-source.ts` — the subject's views are already in
hand where the cutoff is applied; carry them onto the row.

`apps/server/scripts/opentdb-source.ts` — read `difficulty`, set the flag.

`apps/server/src/infrastructure/questions/question-bank.ts` — the schema, and a
third multiplicative filter on `eligible` after categories and adult content.

`packages/protocol` — the arm on the quiz's `settings.game`.

`apps/game` — a strip in `settings-panel.tsx`, both dictionaries, a
`stacks-below()` threshold in `settings-panel.sass`, `STRIPS_EXPECTED` in
`e2e/strip-rows.spec.ts`.


## Left open for the session

- Whether the switch also holds when the room's questions are English. It reads
  the same in both halves, so the default is yes and the reason to split them
  would have to be found rather than assumed.


## How to tell it is done

- Every row in `question-bank.json` carries `isWellKnown`, and the counts match
  the table above — 1 649 French rows and 3 646 English ones.
- A room with the switch on never draws a question outside that set, proved by a
  test over the real bank rather than a fixture.
- The switch is visible on the host console in both locales, its strip does not
  overflow at 320 px, and a game played with it on is visibly easier — checked
  in a browser, muted.
