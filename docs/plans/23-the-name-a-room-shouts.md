# 23 — The name a room shouts

Typed mode is the default answer mode, and it pays only the spelling the bank
wrote down. `accepted` is where a row names the others it will pay for, and
`gradeQuizGuess` reads it with the decoy-distance guard already in place — so
the whole of this stage is **filling that column from sources that never wrote
one**.

Two of five sources fill it today. This file is the record of how, and the
argument for each of the three that do not.

## What has landed

| Source | Rows | With a second name | Spellings |
|---|---|---|---|
| Mintaka | 1 151 | 744 | 2 057 |
| PolyFact | 1 900 | **864** | **2 248** |
| OpenQuizzDB | 2 132 | — | — |
| Vikidia | 566 | — | — |
| Open Trivia DB | 4 437 | — | — |

**Mintaka**, 11 September 2026 — the session recorded in
[`22-thin-french-subjects.md`](22-thin-french-subjects.md). It built
`wikidata-aliases.ts` (French `skos:altLabel` over batched, resumable SPARQL)
and `acceptedOf` in `question-source.ts`, which is the rule deciding which
aliases the bank will pay for.

**PolyFact**, same day — no new machine, only the entity id that was already in
the data. Three things it settled:

- **The answer's id is in `fact_id`**, whose shape is
  `subjectQID|propertyID|objectQID`; the third segment is the answer. It is read
  there rather than through the labels because *Athènes* is two entities in this
  pack — the one label in 1 322 that a label-keyed lookup would have resolved
  with a coin toss.
- **A decoy's id is reached the other way**, through the positional alignment of
  `option_ids` with `option_a`–`option_d`. It has to be: `withDecoysSpread`
  moves a decoy to a row whose own `option_ids` never held it, so the map is
  built once over every candidate. The homonym problem is affordable *here* and
  not on the answer, because decoy ids are read to collect the names a wrong
  answer goes by — a wrong id widens what the bank refuses, never what it pays.
- **836 of the 3 084 aliases Wikidata offered were refused**, and every one of
  them is `acceptedOf`'s first rule: a spelling the matcher already forgives
  buys nothing. *Eric Rohmer*, *Andre Techine*, *Benoit Jacquot*.

The refusal that matters — an alias naming the row's own decoy — did not fire on
PolyFact, whose decoys answer the same relation as the answer. It is now stated
as a corpus test over the shipped bank instead of only at ingestion, so a source
that skips it shows up in `pnpm test` rather than in a room.

## What is left, and what each would cost

The blocker is never the aliases. It is **an entity id for the answer**, and the
three remaining sources fail to have one in three different ways.

### OpenQuizzDB — 2 132 rows, a title for the *subject*

It holds `wikipédia`, a French Wikipedia article URL, and stage 21 already
parses it to `article`. But the comment at `openquizzdb-source.ts:257` is
explicit that the title names **the question's subject, not its answer**: the
row about Clara Morgane's birthplace is filed under *Clara Morgane* and answers
*Marseille*. The answer is a bare string and nothing else.

Reaching an id means entity-linking a French label with no context but the
prompt — *Marseille* is a city, a football club and a soap. The honest version
of this is a `wbsearchentities` hop per distinct answer with the row's category
as a weak filter, and a census over what it returns. **Not obviously worth a
session**, and the first of the three to be measured rather than argued: count
the distinct answers first, then see how many resolve unambiguously.

### Vikidia — 566 rows, a title for the *page*

Worse than OpenQuizzDB, for the same reason one step further out: `subject` is
hand-written per quiz page in `QUIZ_SUBJECTS`, so roughly 170 subjects cover
~800 rows. It says what the page is about, never what a row answers. And the
answers are the least entity-shaped in the bank — *À environ 400 km*, *des
milliards de milliards*. **The yield here is small enough that it should be the
last one tried, if ever.**

### Open Trivia DB — 4 437 rows, nothing at all, and in English

The largest block in the bank and the only English one. It publishes no row id
(the prompt is hashed for one), no article, no entity. Two problems rather than
one:

1. Entity linking from scratch, from an English label.
2. **`frenchAliasesOf` is French-hardcoded** — the filter is literal in the
   SPARQL (`FILTER(lang(?alias) = "fr")`), and there is no language parameter
   anywhere in the module. Threading one through `frenchAliasesOf`,
   `aliasesOfBatch` and the cache key is the smaller half; naming it is the
   other, since the function stops being *French* anything.

It is also where the payoff is largest, because the English half is 44% of the
bank and takes none of this today.

## The order this would ship in

1. **Measure OpenQuizzDB before writing anything.** Distinct answers, and how
   many `wbsearchentities` resolves to a single entity whose kind matches the
   category. A number under a third means the whole approach is wrong for a
   source that only knows its subject, and that is worth knowing before the
   English half is attempted the same way.
2. **The language seam in `wikidata-aliases.ts`**, only once something needs it.
   Renaming a working French function to serve an English caller that does not
   exist yet is the abstraction anti-pattern this repo keeps refusing.
3. **Open Trivia DB last and on its own**, because entity linking 4 437 English
   labels is a census, not a script.

## Protocol

**None.** `accepted` is already on `BankedQuestion` and already on the wire
wherever the answer is public. `PROTOCOL_VERSION` does not move.

## Files it touches

- `apps/server/scripts/wikidata-aliases.ts` — the language seam, when earned
- `apps/server/scripts/openquizzdb-source.ts`, `vikidia-source.ts`,
  `opentdb-source.ts` — one at a time, never together
- `apps/server/src/infrastructure/questions/question-bank.json` — rebuilt
- `apps/server/src/infrastructure/questions/question-bank.test.ts` — the
  decoy-collision sweep is already there and already covers whatever is added
