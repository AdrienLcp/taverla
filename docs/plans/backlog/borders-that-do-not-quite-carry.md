# The borders that do not quite carry

**A decision, not a fault.** Nothing is visibly wrong; the question is whether a
rule drawn at 1.84:1 is decoration or information, and the answer decides
whether anything moves.

## What was measured

`--rule` is `color-mix(in oklab, var(--ink) 32%, var(--field))`. Over the twelve
field/ink pairs its worst contrast against the field is **1.84:1**, on the light
`buzzed` field — the least forgiving of the six, as it is for everything else.
It was 1.74:1 before the palette moved to oklab mixing.

It is used as a `border` in twelve places. Two of them are not dividers:

- `home-page.sass:75` — `border: 2px solid var(--rule)` on the front door's
  controls.
- `player-round.sass:193` — `border: 4px solid var(--rule)`.

The rest are `border-top` / `border-bottom` hairlines separating sections, which
carry nothing on their own and are outside this question.

## The question

WCAG 2.1 SC 1.4.11 asks 3:1 of *visual information required to identify user
interface components and their states*. A border at 1.84:1 clears that only if
it is not what identifies the control.

The argument that it is not: on the front door, `PRENDRE PLACE` and `OUVRIR UNE
TABLE` are full-ink type on the field, legible from across the room, and the
border is a frame around a thing already named. Nothing about the control's
*state* is carried by the border either — pressed, focused and disabled are all
drawn elsewhere, and focus has `_focus.sass` to itself.

The argument that it is: a border is the affordance that says *this is a target*
rather than a heading, and a person who cannot resolve it is left guessing at
what is pressable on a screen whose whole idea is that everything else is flat.

## What a session would do

Decide it, and either leave a sentence in `DESIGN.md` saying why 1.84:1 is
right for a frame, or give a control's border its own token above 3:1 — which
would be the first colour on the shelf that is neither field, ink nor cut, and
should be resisted for that reason alone. A third way, cheaper than both: make
the control's boundary the *ink* it already uses for its own type, at the weight
the design already draws elsewhere.

## The one beside it

`round-progress.sass:21` sets `opacity: 0.35` on the drain bar under
`prefers-reduced-motion`, which lands at 1.84:1 by the same measurement. Here
the bar *is* the information — it is how a round says where it stands to
somebody who asked for no motion — so this one is more likely a real fault than
the borders are. It was left alone because it belongs to the same decision, not
because it passed.
