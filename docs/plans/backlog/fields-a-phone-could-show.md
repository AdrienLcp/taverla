# The fields a phone could show

**Opened by the move to `oklch()`, and only reachable because of it.** A hex
cannot name a colour outside sRGB. An `oklch()` can, and almost every phone in a
room has a P3 screen.

## Why this is worth asking

The whole thesis is *one saturated field, edge to edge, replaced wholesale
between phases* — the six colours are not decoration around content, they are
the content. sRGB is where they are pinned today, and it is the narrowest gamut
any device in the room actually has.

The three that would gain most are the ones already sitting at the edge of what
sRGB can hold, by chroma: light `buzzed` (0.191), light `lobby` (0.178) and
light `countdown` (0.157). A field that reads *more itself* from four metres is
exactly what the mechanic is for.

## What it would cost

**It changes what a room sees**, so it is a design decision and not a
conversion — the opposite of the oklch move, which was chosen precisely because
every value round-tripped.

- **Contrast has to be re-measured, all twelve pairs.** Pushing chroma moves
  lightness in a wide-gamut space in ways that are not obvious, and the worst
  pair is already the tightest at 5.65:1. `--ink-muted`'s 85% is calibrated
  against that same pair and would have to be re-derived, as would `--rule`.
- **Two palettes, not one.** `@media (color-gamut: p3)` holds the wide values
  and the current ones stay as the floor, which doubles the token list unless
  the wide values are derived rather than authored.
- **Nobody can review it on an sRGB monitor**, which is what the dev machine
  is. The check is a phone, held next to another phone.

## What a session would do

Pick the three highest-chroma fields, not all six — the teal and forest pairs
have room in sRGB and would gain little. Derive the wide value by raising chroma
until the gamut boundary, hold lightness and hue, re-measure the pair, and put
the result behind `@media (color-gamut: p3)`. Then look at both on a phone
before keeping any of it.

## The one already known

`DESIGN.md` records that the two palettes drift up to 8 degrees of hue off each
other — six pairs picked by eye rather than derived. Whoever opens this opens
that too, because deriving a wide-gamut value from a pair that does not share a
hue means choosing which of the two is the real one.
