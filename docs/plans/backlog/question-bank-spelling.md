## 3 · The question bank's spelling — **done, 15 August 2026**

> *Playtest 9 — "il y a des fautes. On a eu une question sur une prison sur une
> île, et la proposition était « alvatraz »."*

**What shipped**, against what this entry expected — and the two disagree about
almost everything except Alcatraz:

- **Two of the three "typos" below were not typos.** `Brasil` is the Portuguese
  word for Brazil, which is exactly what its prompt asks for, and `Thwimps` is
  what tiny Thwomps are actually called in Super Mario World. Both were the
  Levenshtein-against-the-note audit reporting a near-miss as a fault — the same
  false positive this entry warned about for `Orthoquizz`, landing on the very
  rows it offered as confirmed. Only `Alvatraz` was real.
- **The audit worth keeping was a different one.** A row's three decoys are the
  bank saying out loud what it considers a different answer, so *a decoy the
  matcher grades right* is an oracle with no lexicon and no false positives. It
  found 333 rows against the note oracle's one, and it is a test now
  (`question-bank.test.ts`) rather than a script somebody remembers to run.
- **The fault underneath was the matcher, not the data.** `5 minutes` is eight
  characters, so one correction was forgiven — and the decoy was `7 minutes`. 93
  numeric rows had that shape, and around 200 spelling questions had it worse:
  `Accueil` beside `Acueil` is a question the matcher answered for the room.
  Forgiveness now stops one edit short of the nearest decoy, per row, so an
  answer nothing crowds keeps all of it.
- **`normalizeAnswer` was the blind test's, and the quiz had inherited it.**
  Stripping `(…)` and a ` - ` suffix is a *music catalogue* rule: it folded
  `River Horse (Greek)` onto `River Horse (Latin)` and `1915 - 1916` onto
  `1915 - 1918`. It is `answerAppearsIn`'s alone now. A leading article went the
  other way and is folded everywhere, which is the 312 rows a room answers
  without saying *Le*.
- **Twenty rows are gone**, and they are the ones no rule can save: eight French
  questions whose decoy differs from the answer by an accent, and twelve English
  ones whose answer is punctuation — `-` among Ed Sheeran's albums, `C++` beside
  `C#`, `♡♪!?`. Every one of them is unanswerable in typed mode, where choice
  mode compares by index and never sees the string. Dropping them beat carrying
  a mode flag through the protocol for 0.3% of the bank.
- **The generator wrote to a path that no longer existed** (`infrastructure/quiz/`
  against the bank's `infrastructure/questions/`), so a rebuild would have
  produced a second file and changed nothing. Fixed, and it now applies the same
  rejection and carries the one correction, so a rebuild does not undo this.

### `accepted` stays empty, and that is the answer

This entry called filling it the real content debt. It is worth less than it
looks, and the session says so with numbers: the two classes anybody would fill
it with — a leading article, an accent — are **rules**, and rules belong in the
matcher where they cover 6 286 rows rather than the ones somebody got to. What
is left is genuine synonymy (`Cervin` / `Matterhorn`), which no rule derives and
no pass over six thousand rows produces reliably without a human reading every
one. It is a content session with a person in it, or it is nothing; it is not
engineering work waiting to be scheduled.

The bank is a single bundled file,
`apps/server/src/infrastructure/questions/question-bank.json` — 6 306 questions,
1 800 French from OpenQuizzDB and 4 506 English from Open Trivia DB.

| id | Was reported as | What it turned out to be |
|---|---|---|
| `oqdb-163-1` | `"Alvatraz"` | **Real.** Alcatraz — the entry's own `note` spells it correctly, and it is the one correction the builder carries |
| `otdb-87737bf23efd` | `"Brasil"` | **Not a typo.** Its prompt asks for the Portuguese word for Brazil. The row is gone anyway: `"Brasíl"` is one of its decoys and folds onto the answer |
| `otdb-1f1bd4f1a19d` | `"Thwimps"` | **Not a typo.** Tiny Thwomps are Thwimps. Still in the bank |

**Do not "fix" the `Orthoquizz` themes.** Around 200 entries are spelling quizzes
whose decoys are deliberately misspelled (`"Ruminents"` and its neighbours); the
same goes for near-miss decoys like `"Aznavourev"`. They are answerable now
rather than excluded: the decoy cap is what makes a spelling question ask for
the spelling.

The audit this entry proposed — Levenshtein 1 between `answer` and the words of
`prompt`/`note` — is the one that produced the two false positives above. What
replaced it is in the session's notes at the top, and it is a test rather than a
script.

The two `--space-3xs` gaps this entry bundled in are fixed, at `--space-2xs`
rather than by adding a step: 4px is the scale's floor on purpose, and a 2px
token is a step nobody can see at forty centimetres, let alone four metres.

---

