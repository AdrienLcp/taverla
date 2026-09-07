## A question about nobody — **done, 7 September 2026**

> *Playtest — three questions in one evening that name nothing.*
> *« Dans quelle comédie est-elle DRH dans une compagnie maritime ? » — on ne*
> *sait pas de qui on parle. « De combien d'essais dispose-t-on pour chaque*
> *mouvement ? » — on ne sait pas de quoi ça parle.*

**OpenQuizzDB writes packs, not questions.** Four rows share a `theme`, the
theme is on screen while they are read, and the source expects them read in
order — so row two says *elle* and means whoever row one named. This game deals
one question, alone, with the theme nowhere: the pronoun points at nothing and
the room is asked about somebody it was never told about.

`theme` was already in the bank as provenance — *which pack it came from, so a
question that turns out to be wrong is traceable*. It turned out to be the
missing subject as well, which is what makes the repair mechanical: what the
pronoun pointed at is the pack's own name.

### What shipped

**Every one of the 6 286 rows was read** — French by pack, so the referent was
visible; English row by row. **60 prompts repaired, one row dropped.**

The English half has no packs, and the prediction going in was that it would
therefore be clean. It was not, and for a reason the French half never shows:
**16 Open Trivia DB rows are written as statements, not questions.** *This
composer worked on the 2003 TV series Battlestar Galatica.* is a clue with four
buttons under it — a room typing an answer is given a fact and asked nothing.
Three more were simply garbled upstream (*The key of sharps does the key of G#
minor contain?*), and one names an artist the world does not have, which is the
row that was dropped rather than repaired.

`apps/server/scripts/question-repairs.json` is the record, keyed by row id, and
the builder applies it. Three kinds live in it and no fourth: an `answer` whose
own row disagrees with itself (Alcatraz, already there), a `prompt` that leans on
something the room never sees, and a `drop` for the row that means nothing in
any mode. Every entry carries the `why` it was repaired for, so a later reader
can disagree with the judgement rather than guess at it. **It is not a place to
make a question better** — the same line the answer corrections were already
held to, and the reason a rebuild can reapply the file blind.

A rebuild now warns for a repair whose id no longer matches a source row, which
is what a stale entry looks like after upstream renumbers a pack.

### Why repaired rather than dropped

**Show the theme beside the prompt** would have fixed the French class at once
and cost a protocol field — `theme` is provenance today and never leaves the
server. It was refused on what it does to the *other* rows: a pack is named for
its subject, so `Clint Eastwood` above a question about who directed
*Gran Torino* is the answer printed over the question. Five rows leak it outright
by a string match, and the semantic leak — a theme that narrows the field to one
plausible name — is most of a bank about people, with no oracle to find it. It
also does nothing for the sixteen English rows, whose themes are rubrics.

**Dropping them** is what the bank already does to a row typed mode cannot win,
and it is right when nothing can be put back. Here something can: the subject is
sitting in the row. Sixty good questions for a five-word edit is a bad trade.

**Repairing them** is what landed. The edit is minimal, and no repaired prompt
contains its own answer — checked rather than trusted. The longest repair is 94
characters against a bank whose longest prompt is 140, so nothing was made too
long for the screen that shows it.

### What the pass cost, and how

Twenty-three subagents, sharded so no reader carried more than 300 rows, each
writing verdicts to disk rather than back through the conversation.

The French shards were cut **by pack**, which is the whole trick: an agent that
can see the other three questions can tell what *elle* meant, and one that cannot
would have had to drop the row. One agent did drop one on exactly those grounds
— `oqdb-351-2`, the same question banked twice, whose second pack never names
Valérie Lemercier — and it was repaired by hand from the pack that does.

The regex prefilter that started the session was kept only as a residual check,
and it is worthless as a detector. It flagged 471 French rows, almost all of them
ordinary inverted interrogatives (`dispose-t-on`, `est-elle`), and it missed the
plainest case in the report — *De combien d'essais dispose-t-on pour chaque
mouvement ?* carries no marker at all. **A prompt missing its subject is not a
shape; it is a meaning.** Anything cheaper than reading them was going to miss it.

### Two things found on the way, neither fixed here

- **543 rows are unwinnable in typed mode**, which became
  [the answer only four buttons give](answer-only-four-buttons-give.md) and
  landed in the same session.
- Reading the bank for *this* fault is what made reading it for
  [everything else](the-bank-read-end-to-end.md) obviously worth doing.
- **33 prompts appear twice** (28 French, 5 English), the same question banked
  into two packs. Mild: `playedIds` is per id, so one room can be dealt both and
  asked the same thing twice in an evening. Not worth a session; worth deleting
  the day something else touches the bank.
