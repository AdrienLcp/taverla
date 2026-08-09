# Design

Recorded from the built world, not from the intention that preceded it.

## Thesis

**The screen is a title card, not a page.** One saturated field, one idea,
replaced wholesale between phases. It refuses the arrangement every party-game
app ships — near-black ground, one neon accent, rounded cards, soft glows —
which is what this codebase itself looked like before this pass.

Lineage: French television variety title cards, 1972–81.

## The mechanic: the phase is the colour

`usePhaseField` stamps `data-phase` on the root element and `_tokens.sass` maps
it to a `--field` / `--ink` pair. Six phases, six fields:

| Phase | Dark | Light |
|---|---|---|
| `lobby` | burnt orange `#a8330d` | `#ff7a3d` |
| `countdown` | chrome yellow `#c98a00` | `#ffc53d` |
| `playing` | deep teal `#0e4b44` | `#3fb8a6` |
| `buzzed` | oxblood `#8c1027` | `#f2566e` |
| `revealed` | aubergine `#48174f` | `#b77cc4` |
| `finished` | forest `#14532d` | `#5fbf7f` |

No two consecutive phases share a hue, which is the point: from the far side of
a room you know where the game is before you read a word. The attribute goes on
the **root element** so the field survives an overscroll bounce, and `lobby` is
the token default so a first paint before React mounts is already correct.

**Every colour a component uses is `--field`, `--ink`, `--ink-muted`, `--rule`,
`--cut` or `--cut-ink`.** No component holds a hex.

### Contrast, measured

Every field/ink pair clears 4.5:1 (worst 5.56). `--ink-muted` mixes the ink back
toward the field only as far as 85%, which is where the worst pair still clears
4.5:1 — 80% does not.

An error is **a stamped block**, never tinted text: `--danger` / `--danger-ink`
are the same in both palettes because the contrast that matters is inside the
block. Tinted red text tops out at 4.0:1 against the chrome-yellow field, and
derived-from-ink formulas top out at the same place. For the same reason the
connection dot and the "wrong" verdict are told apart by **shape**, not hue.

## Type

**Archivo**, self-hosted, one variable file, two subsets (latin, latin-ext),
`font-display: swap`, preloaded. Width 125 is the title-card voice; width 100
is for the phone in a hand. There is no third register.

| Mixin | Used for |
|---|---|
| `monument` | the room code, the countdown, a revealed title. `clamp(3.5rem, 17vmin, 15rem)` |
| `billboard` | who buzzed, the final heading |
| `title` | controls, inputs, list rows |
| `body` / `caption` | prose and secondary lines |
| `label` | the small wide caps that name a control |
| `numeric` | tabular figures, so a score going 9 → 10 does not shift the row |

Sized in `vmin`, not `vw`: the same page is read at forty centimetres on a
laptop and at four metres on a television, and `vw` alone breaks one of them.

## Material

Hard edges. `--radius-full` exists for exactly one element — the buzzer, because
it is the one thing in the product that is a physical button. No shadows, no
glass, no gradients. The QR code and the cover art are die-cut blocks (`cut`
mixin) on the field; everything else is drawn with the ink or a `--rule`
hairline.

Controls are blocks: `filled` inverts the field, `outlined` is ruled in ink,
`ghost` is underlined. Disabled is **ruled, never dimmed** — fading a filled
block takes its label's contrast with it.

## Motion

One authored moment per event, all of it collapsing to nothing under
`prefers-reduced-motion` (verified in the browser: zero animated elements, all
three duration tokens at `0ms`).

- **Countdown** — each second is *struck*: it arrives oversize with open
  tracking and settles. The component re-keys on the value so it restarts every
  tick.
- **Buzz** — the buzzer scales down on press, optimistically, before the server
  answers.
- **Reveal** — `card-strike`, shared by the host panel and the phone, so the
  same moment reads the same on both surfaces.
- **The clip timer** is a CSS animation whose duration is the server's remaining
  time, re-keyed on a resume. No React timer.

`--timing` is an exponential ease-out: things arrive fast and settle, the way a
card flips rather than the way a panel slides.

## Layout

`layout.stage` for the host (full field, no column), `layout.screen` for the
phone (620px, widening to 900px in game because not every player is on a
phone). The buzzer is `min(78vw, 42vh, 420px)` — three limits, because one leaves
it tiny on a wide screen or taller than a short one.

## What must not be broken

- **Both palettes, always.** A hex in a component breaks one theme silently;
  nothing type-checks CSS.
- **`@layer reset, tokens, base, components` stays in `index.html`.** A layer's
  position is fixed where its name first appears, so declaring it in a
  stylesheet makes the cascade depend on the module graph. This cost real time
  once already.
- **No eyebrow above a heading.** Framing goes below the thing it frames — see
  the reveal, where the title arrives before the words "it was".
- **Duration references fall back to `0`,** never to a literal, or someone who
  asked for no motion gets motion when a token disappears.

## Related

- [`PRODUCT.md`](PRODUCT.md) — who plays, where, and the constraints that drove
  all of this
- `.claude/rules/sass-architecture.md` — layers, side-effect vs pure modules
- `.claude/rules/i18n-and-theme.md` — the two palettes and the two dictionaries
