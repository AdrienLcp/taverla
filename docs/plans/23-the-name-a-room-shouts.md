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
| Open Trivia DB | 4 506 | **1 048** | **3 681** |
| OpenQuizzDB | 2 132 | — | — |
| Vikidia | 566 | — | — |

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

### Open Trivia DB — measured, then landed, 12 September 2026

The largest block in the bank and the only English one. It publishes no row id
(the prompt is hashed for one), no article, no entity — so **the count came
first**, and it is what decided the session. Of 3 844 askable answers:

- **738 have no article at all.** Those are the rows whose answer is a sentence
  rather than a name: *The inability to make decisions*, *2 722 ft*,
  *Snivy, Tepig, Oshawott*.
- **693 land on another concept through a redirect** — *July 4, 1776* on
  *United States Declaration of Independence*, *Tardar Sauce* on *Grumpy Cat*,
  *The Guggenheim* on *Solomon R. Guggenheim Museum*. This is the exact failure
  that killed OpenQuizzDB, and here it is **refused for free**: the landing
  title is compared against the spelling that was asked about, so a redirect
  that changed the subject shows up as a title that is not the answer.
- **2 413 reach an article of their own name**, and **1 338 of those name
  something rather than describe it** — 34.8% of the askable answers, against
  the third this file set as the bar. It passed by a point and a half.

**The gate that does the work is Wikidata's own labelling convention**: a proper
noun is capitalised, a common noun is not. *Japan*, *Madrid* and *Charlie
Chaplin* against *spoon*, *yellow*, *philosophy* and *chocolate*. 627 of the
2 413 are refused on it, which is the refusal OpenQuizzDB earned as a whole
source, applied one row at a time. Two classes needed naming beyond it: 87
answers are **classes** rather than things (`P279` — *Bulldog* is a dog breed,
*India Pale Ale* a beer style), and 361 are **Wikimedia's own pages about a
spelling**, whose label is capitalised and which hold no `P279`, so they clear
every other gate — *Lift*, *Libra*, *Turkic* and *Clyde* are all disambiguation
pages, and the aliases of one are the several unrelated things it lists.

**The query service is not the database, and that is the finding that travels.**
`rdfs:label` there is silent on Q9358 — Friedrich Nietzsche — and `wdt:P31` on
Q54173, General Electric: 66 of 2 407 entities came back unlabelled from SPARQL
and labelled from the action API, checked by hand on both. So the labels are
read from `wbgetentities`, and a missing `P31` is read as *unknown* rather than
as evidence. A gap that refuses is a gap that costs rows, and it would have cost
them silently.

**What landed: 1 048 of 4 506 rows take a second spelling, and 3 681 spellings
between them** — more rows than PolyFact's 864 and more spellings than its
2 248. *George H. W. Bush* answers to *Bush Senior*, *London* to *Londinium*,
*Felidae* to *cat family*, *Hoatzin* to *Opisthocomus hoazin*.

The decoys are resolved on the **loose** gate — the article being the spelling's
own, and nothing asked of the entity — and only for the rows whose answer
resolved, which skips three quarters of the spellings on the table. That is
PolyFact's rule reapplied: a wrong decoy id widens what the bank refuses and can
never widen what it pays.

**The residual is the homonym, and it is 13 rows.** *Longclaw* is Jon Snow's
sword and a genus of beetle; *Corvus* is a Black Ops antagonist and the crow
genus; *Gopher* is a Disney character and a family of rodents. Taxa are where
the capitalisation convention lies, because a scientific name is capitalised
while its `skos:altLabel` holds vernacular descriptions. It is **left as
measured rather than gated**: what a mislink yields is a spelling no room types
(*the Longclaw genus*, *crows and ravens*), the one that would cost — a spelling
naming the row's own decoy — is refused at ingestion and swept again over the
shipped bank, and a taxon filter would take *Velociraptor* answering *Raptor*
away with it.

### The language seam, and what it cost

`frenchAliasesOf` is now `aliasesOf({ entityIds, language })`, the filter
interpolated rather than literal. Naming was indeed the larger half, and the
**cache is the part this plan did not see**: one file per language rather than
one keyed by both, because a single file would make every English miss look like
a French entity nobody had asked for yet. The French file is moved rather than
rebuilt — it lives in `.cache/`, so another machine pays for its own.

## What is actually left

**Nothing.** All five sources are measured. Two fill the column from a Wikidata
identifier they were already carrying, one fills it from an entity linked
through the article of its own name, and two are refused with the reason written
above — on the rule this stage bought: **the pass transfers exactly where a
source's answers are named entities.**

## Protocol

**None.** `accepted` is already on `BankedQuestion` and already on the wire
wherever the answer is public. `PROTOCOL_VERSION` does not move.

## Files it touches

- `apps/server/scripts/wikidata-aliases.ts` — the language seam, earned and
  taken: `aliasesOf({ entityIds, language })`, one cache file per language
- `apps/server/scripts/enwiki-entities.ts` — new, and the whole of the English
  hop: a spelling to an article to an entity, on a strict gate for the answer
  and a loose one for the decoys
- `apps/server/scripts/opentdb-source.ts` — the pass, over the rows that can be
  paid for one
- `apps/server/src/infrastructure/questions/question-bank.json` — rebuilt
- `apps/server/src/infrastructure/questions/question-bank.test.ts` — the
  decoy-collision sweep is already there and already covers whatever is added
