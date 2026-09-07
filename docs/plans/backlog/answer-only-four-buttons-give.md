## The answer only four buttons give — **done, 7 September 2026**

Found while reading the whole bank for
[a question about nobody](a-question-about-nobody.md), not reported from a room.

*Which country drives on the left side of the road?* The bank answers **Japan**.
So does India, so does Australia, so do seventy others — the row is only a
question because three of the four buttons say Brazil, Germany and Egypt. In
`choice` mode it is a fine question. In `typed` mode, which is the default, it is
a room reading a sentence with no answer in it.

The blunt cases say so out loud (*Which of the following is NOT one of Aesop's
fables?*). The expensive ones do not: *Which country has the Union Jack in its
flag?* → New Zealand, *Frank Lloyd Wright was the architect behind what famous
building?* → The Guggenheim. Nothing in the wording is wrong. The answer is
picked out of a set the sentence never names.

### The repository already knew, and was wrong about the scope twice

`prompt-eligibility.ts` carried a regex for this, and its comment put it at *12%
of the English bank and eight questions of the French* — which the census
confirms almost exactly. Two things about it were wrong, and both mattered:

- **It was Le Fake's alone.** `drawQuestion`'s own comment said *the quiz passes
  none, because there every banked question is a question it can ask*. The quiz
  in typed mode has the same text field and the same problem.
- **A regex cannot find this.** Measured against the census, it caught **75 %**
  and fired on **154 rows that are perfectly answerable** — *Which of these words
  means "idle spectator"?* has exactly one answer and a room can type Gongoozler.
  What it missed is the shape it never looked for: negation without a marker,
  *What country is not a part of Scandinavia?*

### What shipped

`choiceOnly` is a **column on the banked row**, stamped at build time from
`apps/server/scripts/choice-only-questions.json` — the census, committed, one
line per row with its reason. `isAdult` is the precedent and the same mechanism:
a property of the row that decides which rooms may be dealt it.

`drawQuestion`'s `isUsable` is now **required**, which is the structural half of
the fix: a third game drawing from the bank cannot forget to say what shape of
question it can ask, the way the quiz forgot. The conductor passes one predicate
for both games — a `choiceOnly` row is drawn only where its own decoys will be on
screen, which is a quiz in `choice` mode and nothing else.

`prompt-eligibility.ts` became `answer-eligibility.ts` and lost the regex. What
is left is `canBeLiedAbout`, a rule about the *answer* rather than the prompt: a
bare number is a lie everybody tells the same way, and nobody is believed over a
number. That one is genuinely Le Fake's, and genuinely a rule.

**680 rows carry the column**, 654 English and 26 French — 14.7 % of the English
half. The count grew from the original 543 when the full audit added the rows
whose answer is a whole sentence: *A mall with high vacancy rates or low consumer
foot traffic* is unwinnable in a text field for a different reason and wants
exactly the same remedy.

### What it cost, and what it bought back

Le Fake **gains** 154 questions the regex was refusing and **loses** 136 it was
letting through. The quiz in typed mode loses 680 and keeps them for choice
rooms. Nothing was deleted.

`[bank] keeps a question that needs its own candidates away from a typed room`
asserts both halves — that the exclusion works, and that the bank still holds
rows to exclude, so a rebuild that lost the column cannot pass it vacuously.
