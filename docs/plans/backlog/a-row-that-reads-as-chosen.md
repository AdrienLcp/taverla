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

## The decision this needs

`stacks-below($width)` works and is proved on the picker, but its `$width` is
measured off the dictionary, so **seven of them is seven numbers that a
translation edit silently invalidates**. Nothing would warn: the strip goes back
to wrapping and looks deliberate. Before applying it six more times, weigh it
against the other shape of fix.

**Change how the strip draws its rules.** The stretch exists only because the
separators are 2px gaps with the strip's `--rule` ground showing through, so a
short row that did not stretch would leave a solid rule-coloured band. Give each
segment its own hairline instead — an overlapping `box-shadow` ring, which is
what makes the outer border free as well — and the leftover of a short row is
just field. Then a `4+1` reads as a row that ran out, nothing reads as selected,
and there are no numbers at all.

It costs a change to a material `DESIGN.md` records deliberately, with the
reason it was chosen: *a `border-right` has nothing to say about a row below it,
and no `:last-child` can name the end of a row*. That reason is about **borders
between** segments and does not answer a ring **around** each one, so it is not
an argument already made against this — but it is a change to what every room
sees, on every strip in the product, and that makes it Adrien's call rather than
a session's.

The third way is to keep the per-strip numbers and stop them going stale: the
sweep above is a Playwright pass over every strip asserting that no strip ever
holds rows of two different lengths. That is a real e2e test rather than a
comment, and it turns seven numbers from debt into something that fails loudly.
It composes with either fix and is worth doing whichever wins.

## Where the code is

- `apps/game/src/presentation/styles/_strip.sass` — the mixin, the `flex: 1`
  that causes it, and `stacks-below()`
- `apps/game/src/features/host/game-picker.sass` — the one call site today
- `apps/game/src/features/host/settings-panel.tsx` — the answer mode, the
  categories, the difficulty
- `apps/game/src/features/host/playlist-picker.tsx` — the source and the
  catalogue
- `apps/game/src/features/host/number-choice.tsx` — the duration ladders
