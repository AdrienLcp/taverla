# Stage 05 — The design pass

**Goal.** Stop looking like a well-built prototype. This is the stage where the
`impeccable` skill does the work it exists for.

**Depends on** stages 02–04 — run it once the screens exist. Polishing a screen
that is about to change shape wastes the pass.

## How to run it

The skill is vendored at `.claude/skills/impeccable/` (147 files). Its own
guidance takes precedence over anything written here; the notes below are
context, not instructions.

Suggested sequence:

1. **`/impeccable init`** — writes `PRODUCT.md`. The context it needs: a party
   game, played in a living room, half-drunk, in the dark. Two surfaces with
   opposite constraints — a TV read from four metres away by a group, and a
   player's screen held one-handed by someone not looking at it.
2. **`/impeccable shape`** on the host console, then the player screen. Decide
   the visual world before touching CSS.
3. **`/impeccable animate`** — motion is most of what makes a game feel alive,
   and this one has three moments that deserve it: the countdown, the buzz, the
   reveal.
4. **`/impeccable audit`** and **`/impeccable critique`** to close.

## What already exists to build on, or to replace

`presentation/styles/_tokens.sass` holds two palettes as mixins — a dark one
(deep violet ground, hot pink accent) and a light one — plus a spacing scale,
radii and durations. It is a foundation chosen for legibility, not a committed
visual world — **treat it as evidence, not as a constraint.** If the pass wants
to replace it, replace both.

Three things must survive whatever happens:

- **Both themes.** Every colour is a semantic token defined once per palette; no
  component holds a hex. A pass that hard-codes a colour breaks light mode
  silently, because nothing type-checks CSS. See stage 07.

- **Every `--transition-*` collapses to `0` under `prefers-reduced-motion`,** and
  duration references fall back to `0` rather than their nominal value. See
  `.claude/rules/sass-architecture.md` for why.
- **The `@layer` order lives in `index.html`.** Moving it into a stylesheet
  reintroduces a bug that cost real time in stage 00.

## The real constraints, which no amount of polish removes

- **Four metres.** The room code and the round state have to read from the far
  side of a living room. This is the constraint that should drive the host's
  type scale.
- **A dark room.** Pure white surfaces are painful. The dark ground is not a
  style choice.
- **One press, not looking.** The buzzer is hit by someone watching the TV. Size
  and position matter more than anything drawn on it.
- **The cover art is the only real image.** It arrives at 250 px from Deezer.
  Design around that, do not fight it.
- **A phone on party Wi-Fi.** A font that blocks first paint costs a player the
  first round. If the pass introduces a webfont, self-host it and use
  `font-display: swap`.

## Done when

- Both surfaces read as one product with a point of view
- The countdown, the buzz and the reveal each have motion that means something
- `prefers-reduced-motion` degrades to no animation, verified
- Contrast passes at the sizes actually used
- Verified in a real browser at 414 px and at 1920 px, in **both themes**, and
  on a real phone
- No layout shift when scores change from one digit to two

## Out of scope

A component library, Storybook, a token pipeline. One app does not justify them.
