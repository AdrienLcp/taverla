# A row that reads as chosen

A choice strip that runs out of width wraps, and the row that is left over is
handed the width the missing options would have had — `flex: 1` in
`presentation/styles/_strip.sass` is what does it, deliberately, so the strip's
own ground cannot show through where an option should be. The result is a stamp
several times the width of its neighbours, which is the shape a **selected** one
has.

Adrien met it on a phone, on the game picker: five games wrap 4 + 1 at 390px and
the fifth reads as the chosen one in a room where nothing had been chosen yet.
That instance is **fixed** — `strip.stacks-below(28rem)` on `.game-picker`, one
row or one column and never the shape between. What this entry is for is the
six other strips that do the same thing, and the decision that closing them
properly needs.

## What was measured

Every strip in the console, both locales, at twelve viewport widths from 320 to
1920, reading each one's row shape rather than its width. French binds
everywhere: it is the longer locale on every one of these labels.

| Strip | Options | Shapes with a short row |
|---|---|---|
| Comment on répond — answer mode | 3 | `1+2` at 390–430, `2+1` at 520 |
| À quel point c'est connu — blind test difficulty | 3 | `2+1` at 360–430 |
| D'où viennent les titres — blind test source | 5 | `2+2+1` at 430–520, `3+2` at 640, `4+1` at 768 |
| Sur quels sujets — quiz and Le Fake categories | 6 | `3+2+1` at 390–430, `5+1` at 640–768 |
| Temps pour écrire, Temps pour voter — Le Fake | 4 each | `3+1` at 320 |

The worst is the answer mode at 390px, because the stretched row is the one that
is **not** selected: `Le premier qui buzze` runs the full width above a
half-width `Quatre propositions` that is the actual answer.

Two findings worth keeping:

- **`Quelle musique` never orphans**, at any width, with twelve options — twelve
  divides into every column count the wrap produces. The defect is rows of
  *unequal length*, not a strip being too narrow, and a count with many divisors
  is what saves it. Measuring widths finds the wrong set; measure shapes.
- **Short-labelled strips are fine everywhere.** Décompte, Tournées, Temps par
  question, Durée de l'extrait and Langue des questions all need under 280px and
  hold one row down to a 320px screen. A single system-wide breakpoint would
  stack all five for nothing, which is why the fix cannot be one number in the
  mixin.

## The decision, taken

**Keep the strip as it is built and give the remaining six their own
`stacks-below()`, with a test that keeps the numbers honest.** Decided
9 September 2026, after putting the alternative on the screen rather than
arguing it.

The alternative was to change what draws the separators. They are 2px gaps with
the strip's `--rule` ground showing through, which is the whole reason a short
row must stretch: a row that stopped would leave a solid rule-coloured band. Give
each segment its own hairline instead and the leftover is just field, so nothing
has to stretch, nothing reads as selected, and there is not a single threshold
anywhere.

It was tried at 390px over the quiz's fold, and the reason it loses is not the
one that was expected. Without the stretch the stamps are only as wide as their
own labels — on *every* row, not just the last — so each strip stops being one
object: no outer boundary, ragged right edges, and a column of settings that
reads as a loose heap of chips. It also replaces the hard-edged die-cut block the
whole product is built from. The screenshots are in the session that took this
decision; the short version is that it is a correct control and a worse one.

Against that, the only real charge against the thresholds is that they fail
**silently** — a dictionary edit moves a row and the strip goes back to wrapping
looking deliberate. That is what the test removes, so the permanent cost loses to
the repairable one.

## What the session does

1. **Write the check first**, and watch it fail on the six. It is the sweep this
   entry was measured with: for each game, at a handful of widths, in both
   locales, assert that no strip holds rows of two different lengths. Read the
   top of each `.segment`'s bounding box, group by row, and compare the counts.
   Note that `.claude/rules/e2e.md` says three journeys and this is not a fourth
   — it is one pass over one screen, and where it lives is worth a minute's
   thought before it is written.

2. **Measure, then apply.** The widths below are what today's sweep read in
   French, which binds on every one of these. They are a starting point and not
   a result — this backlog has been wrong about its own measured numbers before
   — so re-read them from the check in (1) and round up for headroom the way the
   picker's 433px became `28rem`.

   | Strip | Needs on one row | Suggested |
   |---|---|---|
   | Comment on répond | 479px | `31rem` |
   | À quel point c'est connu | 441px | `28rem` |
   | Sur quels sujets | 702px | `45rem` |
   | D'où viennent les titres | 812px | `52rem` |
   | Temps pour écrire, Temps pour voter | 279px each | `18rem` |

3. **Leave `Quelle musique` alone.** Twelve options, and twelve divides into
   every column count the wrap produces, so it never holds an unequal row at any
   width. A threshold there would stack twelve options into a wall for nothing.

4. **Check the height it buys back.** `Sur quels sujets` goes from three wrapped
   rows to six full-width ones, roughly +90px in a fold that is opened
   deliberately, and each row becomes a better target for a thumb. If any of the
   six reads worse stacked than wrapped, that strip is the one worth arguing
   about — not the rule.

## Where the code is

- `apps/game/src/presentation/styles/_strip.sass` — the mixin, the `flex: 1`
  that causes it, and `stacks-below()`
- `apps/game/src/features/host/game-picker.sass` — the one call site today
- `apps/game/src/features/host/settings-panel.tsx` — the answer mode, the
  categories, the difficulty
- `apps/game/src/features/host/playlist-picker.tsx` — the source and the
  catalogue
- `apps/game/src/features/host/number-choice.tsx` — the duration ladders
