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

## What it decided — **4 September 2026**

**Two weights of the same hairline**, and the split is what each is asked to
say. `--rule` stays at 32% and stays a separator. `--edge` is new, at 60%, and
is a control's own boundary: 3.19:1 on the worst pair against the 3:1 WCAG
1.4.11 asks, where 55% gives 2.90 and fails. It is not a sixth colour — it is
the same ink mixed further into the same field, which is the objection above
answered rather than overruled.

It stops short of `--ink-muted` on a measurement made on the page rather than in
the abstract: at 85% the shelf of game cards reads as heavy as the two doors
above it, and the front page loses its order. 60% gives the cards a definite
frame and leaves them second, which is what they are.

### Three things this entry had wrong

- **It named the wrong controls.** `home-page.sass:75` is not the border of
  `PRENDRE PLACE` or `OUVRIR UNE TABLE` — those are drawn in full ink and always
  were. It is the border of the **game cards** on the shelf. So the argument
  above that the border is "a frame around a thing already named" was made about
  elements that do not use `--rule` at all, and the element that does is a link
  in a list where the frame is the only thing saying it is a target.
- **Two uses, not two.** Six rules draw a full box in `--rule`, not two:
  the game card, the menu trigger, the slider track, the disabled buzzer, the
  segmented strip and `@mixin ruled`. The entry counted the twelve `border`
  declarations and classified only the two it happened to open.
- **The disabled buzzer needed no decision.** `player-round.sass:193` is the
  `[data-disabled]` branch, and 1.4.11 exempts inactive components outright.

### What moved, and what deliberately did not

`--edge`: the game card, the menu trigger, the slider track — the three places
a control's own boundary is the only thing drawing it.

Left in `--rule`, each for its own reason: `@mixin ruled` and every
`border-top` / `border-bottom` hairline separate regions and carry nothing; the
segmented strip's 2px gaps are dividers between options whose *selected* state is
a full-ink stamp; the disabled buzzer is exempt.

### The one beside it, which was the real fault

`round-progress.sass` faded the drain bar to 35% under
`prefers-reduced-motion`, which put the edge between filled and empty at the
same 1.84:1 — and there the mark **is** the reading, not a frame around one. It
now draws in full ink whether it moves or not: 6.95:1 on the light lobby field,
5.65:1 on the worst pair, and it is what a paused bar looked like anyway.
Verified in the browser under `prefers-reduced-motion: reduce`, on a page that
loads the component's own stylesheet — the front door does not, which is a trap
worth naming: a probe there computes defaults and reads as proof.
