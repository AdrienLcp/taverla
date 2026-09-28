# Stage 22 — The four subjects the French bank barely has

**Depends on** no code. It depends on one measurement, which lives in the doc
comment of `[bank] leaves every subject an evening of well-known questions` and
is repeated here because it is the whole argument for the stage.

## The measurement

Rows per subject in the bundled bank, by language:

| | Arts | Everyday | Science | Geography | Sport | History |
|---|---|---|---|---|---|---|
| **French** | 2 258 | 1 261 | 170 | 156 | 123 | **64** |
| **English** | 2 450 | 438 | 612 | 317 | 156 | 464 |

**87% of the French half sits in two subjects.** The English half spreads over
six. French history holds sixty-four rows *in all* — not sixty-four easy ones,
sixty-four — so a host who ticks *Histoire* and nothing else has run the subject
out in one evening, and fifty-three of them with `wellKnownOnly` on.

The draw takes a category before it takes a question, so it is this cell that
decides what a room can do, never the total. That is the same finding stage 21
landed on, one floor lower: stage 21 said a level is only as good as the category
it thins most, and this says the category was already thin before any level
touched it.

## Goal

Give the four thin French subjects the depth the English half already has, so
that ticking one of them is a real evening — and so that the graded picker the
blind test offers becomes an honest thing to build for the quiz.

**Target: 300 French rows in each of history, geography, science and sport.**
That is where the English half sits, and it is what lets three bands deal a
hundred questions each rather than twenty-one.

**No single source reaches it**, and the hunt below is what says so rather than
a guess: the biggest candidate has no science at all, and the one that does is a
children's encyclopedia. So the stage is scoped to **two sources**, chosen to
cover each other's blind spot, and it is finished when the four subjects are
measured — not when both have been ingested.

## What this stage is not

**It is not a difficulty rating, and a rating must not be attempted before it.**
Rating the bank harder would re-slice sixty-four French history rows into three
bands of twenty-one. The picker is blocked by how many questions a subject holds,
not by how well they are graded — so a rating done first is the second half of
the job done before the first, and it would read as progress.

Two further reasons the current rating stays as it is:

- **It is measured and rebuildable.** `isWellKnown` comes from the sixty-day
  traffic of a subject's Wikipedia article, or from Open Trivia DB's own label,
  and `pnpm --filter @taverla/server questions:build` reproduces every value from
  `.cache/` in seconds. A judgement handed down by a model is reproducible by
  nothing: a rebuild either re-spends it or freezes it in a file no later reader
  can re-derive or argue with.
- **The one hand-read artefact this repo keeps carries its reasons.** Every row
  of `choice-only-questions.json` holds a `why`, and every repair in
  `question-repairs.json` does too, precisely so a later reader can disagree with
  the judgement rather than guess at it. A difficulty column of eight thousand
  unexplained verdicts is the opposite artefact.

## Where subagents pay, and where they do not

They do **not** rate difficulty, for the reasons above.

They **do** read a new source row by row, which is the job every source so far
has owed and which no rule performs:

- `choice-only-questions.json` holds **695 rows**, each read and each carrying
  the sentence that says why a text field cannot win it. The regex that stood in
  for that reading caught three quarters of the marked rows and excluded 154 that
  were perfectly answerable.
- `question-repairs.json` holds **238 rows** — answers with a shelf life, decoys
  that answer the prompt too, notes naming a sitting president who no longer is.

That reading is judgement, it splits cleanly by pack or by subject, and every
verdict comes back with a reason that can be checked against the row. It is the
one part of a new source that parallelises, and the part that decides whether the
source is worth having at all.

**A subagent's verdict is a proposal, not a commit.** Each comes back as an id, a
verdict and a `why`; the session reads the reasons before any of them reaches a
JSON file, the same way the three current censuses were kept.

## Candidates

Every licence below was read at its own source on **10 September 2026**, and
every count was measured by downloading the corpus rather than taken from a
dataset card. Re-read the licence before ingesting: it is the one field that
changes without the data changing.

| Source | Licence | French rows | History | Geography | Science | Sport | Decoys |
|---|---|---|---|---|---|---|---|
| **Mintaka** | CC BY 4.0 | 11 404 usable | 831 | 809 | **none** | 432 | buildable |
| **Vikidia** | CC BY-SA 3.0 | 1 373 | 138 | 119 | **133** | 47 | shipped |
| **MMMLU** `FR_FR` | MIT | 14 042 | ~930 | ~300 | ~1 600 | **0** | shipped |
| INCLUDE | Apache 2.0 | 419 | 52 | 47 | 16 | 0 | shipped |
| Qulture | CC BY 4.0 | **16** | — | — | — | — | shipped |

The subject columns are what survives filtering, not what the corpus claims.

### Mintaka — first, and the only one that reaches four figures

`https://github.com/amazon-science/mintaka` · CC BY 4.0 in `LICENSE.md`.

Twenty thousand questions, **all translated into French**, eight categories of
2 500. Three `curl`s on raw GitHub and it is cached. Its answers carry **Wikidata
QIDs**, which is the one thing on this list that plugs into machinery already
written: PolyFact's decoy builder works on it unmodified.

Three catches, all serious:

- **The answer is never translated.** `answerText` stays English; only
  `answer.answer[].label.fr` carries French, and only for entity answers. The
  37% that are numerical, boolean, date or string have no French text at all —
  which is why the usable figure is 11 404 and not 20 000.
- **Written by American crowdworkers, then translated.** Sport is 48% US markers,
  politics 31%, history 22%, and the translation slips — *le principal tournoi
  d'**or*** for golf, *quel **receveur éloigné*** for wide receiver.
- **Dated.** Questions anchored *as of 8 October 2021*, with superlatives that
  have moved since.

### Vikidia — second, exactly where Mintaka is blind

`https://fr.vikidia.org/w/api.php`, namespace 104 · CC BY-SA 3.0, asserted by the
API itself.

1 460 questions over 175 parsable pages, **science 133 and sport 47 with decoys
shipped**, and written in French rather than translated into it. Seven requests
fetch the whole corpus. It is small, but it is the only open French-native source
found with any science in it.

The catches: written for eight-to-thirteens, so easy; spelling faults in the
source itself; two to six options rather than four; 87 multiple-answer rows;
fan-fiction noise to filter; near-duplicate pages; and a wikitext parser to write.

### MMMLU `FR_FR` — third, and only if the exam register is acceptable

MIT, professionally human-translated, ~1 600 French science rows. It is a
benchmark rather than trivia: multi-sentence stems, and MMLU's labelling noise
survives translation — a race-car kinematics problem filed under
`college_medicine`. Expect to throw most of it away.

### Do not search these again

- **FQuAD**, **QFrCoRE** — CC BY-**NC**. Non-commercial, so unusable here.
- **Qulture's live corpus** — 818 French rows behind a clean API, but the terms
  reserve every right; only the 16 rows published on data.gouv are licensed. An
  email to the publisher is the only way in, and it may be worth sending.
- **quizz.biz** — 632 962 quizzes, the largest French bank there is, all rights
  reserved.
- **EXAMS** — CC BY-SA 4.0 and decoys shipped, but the French subset is 318 test
  rows and nothing else.
- **manu/french-trivia**, **SimonLeclere/JsonQuizz** — no licence declared at all.
- **data.gouv.fr** — its API returns **zero** datasets for *quiz*, *QCM* or
  *trivia* beyond Qulture and 258 civic-exam rows. A real dead end.
- **Kaggle** — nothing French; its trivia sets are re-uploads of Open Trivia DB.
- **PIAF, SQuAD-fr, Belebele** — extractive: the question means nothing away from
  its paragraph.
- **There is no French Open Trivia DB.** The place is occupied by OpenQuizzDB,
  which is already ingested.

**One find that is not a source**: `github.com/Zeuh/OpenQuizzDB` (CC BY-SA 4.0)
mirrors the pack files this repo already ingests, as `.json`/`.csv`/`.sql`/`.xml`
with an `If-Modified-Since` refresh script. It is a cleaner bulk route than
POSTing `download.php` per pack and scraping the URL out of the response, which
is what `openquizzdb-source.ts` does today. Worth a look the next time that
ingestion is opened, and worth nothing on its own.

## What session A found, 10 September 2026

**Mintaka is ingested and three of the four subjects are done.** French history
64 → **519**, geography 156 → **650**, sport 123 → **368**, all past the 300
this stage was scoped to. Science stays at 170 and is untouched, which is
Vikidia's whole job. 1 194 rows banked out of 20 000; the bank is now 9 663.

Three things the plan had wrong, each corrected in code and worth reading before
the Vikidia session repeats one of them:

- **PolyFact has no decoy generator.** The plan promised "decoys off the
  Wikidata QIDs through PolyFact's existing generator", and there is no such
  thing: PolyFact's rows arrive with four candidates and `withDecoysSpread`
  only *redistributes* them. Mintaka ships none at all, so the decoys had to be
  built — `wikidata-kinds.ts` is the new module and it is what the named risk
  cost. **Vikidia ships its own decoys**, so this does not recur there.
- **The American half needed no word list.** The settled call was *the NBA
  stays, the NFL and MLB go*, and a marker rule cannot find them: the French
  translation of *Rebels d'Ole Miss* names no league. The notability bar on the
  answer does it instead and does it better — a French room's Wikipedia traffic
  keeps Michael Jordan and the Lakers and has never opened *Dennis Leonard* or
  *Hiram College*. The decision is honoured; the instrument is not the one the
  plan named.
- **Four of the nine question shapes are usable**, not all of them. The three
  refused each fail structurally rather than by degree — see
  `mintaka-source.ts`, which names them.

### What session A did not do

All three were done on 11 September 2026 — see below.

## What the spellings session found, 11 September 2026

**The short-name spellings are banked.** `wikidata-aliases.ts` fills `accepted`
from French `skos:altLabel`, and `acceptedOf` in `question-source.ts` decides
which of them the bank will pay for. **769 of the 1 194 banked rows now hold a
second name, 2 119 spellings, every one of them refused by the grader before**;
140 accept a strict shortening of their own label. The estimate the plan
carried — 170 rows — counted rows whose label *could* be shortened, and 140 is
how many Wikidata actually holds the short form for.

**The census found almost no `choiceOnly` and a great deal of falsehood.** Seven
rows out of 1 194, where the two French banks before Mintaka gave 695 — a
Wikidata-backed row answers one entity by construction, so the sentence naming a
set is the exception rather than the rule. **Forty-five rows are wrong** instead:
Wilson in office during the Depression, Booth as an assassinated president,
Churchill through the Berlin blockade, the Terracotta Army under the Qing, a
Summer Olympics of 2019. They are `drop` entries in `question-repairs.json`, one
repaired rather than dropped. **A source translated from English crowdwork fails
by being false, not by being unanswerable** — so the artefact it fills is the
repairs file, and a later source should be read expecting that.

**The decoy rung is the subject's to choose.** `poolFor` read the discipline
before the trade everywhere, and Wikidata records a sport for anybody who ever
played one, so seven of the eight history rows the sport rung reached were dealt
athletes — Tom Brady beside Joe Biden. A sport question asks the discipline
first and every other subject asks the trade. It costs one row: Jackie Robinson's
widest occupation is *military officer*. The measured shape of the defect was
narrower than the handoff's note: **sport rows falling back to a trade are not a
defect at all** — Simone Biles, Tiger Woods and Max Verstappen fall to *gymnast*,
*golfer* and *racing driver*, which is the right bucket.

Two things the earlier session found that the plan did not name:

- **An alias can be the name of the row's own decoy, under a spelling the
  labels do not share.** Wikidata files Augustus as *Gaius Julius Caesar*, and
  *Jules César* is printed beside him as a wrong answer. Comparing the alias to
  the three labels finds nothing, so the decoys are resolved to entities and
  refused by every name *they* answer to. It is the one refusal in `acceptedOf`
  that needs a second Wikidata lookup, and it is the only one that would have
  paid for a wrong answer.
- **`drawQuestion` was quadratic**, rebuilding each category's array once per
  eligible row: twelve milliseconds a draw, and one corpus test had started
  timing out at random. `Map.groupBy`, which the module already used one line
  above. Unrelated to the stage and fixed on sight.

**PolyFact carries the same defect and is out of this stage.** Its rows hold
Wikidata identifiers too and its answers are people — *Jean-Luc Godard* typed
as *Godard* is graded wrong the same way. It banks arts and everyday, which is
neither of the subjects stage 22 exists for, so the seam is named here rather
than opened.

## What the Vikidia session found, 11 September 2026

**Science is at 339 and the stage's four subjects are all past 300.** Vikidia is
the bank's fifth source and its only French-native one with science in it: 265
quiz pages in namespace 104, seven requests, CC BY-SA 3.0. **566 rows banked out
of 765 ingested**, and the bank is 10 186.

| Subject | Before | After |
|---|---|---|
| Science | 170 | **339** |
| Geography | 640 | 685 |
| History | 499 | 516 |
| Sport | 355 | 390 |

**The corpus is worse than any other this bank has taken, and the number is the
finding**: 373 of the 566 banked rows were flagged by the census — 194 dropped,
135 marked choice-only, 44 repaired. Mintaka's census flagged 52 rows in 1 194.
Three things account for it, and each is what a wiki written by children for
children produces:

- **A quiz page is read in order, so its rows use pronouns.** *Où est-elle
  née ?* names nobody once a room is dealt one row. This is the single largest
  defect — about a hundred and sixty rows — and it is the same one OpenQuizzDB
  had, at forty times the rate.
- **Eighteen per cent of what survived parsing is choice-only**, against seven
  rows in 1 194 for Mintaka. A row asking a panda's tail length in centimetres
  is a question only beside its own four candidates.
- **Falsehood, as Mintaka had**, though less of it: the Latin genus of the lynx
  printed as a wrong answer, seven Koopalings banked as eight, a red fox litter
  capped below two of its own decoys, Vivaldi dead in June.

**The unbound pronouns were dropped rather than repaired outside the four thin
subjects.** Rewriting a hundred and sixty French sentences to rescue questions
about *Lune Claire* is writing questions rather than ingesting them, which stage
12 put out of scope — and they sit in `arts`, which holds 2 510 French rows and
needed none of them. Inside science, geography, history and sport the subject
was put back by hand, which is 44 repairs, every one of them re-read against its
row. **Every answer correction was verified individually**, because those are
the only repairs that can pay a player for a wrong answer.

### What the parser had to learn

- **A template is content, not decoration.** `{{unité|-63|°C}}` deleted leaves
  *la température moyenne sur Mars est à peu près de…* with three empty
  candidates. Ten templates are unwrapped to what they print and **a row still
  holding one is refused**, because a sentence with a hole in it is worse than a
  row the bank does not have.
- **The `type` marker lies.** `type="()"`, `types="()"`, `type={}` and
  `type="{}"` all appear over single-answer rows, and the same marker sits over
  fill-in-the-blanks. Counting the `+` lines is the only rule that holds.
- **Four candidates is where the corpus is thin.** 401 rows carry three and 131
  carry two; the bank's shape asks for exactly three decoys, and inventing a
  fourth is writing the question. They are the largest thing left on the table —
  101 of them are science.
- **The page title is the whole of the subject signal.** Vikidia's own
  categories say `Quiz` on 561 rows out of 827, so `QUIZ_SUBJECTS` maps all 180
  pages by hand. Ten are about the wiki itself and map to nothing.
- **Redirects have to be followed before the rating**, and locally rather than
  in `frenchViewsOfTitles`: *Animaux* redirects to *Animal* and scores three
  hundred readers on its own, which would have rated the source's largest
  science block as one nobody has heard of. Following them in the shared rule
  would move every row the other sources already banked.

### One test was flaky before this stage and is fixed

`[bank] draws them once the host has` sampled 400 draws for a rating carried by
107 rows. The category is drawn before the question, so an adult row's chance is
0.73% a draw and four hundred of them miss every one about **one run in
twenty** — a red that says nothing, and a green that would have missed a broken
filter just as often. Both halves now draw two thousand. Vikidia's 252 French
arts rows moved the miss rate from 4.3% to 5.4%, which is what surfaced it.

### What is left, and what it would buy

- ~~**The 3-candidate rows.**~~ — **done**, 28 September 2026. Counted again
  they were 383 (the 401 included rows refused for something else too), and
  each took a fourth candidate written by hand against its row, in
  `apps/server/scripts/vikidia-fourth-decoys.json`. Ten stay refused as closed
  sets — *Oui / Non / On ne sait pas*. 356 reached the bank, science
  339 → 435, and writing them caught four rows the source had wrong.
- **MMMLU `FR_FR`**, still unargued: ~1 600 French science rows, MIT, decoys
  shipped, exam register. It is the only remaining depth for the subject.
- ~~**`frenchAliasesOf` for PolyFact**~~ — **done**, 11 September 2026, and it
  turned out to be the smaller half of its own question. See
  [`23-the-name-a-room-shouts.md`](23-the-name-a-room-shouts.md) for the three
  sources it does *not* reach and what each would cost.

## The order this ships in

1. **Mintaka first**, because it is the only candidate that reaches four figures
   in French and the only one that plugs into a decoy builder this repo already
   has. **Vikidia second**, for the science Mintaka does not have at all. Read
   both licences again before writing a line: it is the field that changes
   without the data changing.
2. **`apps/server/scripts/<name>-source.ts`** — the shape is proven three times
   over. It exports one `ingest…` returning `IngestedQuestions`
   (`attribution`, `questions`, `rejections`), fetches through `cached` so a
   rebuild costs seconds, and sets every field of `BankedQuestion` including the
   `choiceOnly` the source knows about and `isWellKnown`.
3. **Rate it.** A French source goes through `frenchViewsOfTitles` if it names a
   Wikipedia article, and is rated `false` if it names nothing — *not measured*
   rather than *obscure*, which is stage 21's direction and the safe one.
4. **The census**, by subagents, over the rows the build reports as banked.
5. **Credits.** `QUESTION_CREDITS` in `credits-page.tsx` is hand-kept in step
   with the `attributions` header of `question-bank.json`; both need the entry,
   and both dictionaries need the `credits.<source>` string saying what was
   changed.
6. **Rebuild, and read the report.** `questions:build` prints per-category
   counts, the unwinnable rows, the repeated prompts and the stale census
   entries. The repeated-prompt list is where a source that mirrors an existing
   one shows itself.
7. `pnpm validate`, then the changelog.

## Protocol

**None.** A source lives entirely behind `BankedQuestion`, which is the server's
own shape and reaches no wire. `PROTOCOL_VERSION` does not move, and a tab left
open across the deploy keeps playing.

## Files it touches

- `apps/server/scripts/<name>-source.ts` — new
- `apps/server/scripts/build-question-bank.ts` — register the source in `run()`
  and in the three `report` calls
- `apps/server/scripts/choice-only-questions.json` — the census
- `apps/server/scripts/question-repairs.json` — where a row is wrong rather than
  unanswerable
- `apps/server/src/infrastructure/questions/question-bank.json` — rebuilt
- `apps/server/src/infrastructure/questions/question-bank.test.ts` — the corpus
  tests sweep every row and need nothing new, except a floor over the four
  subjects this stage exists to fill
- `apps/game/src/features/credits/credits-page.tsx` and both dictionaries

## Decisions left open for the session

- **Settled on 10 September 2026 — do not re-open.** How much of Mintaka's
  American half to keep: **the NBA stays**, because basketball is followed in
  France, and the rest of the US-marked sport goes with the NFL and MLB. The
  trade was put with its number — dropping all of it takes sport from 1 312 rows
  to 432 — and taken knowingly: a French table that cannot answer the question is
  worse than a thinner subject. How many the NBA puts back is the session's to
  measure. **Sport stays the thin subject, and that is accepted.**
- **Both sources are taken.** Mintaka and Vikidia, in that order, adapted rather
  than ingested raw. That was the call on the same day, so the plan's scope is no
  longer a question.
- **Whether MMMLU's exam register is acceptable at all.** It is the only real
  depth in French science — ~1 600 rows, MIT, decoys shipped — and it reads like
  a paper rather than a party. Ingesting it and throwing most of it away is a
  session of reading. Vikidia's 133 rows may simply be enough for now.
- **Whether to email Qulture.** 818 French rows behind a clean API, better formed
  than anything else found — each with an anecdote and a dated source URL — and
  all rights reserved. One email is the whole cost of finding out.
- **What the graded picker would be called.** Not this stage's work, but if the
  numbers arrive the vocabulary is already decided: the blind test asks *À quel
  point c'est connu* and offers *Grand public*, and the quiz's switch now speaks
  the same words.

## Done when

- Each of French history, geography, science and sport holds **at least 300
  rows**, or the plan says which ones did not and what the source ran out of.
  **Done: history 516, geography 685, sport 390, science 339.** The corpus floor
  in `question-bank.test.ts` no longer carries an exception.
- Every banked row from the new source has been read once, and the ones a typed
  room cannot win are in the census with a reason each.
- `pnpm validate` is green, the credits name the new author, and the changelog
  carries the per-subject counts before and after.
- The build's report is quoted in the changelog — a source that mirrors an
  existing one shows up as repeated prompts, and that number belongs in the
  record.

## Out of scope

- **The graded difficulty picker.** It is what this stage unblocks, not what it
  builds. It gets its own stage, and only once the numbers are in.
- **The English half.** It is already spread over six subjects.
- **Rating the existing bank differently.** See *What this stage is not*.
- **A question written from inside the app**, which stage 12 put out of scope and
  which nothing since has argued for.

## The cost

**Nominal path — two sessions**, one per source, and the first is deliverable
alone:

- **Session A, Mintaka.** Three `curl`s, a JSON walk, the answer read from
  `label.fr` and the row refused where there is none, decoys built on the QIDs
  through PolyFact's existing generator. History, geography and sport move.
- **Session B, Vikidia.** Seven API requests, a wikitext `<quiz>` parser, the
  noise filtered. Science moves, and nothing else has to. **Done on 11 September
  2026**, and it cost the session it was given — but the parser was the small
  half. Reading 566 banked rows and finding 373 of them defective is what the
  estimate missed, and *the noise filtered* was carrying a corpus-wide unbound
  pronoun that no filter can see.

The short-name spellings took a session of their own between the two, which the
cost table did not foresee because the plan did not know the defect was there.

Each session carries its own census, credits entry, dictionary strings, corpus
floor, rebuild, `pnpm validate` and changelog. The ingestion modules already
written run 286, 409 and 572 lines, and the largest is the one that had to build
its own decoys — which is the half Mintaka reuses rather than repeats.

**Named risks**, each with the thing that would show it:

| Risk | Cost | Trigger |
|---|---|---|
| PolyFact's decoy generator does not take Mintaka's QIDs as they are | +half a session | the generator wants a relation and Mintaka carries a question type |
| The translation is bad enough to need a reading, not a filter | +1 session | a sample of fifty turns up more than a handful like *tournoi d'or* |
| Mintaka's dated questions need a repair pass | +half a session | the build's unwinnable list runs past a few dozen |
| Vikidia's wikitext varies more than the 175 pages sampled | +half a session | the parser drops more than a tenth of the pages it opens |
| A licence changed since 10 September 2026 | drops the candidate | the licence file no longer says what the table above says |

**Out of the estimate**: the picker, a second source, and any rating work.
