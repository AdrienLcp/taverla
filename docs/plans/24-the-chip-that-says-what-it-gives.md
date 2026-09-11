# 24 — The chip that says what it gives

`arts` was not a subject. It was the leftovers: films, television, animation,
video games, music, books, comics, celebrities, and OpenQuizzDB's adult rubric
forced in on top. Half the bank sat under the one chip whose name did not tell a
room what ticking it would give.

This stage splits **`cinema`** and **`videogames`** off it, and takes the two
Mintaka categories those splits unlock.

## What the total was never going to tell us

`arts` held 4 960 of 10 186 rows and that number decided nothing, because
`drawQuestion` takes a **category before it takes a question**. A room ticking
nothing met `arts` one round in six, exactly as often as `sport`. All its size
bought was that it repeated less.

So the question was never *do we have enough questions* — stage 22 had already
put every thin French subject past 300. It was whether a room can ask for what
it wants. It could not.

## The fold, not a new source

Every row already carries `theme`, the rubric it arrived under. Splitting a
subject is a **table of folds to rewrite**, not questions to find:

| Source | → `cinema` | → `videogames` |
|---|---|---|
| Open Trivia DB | `Film`, `Television`, `Cartoon & Animations`, `Japanese Anime & Manga` — 704 | `Video Games` — 1 006 |
| Mintaka | `movies` — **newly ingested**, 619 | `videogames` — **newly ingested**, 287 |
| PolyFact | `director` — 395 | `developer` — 452 |
| OpenQuizzDB | `CINEMA`, `TELEVISION` — 317 | — |
| Vikidia | nine pages, by hand — 30 | fourteen pages, by hand — 69 |

### Mintaka's two unlocked categories

`CATEGORY_OF_MINTAKA` took three of eight, and the comment said why: *`movies`,
`music`, `books` and `videogames` would deepen the two subjects that need
nothing.* That reason was `arts` being fat. The splits retire it for exactly two
of the four and leave it standing for the other two.

**They yield very differently for the same 2 500 raw rows, and the gap is French
Wikipedia traffic rather than the fold**: 619 banked for `movies` against 287
for `videogames`, because a studio is read about far less than a film. The
projection made before the run said ~650 for `videogames` and was wrong by more
than half — the lesson being that a yield transfers between two categories of
one corpus only as far as their subjects' notability does.

### `creator` stays in `arts`, and that is the fold's hard case

PolyFact's `creator` holds 318 French rows and a quarter of them name a series,
so it looks like it belongs in `cinema`. It does not: the relation says *who made
a thing* and never *what kind of thing*, so one sentence shape asks about
Chandler Bing, Solid Snake and the Sistine Madonna. A fold reading the prompt for
a medium files two of those three wrong.

`director` and `developer` have no such problem — each is asked of one kind of
work and nothing else, which is what lets them carry a category.

## What it measures

| | fr | fr well-known | en | en well-known |
|---|---|---|---|---|
| `cinema` | **1 361** | 995 | **704** | 566 |
| `videogames` | **808** | 436 | **1 006** | 796 |
| `arts` after | 1 253 | 610 | 740 | 581 |

Bank total 10 186 → **11 097**. Every cell clears the corpus floors (`≥ 40`
well-known per language and category; `≥ 300` French rows in the four thin
subjects) with room to spare.

**`developer` is 56% of the French half of `videogames`** — *which studio made
X*, once in two questions. That is better than the 88% it would have been
without Mintaka and worse than the 39% the projection promised. What deepens it
is a second source, not a wider fold.

Two side effects worth naming. French `history` lost three rows and `geography`
gained two: Mintaka's decoy caps are read off the arithmetic each pool faces, so
new rows reshuffle which of the old ones can be dressed. And one repair went
stale with them — `mintaka-269e0ca7`, a `drop` for a row asking after a British
monarch and answering Louis XIV. The row is no longer ingested and nothing
equivalent came back, so the entry was removed rather than left as dead
vocabulary.

## The two that were refused

- **`music`** — 84 French rows against 431 English. Dead in French, and the
  least missed: music already has a whole game.
- **`books`** — 109 English rows against 366 French. Dead the other way round.

Mintaka holds 2 500 raw rows of each. Both become buildable the day someone
wants a chip for them; nothing here forecloses it.

## The odds dial

Eight chips instead of six is a **change to what a room is dealt**, not a menu
tidy-up. Screen-and-stage subjects go from one round in six to three in eight;
history, geography and science fall from three in six to three in eight. For a
room at a party that is the right direction, and it is why the category list now
carries a comment saying the list *is* the dial.

## Protocol

`PROTOCOL_VERSION` 14 → **16**, one per category.
`questionPromptSchema.category` travels all the way to a player, so a tab left
open across a redeploy would meet a `z.enum` value it cannot parse. This is the
case the version exists for — unlike adding a source, which lives entirely
behind `BankedQuestion` and never reaches the wire.

## Eight chips on one row

The console's setup fold gives the subject strip **900px**, measured — so the
budget for eight labels is 882 after gutters and borders, and the eight as they
stood needed 960. `stacks-below` wants the row measured in the longer locale
rather than guessed, and every candidate label was measured at the segment's own
typography before any of them was chosen.

Keeping *Arts et culture* and *Vie quotidienne* and shortening only *Cinéma et
séries* came to **883px** — over by one pixel. So two labels had to go, and the
pair was picked on what the short form costs rather than on what it saves:

| | before | after | px |
|---|---|---|---|
| `arts` | Arts et culture | *unchanged* | 154 |
| `cinema` | Cinéma et séries | **Cinéma** | 158 → 81 |
| `everyday` | Vie quotidienne | **Quotidien** | 151 → 105 |

837px, and the container query stays at **55rem** — 880px, above the row's 855
and below the fold's 900. English lands at 843 and is never the binding locale.

*Quotidien* alone can be read as the newspaper, which is the cost taken
knowingly; *Cinéma* drops the series and the animation from its name, which the
room learns on its first question. The alternative was a **column of eight, 233px
against 31**, in a fold whose other two controls are horizontal strips — a
control changing shape while the setting stays the same. Rendered both ways
before choosing.

## How to tell it is done

- A host ticks **Jeux vidéo** alone and plays a round of game questions; the same
  for **Cinéma**.
- Ticking nothing still mixes eight subjects; `question-bank.test.ts` holds the
  floor over 1 200 draws.
- The strip is one row on a laptop and one column on a phone, in French.
- `pnpm validate` green.

## Left on the table

- **A second source for French video games**, which is what takes `developer`
  below half of that category.
- `music` and `books`, above.
