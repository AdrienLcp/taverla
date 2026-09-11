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

### OpenQuizzDB — measured 11 September 2026, and the answer is **no**

It holds `wikipédia`, a French Wikipedia article URL, and stage 21 already
parses it to `article`. But the comment at `openquizzdb-source.ts:257` is
explicit that the title names **the question's subject, not its answer**: the
row about Clara Morgane's birthplace is filed under *Clara Morgane* and answers
*Marseille*. So the answer has to be entity-linked from its bare label, and the
obvious hop is the label's own French Wikipedia article.

**It resolves, and resolving is not the problem.** 2 132 rows, 1 956 distinct
answers, 1 327 of them landing on a real entity — 68%, which reads like a green
light and is not one. Two findings kill it:

- **15% of the resolutions change the concept.** 204 of the 1 327 land on a
  title that is not the answer, through a redirect nothing warns about:
  *Double coeur* → **Microprocesseur multi-cœur**, *Mensuelle* → **Mois**,
  *Urologue* → **Urologie**, *Abdominaux* → **Muscles abdominaux
  antérolatéraux**. `acceptedOf` cannot catch one: its guard refuses a spelling
  that names the row's own *decoy*, not one that names an unrelated thing. Those
  would be banked and paid.
- **Where the entity is right, a common noun's aliases are its neighbours, not
  its other names.** *Bleu* offers *pervenche*, *turquoise*, *marine*, *azur*;
  *Concombre* offers *concombre hollandais* and *concombre libanais*. Banking
  those pays a room that typed **turquoise** for a question answering **Bleu** —
  which is the exact failure this whole column exists to prevent, inverted.

**The safe sliver is 120 rows of 2 132.** Gate on the answer being a human
(`P31 = Q5`) *and* the article title being the answer itself, and 213 answers
survive, 113 of them carrying a usable alias — *Sergio Leone* as *Bob
Robertson*, *France Gall* as *Babou*, *Michel Berger* as *Michel Hamburger*.
Real, and 5.6% of the source. Not a session.

**The rule this bought, which is bigger than the source:** the alias pass
transfers to a source exactly when its answers are **named entities**. A person
has one identity and several spellings of it; a common noun has one spelling and
several neighbouring concepts, and `skos:altLabel` does not distinguish the two.
Mintaka and PolyFact are Wikidata-derived and answer entities by construction,
which is why it worked there and nowhere else so far.

### Vikidia — 566 rows, a title for the *page*

Worse than OpenQuizzDB, for the same reason one step further out: `subject` is
hand-written per quiz page in `QUIZ_SUBJECTS`, so roughly 170 subjects cover
~800 rows. It says what the page is about, never what a row answers.

**The rule OpenQuizzDB bought settles this one without a measurement.** Vikidia's
answers are the least entity-shaped in the bank — *À environ 400 km*, *des
milliards de milliards*, *On ne sait pas*, *elles explosent*. Almost none is a
named entity, so almost none has another name. **Drop it.**

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

## What is actually left

Two of the three are now closed, and by one rule rather than by three
measurements. **What remains is Open Trivia DB, and the question to ask it is
not the one this file opened with.** It is not *can an English label be
entity-linked* — it is **how many of its 4 437 answers are named entities at
all**, because that is what decides whether the pass transfers. *Trees*, *Spoon*
and *Yellow* are not; its history, geography and arts rows largely are.

So, in order:

1. **Count OTDB's named-entity answers first**, the cheap way: the share of
   distinct answers whose English Wikipedia article title is the answer itself
   and whose entity is not a common noun. Under a third and the source goes the
   way of OpenQuizzDB, for nothing but a script.
2. **Only then, the language seam in `wikidata-aliases.ts`.** The filter is
   literal in the SPARQL (`FILTER(lang(?alias) = "fr")`) with no language
   parameter anywhere, so threading one through `frenchAliasesOf`,
   `aliasesOfBatch` and the cache key is the mechanical half; naming it is the
   other, since the function stops being *French* anything. Doing this before
   step 1 would be renaming a working function to serve a caller that may never
   exist.
3. **The English half is where the payoff is**, if the count allows it: 4 437
   rows, 44% of the bank, taking none of this today.

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
