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
`underlined` has neither. Disabled is **ruled, never dimmed** — fading a filled
block takes its label's contrast with it. A choice strip obeys the same rule the
same way: the selected stamp drops its ink ground and keeps the ink as an inset
edge, which is what lets a host read their settings over a dead socket.

**A section a reader opens is a ruled row, not a block.** A bordered control
beside the one action on the screen reads as a second one, so `Disclosure`'s
trigger carries no edge of its own — only the rule it shares with every other
section boundary. Its summary line is what makes the fold honest: it names the
values, never a count of them, because a section whose state is invisible is a
section nobody knows to open.

**The edge says control, the ground says which kind.** Three materials, and the
distinction only works because all three carry the same 3px ink edge:

| Material | Ground | Is |
|---|---|---|
| `filled` | ink | the one action on the screen |
| `outlined` | the field | an action of equal standing |
| input | `--cut` paper | something you write on |

Bare paper with no edge belongs to the things you only *look* at — the QR card,
the cover, the reveal panel. An input that borrowed it was the same block as a
filled button with the values swapped, and it was **taller than the button that
submitted it**, which is what made a form read as a stack of slabs. An input is
never taller than its own action.

Three sizes: `small` (40px) for an action that sits *beside* something, `medium`
(52px) for the ordinary control, `large` (72px) for a thumb or a room. Before
`small` existed every secondary action was a 52px block, so every one of them
read as a second primary action.

### Icons

There is an icon family, and it is authored rather than installed. Every glyph
is `Icon` — a 24-unit grid, `1.25em`, 3.5 units of stroke, butt caps, miter
joins — which lands the stroke on the stem weight of Archivo 900 beside it. A
library's 2-unit round-capped hairline reads as a different product's UI next
to lettering this heavy, and tuning one to match costs more than drawing the
two or three glyphs this product actually needs.

A glyph never travels alone: it sits beside the word, because a grandparent and
a child are both expected users and a bare icon asks them to already know.

**The mark is the wordmark's initial**, cream on the lobby ground, hard-edged
and square — the one place a `T` stands alone, because a favicon has no room for
a word beside it. It replaced a rounded near-black tile with a neon-pink dot,
which was the prototype's world and had outlived it by a whole design pass. The
share card is the same two colours with the wordmark set in `monument`, rendered
at 1200×630 rather than drawn: it is the type, so it should come from the type.

## Motion

One authored moment per event, all of it collapsing to nothing under
`prefers-reduced-motion` (verified in the browser: zero animated elements, all
three duration tokens at `0ms`).

- **Arriving on a page** — `page-enter`, eight pixels and a fade on `base`. It
  is carried by the `screen` and `stage` mixins rather than written on each
  root, so the screens cannot drift and the next one inherits it. Deliberately
  quieter than the reveal, which uses scale on `slow`: a navigation must not
  borrow the weight of what a round pays out.

  **Nothing inside a running round animates.** The phase colour and the reveal
  are the moving parts by design, and a screen that resettled on every snapshot
  would read as lag on a surface that is timing people.
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

**The lobby is two columns and two audiences.** The invitation — code, QR, join
URL — is what the room is reading; the roster and the setup are the host's own.
Below 900px they stack, and that is where the setup had to learn to fold: eight
strips of settings at the same weight as the QR code turned a title card into a
form, and put the launch below everything. The fold is collapsed at every width,
because the desktop column was the same wall with more room to hide in.

## What must not be broken

- **Both palettes, always.** A hex in a component breaks one theme silently;
  nothing type-checks CSS.
- **`@layer reset, tokens, base, components` stays in `index.html`.** A layer's
  position is fixed where its name first appears, so declaring it in a
  stylesheet makes the cascade depend on the module graph. This cost real time
  once already.
- **A framing label goes below the thing it frames, unless it opens a
  sentence.** The default keeps the eye from climbing a label to reach the
  payload. The reveal is the exception, and the copy is what decides it: "it
  was" / "c'était" is an amorce, so it sits above the title and the two read as
  one line. A label that merely *names* what follows ("the answer") would go
  back below. If a locale ever lands whose copula follows the noun — Japanese,
  Korean, Turkish — that is when the order becomes the locale's business, via
  `order` under `:lang()`. Two locales, both amorces, is not that day.
- **Text somebody typed, set at display size, wraps.** A nickname is up to
  twenty characters and nothing makes them breakable: `Wolfgangamadeusmozar` in
  `monument` left the screen and gave the whole page a sideways scrollbar. Any
  surface that sets a nickname, a title or a search in `billboard` or above
  needs `overflow-wrap: anywhere` and a parent that will not grow — a flex
  item's minimum is its content, so `min-width: 0` is half the fix. The
  scoreboard rows solve the same problem the other way, with an ellipsis,
  because a row is a fixed height and a headline is not.
- **Duration references fall back to `0`,** never to a literal, or someone who
  asked for no motion gets motion when a token disappears.

## Related

- [`PRODUCT.md`](PRODUCT.md) — who plays, where, and the constraints that drove
  all of this
- `.claude/rules/sass-architecture.md` — layers, side-effect vs pure modules
- `.claude/rules/i18n-and-theme.md` — the two palettes and the two dictionaries
