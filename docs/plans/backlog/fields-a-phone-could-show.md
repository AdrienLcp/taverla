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

## What was derived, so the phone review is the only thing left — **4 September 2026**

The expensive half is done: the boundary found, the values derived, every pair
that moves re-measured. What is left is two handsets held together, which is the
half no monitor here can answer. **Nothing is shipped** — `_tokens.sass` still
holds only the sRGB values.

### Two of the three are pinned by sRGB; the third is not

| light field | chroma now | max in sRGB | max in Display P3 | gain over today |
|---|---|---|---|---|
| `buzzed` | 0.1909 | **0.2232** | 0.2838 | +48.7% |
| `lobby` | 0.1782 | **0.1782** | 0.2257 | +26.7% |
| `countdown` | 0.1572 | **0.1572** | 0.1947 | +23.9% |

`lobby` and `countdown` sit exactly on the sRGB boundary, which is what this
entry assumed of all three. `buzzed` does not: it has 17% of chroma still
available *in sRGB* and is not using it. So a third of its P3 gain is reachable
today on any screen, and its current chroma was chosen rather than constrained —
which makes widening it a design question about the red, not a gamut recovery.

### The derived values, at the P3 boundary, holding L and H

```
--field-buzzed    oklch(66.75% 0.2838 14.92)
--field-lobby     oklch(72.58% 0.2257 43.19)
--field-countdown oklch(85.37% 0.1947 84.13)
```

### Re-measured, and the one number that gets tight

Only the three light fields move, so the three dark pairs and the three other
light ones are untouched by construction — the twelve did not all need
re-measuring, three did.

| pair | ink | ink → P3 | `--ink-muted` | → P3 | `--edge` | → P3 |
|---|---|---|---|---|---|---|
| light `buzzed` | 5.65 | **5.38** | 4.81 | **4.60** | 3.19 | **3.10** |
| light `lobby` | 6.95 | 6.81 | 5.66 | 5.56 | 3.49 | 3.45 |
| light `countdown` | 10.25 | 10.19 | 7.54 | 7.51 | 4.00 | 3.99 |

Every floor still holds, and one of them barely: `--ink-muted` on the light
`buzzed` pair lands at **4.60:1 against a 4.5 floor**. `DESIGN.md` records that
85% is already the lowest mix that clears it and 80% does not, so widening this
field spends most of what is left. If the phone says the red is worth it, the
buzzed value is the one to pull back from the boundary rather than the mix to
re-derive.

`--edge` on the same pair goes 3.19 → 3.10 against a 3:1 floor, which is the
same story one token further out.

### What the hue drift does not do here

`DESIGN.md` records the two palettes drifting up to 8 degrees off each other,
and this entry warned that deriving a wide value from a pair that does not share
a hue means choosing which is the real one. It does not arise: only the **light**
fields are widened, so each derivation holds its own palette's L and H and the
dark values are not consulted at all. The drift is still there and is still
somebody's decision — it is simply not this one's.

### What is left

Put the three values behind `@media (color-gamut: p3)` in a branch, open the
front door and a buzzed round on a P3 phone beside a phone showing the sRGB
build, and keep it or drop it. That is the whole remaining session.
