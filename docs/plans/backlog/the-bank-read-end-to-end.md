## The bank read end to end — **done, 7 September 2026**

Nobody reported this. Two rows in one evening turned out to be a class
([a question about nobody](a-question-about-nobody.md)), reading the bank for
that class turned up a second one
([the answer only four buttons give](answer-only-four-buttons-give.md)), and at
that point the question was no longer *is there a third* but *what else is in
there*. So all 6 285 rows were read again, with every lens at once.

**26 subagents, 242 rows each, one pass.** Eight lenses per row — a wrong
`answer`, a `decoy` that is also right, a fact with a shelf life, an answer no
text field can produce, a wrong `category`, unrated adult content, garbled text,
and a prompt several answers fit. **370 findings.** Each agent wrote to disk and
reported counts, so the detail never crossed the session that dispatched them.

### What the room was being asked

The `wrongAnswer` findings are the ones worth reading, because most of them are
confirmed by the row's own evidence rather than by outside knowledge:

- *How many chromosomes are in your body cells?* → **23**. It is 46; 23 is the
  haploid count.
- *What is the equation for the area of a sphere?* → **(4/3)πr³**, which is the
  volume. `4πr²` was sitting in the decoys.
- *Quel objet blesse la jambe de Peeta ?* → **Flèche**, where the row's own note
  says Cato ran him through with a sword — and `Épée` was a decoy.
- *What is the chemical makeup of water?* → **H20**, with a digit zero, so
  nobody typing `H2O` was ever right.
- *What fast food chain has the most locations globally?* → **Subway**, which
  lost the lead to McDonald's, a decoy.

**Ten of the twenty-nine had the right answer sitting among their own three
decoys**, which is why a repair can carry a `decoys` tuple now: the pair swaps,
and the row keeps four distinct candidates.

### What was applied, and the rule behind each

| Finding | Rows | What happened |
|---|---|---|
| `wrongAnswer` | 29 | Repaired where a candidate is right or a fix is unambiguous, dropped where nothing on screen answers the prompt |
| `brokenText` | 35 | Repaired — *Polanreff*, *chanteuseest*, *les debts d'un timbre-poste*, *La père*, a decoy reading `Neptune>/I>` |
| `decoyAlsoRight` | 36 | **Dropped, all of them** |
| `outdated` | 40 | Dropped, except the eleven where only the anecdote had aged |
| `untypeable` · `ambiguous` | 144 | Added to the `choiceOnly` census |
| `unratedAdult` | 1 | `isAdult` turned on |
| `miscategorised` | 85 | **Nothing.** See below |

**`decoyAlsoRight` is dropped rather than reworded** because the bank already
does exactly that: `isWinnableTyped` drops a row whose decoy the *matcher* grades
right. This is the same rule with meaning instead of string distance — *Quelle
ville est célèbre pour Mozart ?* answers Salzbourg, and Vienna is where he wrote
most of it, died and is buried. Rewording is authoring; dropping is the rule the
repository already chose.

**`outdated` is dropped** on the same reasoning: a question whose answer has a
shelf life will be wrong at some party, and it is cheaper to lose thirty rows
than to be wrong in front of a room. The exception is the row whose *answer*
still holds and whose **note** has aged — the note is read out after the reveal,
and *Barack Obama est l'actuel président* under a correct answer is the screen
being wrong out loud. Those keep the question and lose the note.

**`miscategorised` was not acted on, and that is a finding about the method.**
The counts per shard ran from 0 to 25 over identical slice sizes, which is an
agent applying its own taxonomy rather than reading one. The category only
decides the draw mix, never whether a question can be answered, so acting on a
noisy signal would have cost more than the fault. The other seven lenses were
flat across shards.

### The one systematic fault, and why it is a rule

Ten anecdotes ended mid-word — *une protection robuste fixée à la cein*. Every
one of them was 255 or 256 characters: upstream stores the field in a 255-char
column and lets it run into the wall. That is a **rule**, not ten rows in the
repair file, so `noteIn` now cuts an unterminated anecdote back to its last full
stop and the cap will not bite the next long one either.

The mechanical sweep that found it also cleared the bank of everything else it
could look for: **no mojibake, no HTML entities, no stray whitespace, no answer
sitting among its own decoys.**

### The bank now

**6 209 rows**, 1 767 French and 4 442 English — 77 fewer than it started the
day with, and 122 rows repaired rather than lost.

`question-repairs.json` holds all 191 judgements, keyed by row id, each with the
`why` it was made. Six kinds: `answer`, `decoys`, `prompt`, `note`, `isAdult`,
`drop`. A rebuild reapplies every one of them and warns for any whose row
upstream has renumbered away.
