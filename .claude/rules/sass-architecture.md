---
description: Layers, the index.html cascade order, tokens and units, the two palettes, the text voice, react-aria's state attributes
paths:
  - "**/*.sass"
  - "apps/game/index.html"
  - "apps/game/src/presentation/theme/**"
---

# SASS architecture

Indented `.sass`, one file per component, co-located with the `.tsx` that
imports it.

## The cascade order stays in `index.html`

```html
<style>@layer reset, tokens, base, components;</style>
```

A layer's position is fixed by where its name **first appears**, and Vite
injects component stylesheets in module-graph order — so a single component
imported before the global sheet registers `components` first and pushes `reset`
after it. The reset then beats every component rule, and the symptom is bizarre:
`max-width` applies but `padding` and `background` silently do not, because
those are the properties the reset sets. It cost real time once. Declared in the
document head the order cannot depend on the import graph, so **do not move it
into a `.sass` file.**

## Two kinds of style file

**Side-effect modules** emit top-level CSS and are loaded exactly once, from
`globals.sass`: `_reset.sass`, `_tokens.sass`, `_fonts.sass`. A component that
`@use`s one reprints the whole block into its own `<style>` tag.

**Pure modules** declare only mixins and functions, and any component may `@use`
them: `_typography.sass`, `_layout.sass`, `_focus.sass`, `_control.sass`,
`_strip.sass`. Each says which it is on its first line; a file that would be
both is split.

`_control.sass` is how `Button` and `Link` end up identical, and `_strip.sass`
does it for the two choice strips. The rules are printed into both stylesheets,
which is the point — a route that only uses `Button` does not download `Link`'s
CSS.

## Tokens

CSS custom properties on `:root`, not SASS variables — visible in DevTools,
overridable, inherited, and settable from JS through the `style` prop when a
value is computed at runtime. A `$var` earns its place only for compile-time
work: maths, `@if` / `@for` inside a mixin, a value another SASS file reads
while compiling.

**`tokens.defaults` from `@adrienlcp/styles/tokens` comes first** in `:root`, so
`_tokens.sass` declares only the values it changes — `--stroke-thin`,
`--stroke-bold`, `--hairline` — and reads the shared names for the rest:
`--stroke-hair`, `--target`, `--tracking-tight`, `--measure`, `--ease-out`.
The durations keep the shared names `--transition-fast`, `--transition-base`
and `--transition-slow` with the game's own values; a value equal to the
default is not redeclared. A shared name keeps its one meaning: a control's own boundary is
`--rule-strong`, never a parallel name, and a drawn control's height is
`--control-height`, raised to `max(var(--target), 3.25rem)` and never below the
target. No other name joins a shared family (`--control-*`, `--outline-*`,
`--ring-*`, `--target-*`): a control's foreground is `--on-control`, like
`--on-primary`. The ring is `var(--ink)` on purpose, the
one colour guaranteed against whatever the phase or the reflex flip painted, so
there is no `--focus` colour.

A duration falls back to `0s` — `transition: opacity var(--transition-base, 0s)`.
A bare `0` is no `<time>`: the whole declaration goes invalid and every other
transition in its list dies with it. A literal duration there would animate for
someone who asked for no motion. A duration of the game's own — a keyframe
animation, a stagger's delay — is written over a shared one,
`calc(var(--transition-fast, 0s) * 5)`, so the reduced-motion collapse reaches
it too; a radius is a `--radius-*` token. Non-duration tokens take their real value as
the fallback (`var(--space-m, 1.25rem)`).

**Reduced motion is `reduced-motion.css`'s job**: it collapses the
`--transition-*` tokens and ends every keyframe animation at once, looping ones
included. A component writes its own `@media (prefers-reduced-motion)` only to
hold a state the end of its animation would get wrong — a draining bar paused
at its level — and a looping animation carries its meaning without motion too:
the reconnecting dot is half full before it pulses.

## Every size answers the user's font size

Text, spacing and boxes are `rem` — `--space-*`, `--text-*`, a control's
height, a box's width, height or offset, a `translate`, a layout width, a
breakpoint or a container threshold — so a raised browser font size or a zoom reaches them.
Strokes, outlines, radii, shadows and the touch target stay `px`, and a zero
length is `0rem`. A threshold that follows the shell reads
`layout.$wide-screen`, never a copy of it. `stylesheets.test.ts` beside the
tokens runs `findUnitFailures`, `findTypeLiterals` and `findUnnamedValues` from
`@adrienlcp/styles/audit` over every stylesheet, and `findTokenFailures` over
every source, scripts included: no literal radius, duration or font size, no
`var()` of a name declared nowhere. It passes `{ provided: REACT_ARIA_TOKENS }`
for the names react-aria sets at runtime and carries no exclusion of its own: a
name built by interpolation (`var(--pawn-${n})`) is not read. `validate` holds this section and the text voice below.

**The game grows with the screen through one unit, `--stage-unit`** (`1vmin`):
the same page is read at forty centimetres and at four metres, so a size that
follows the shorter side of the screen is written `calc(var(--stage-unit) * 4)`,
never a bare `vmin`, and a text size keeps rem bounds around it. The token is
the named opt-out of the container-first rule; nothing else uses viewport units
for a size.

## A component writes values by name

`_tokens.sass` and the pure modules name every value that carries the look or
comes back twice, and a component picks from them: `--space-*` for margin,
padding and gap; a `_typography.sass` mixin for the text voice, and a `--text-*`
step for a size set on its own; `--stroke-*` for a line's weight (colour and
style stay at the call site) and `--hairline` for the board's rule whole;
`--radius-*`; `--target` / `--control-height`; `--measure` or a
`--measure-<role>` for a line length, in `em`: no size is written in `ch`,
whose zero the fallback face draws at another width, so a measure is the zero
of its line's face measured in Chromium and written in `em`; a soft shadow is a
`--shadow-<role>` layer whole (`--shadow-piece`, `--shadow-pressed`,
`--shadow-recess`…, coloured `--shadow-ink`), the chipboard edge beside it
staying the piece's own depth, `--edge`: a press, a lift or a pull reads its
travel from `--edge` as well as its shadow's offset
(`translateY(calc(var(--edge) * 0.75))` against `calc(var(--edge) * 0.25)`),
since a rem travel against a px shadow stays in step at one root size only. A step the scale lacks joins it. A value that changes with the screen is a **role token** beside the
scale — `--space-stage-split`, `--space-stage-rows`, `--space-framed` — rather
than the same `clamp()` typed into each component.

A value a token already names is read through it — the wide column is
`var(--column-wide-max-width)`, never `900px` — and derived geometry is `calc()`
over the tokens it is made of, as `--menu-inset` adds `--layout-padding` to
`--menu-width`, or the switch's thumb travel subtracts its strokes and inset from
the track, never the total typed out. A parent's placement override written
twice for its children becomes a variant in the parent's stylesheet. An audit
lands in two commits: exact tokenisation, which changes no pixel, then the snaps
to the scale.

A literal is the element's own geometry: `0`, `100%`, a grid template, an
`em` tracking its font, a sprue nub's 10×3. A font size taken against its line
— a rank beside a fitted name, a score above it — is a `--text-em-*` step
(`--text-em-s`, `--text-em-l`, `--text-em-xl`); only `1em` stays a literal. **Fitted display type is geometry
too**, written on the component inside its own container and floored on the
scale — `clamp(var(--text-xs), calc(100cqh / var(--rows) / 2.3), 1.75rem)`,
or `max(var(--text-xs), …)` — never a `px` floor and never a floor variable
beside the scale. `--text-xs` (0.875rem) is the smallest a question, a choice or
a fitted board is drawn: the floor `e2e/choice-fits.spec.ts` holds every word
to. The scale is a range, not a cap: it grows at either end in the same
pattern (`--text-3xs`). A spacing `clamp()` takes its
floor and its cap from the scale. What stays a literal is a few pixels of
joint: a pip gap, a strip's seam, a sprue nub. The same value written a second
time for the same purpose is promoted: `question-card.clock-margin` is where
the sand lies on a card, wherever a card is drawn.

A shorthand token that reads another (`--hairline` reads `--rule`) freezes
it where it is declared, so it is declared again wherever its input is — the
lid redeclares `--rule`, `--rule-strong` and `--hairline`. Nothing in the build
notices: a token resolved on `:root` inside a lid prints the board's colour on
paper.

## The text voice lives in `_typography.sass`

`font-weight`, `line-height` and `letter-spacing` are declared only in a
`_typography.sass` mixin. A component includes one — `typography.caption-strong`,
`typography.score`, `typography.solid` — and sets at most its own size; a
variation becomes a new mixin named for its role, never a declaration beside the
include. Why the registers are sized as they are, and what they were measured
on, is in `apps/game/DESIGN.md`.

## Colours come in two palettes

Every colour token in `_tokens.sass` is one `light-dark()` — or a single value
for a printed piece that does not change colour when the lights go down — read
off `color-scheme`, which `@adrienlcp/theme-preference/color-scheme.css` sets
from the system and from an explicit `data-theme`. The pair a component reads is
only ever `--field` / `--ink`: the phase decides which tokens they point at, and
a component never names a phase. **A hex in a component breaks one theme
silently**, because nothing type-checks CSS.

`@adrienlcp/theme-preference` stamps `data-theme` **only for an explicit
choice** and removes it for `system`, from a pre-paint script its Vite plugin
inlines in the head and live from `themeStore`. That is what keeps the first
paint correct: a theme decided after the first paint is the flash of the wrong
ground. Do not "simplify" it into always stamping.

**Adding a colour is writing both its values**, then adding the pair it is drawn
on to `tokens-contrast.test.ts` — 4.5:1 for text, 3:1 for what is not text. The
light palette is where this usually fails, because the muted greys that read
well on dark are too pale on light. The `theme-color` meta tags in `index.html`
are the two board grounds: if `--board` changes, they change.

## What the reset owns on a touch screen

Two defaults the browser applies to a *document* and this is not one:

- **`user-select: none` and `-webkit-touch-callout: none` on `body`.** A press
  that lands on a control the browser will not act on — a buzzer disabled
  because you already buzzed — falls through to a text selection, and Android
  answers it with a "search for SALON" sheet over the game. What is genuinely
  worth lifting off a screen opts back in with `user-select: text` where it is
  styled: `.room-code`, `.join-url`, `.join-reminder .code`, the player
  header's own `.room`, and every input. The list grows with every surface that
  puts the room code somewhere new — a code you cannot lift is a code somebody
  retypes.
- **`-webkit-tap-highlight-color: transparent`.** The grey flash follows the
  element's box and ignores its radius, so on the buzzer — the one round object
  in the product — it drew a rectangle. Nothing is lost: every control answers a
  press through react-aria's `[data-pressed]`, in its own shape.

Neither shows up in a screenshot. They surface by playing on a phone.

## The page runs edge to edge

`index.html` declares `viewport-fit=cover`, and every surface that reaches an
edge pads by the larger of its own space and the inset, never the sum:
the sides pad by `--gutter-left` and `--gutter-right` from `tokens.defaults`,
computed on `:root` from `--gutter` (set there to `--layout-padding`), and
`--layout-padding-block-*` and `--framed-padding-block-*` are `max()` of the
padding and the `--safe-area-*` tokens, which carry the `0px` fallback and read
Android's static bottom inset first. `#root` is not padded, or
every page would pay the inset twice. A raw `env()` is never written.

## What `globals.sass` sets

`html` reserves the scrollbar's gutter (`stable`) and paints it in
`--rule-strong` on `--field`; `body` sets `caret-color: var(--ink)` and
`font-synthesis: none`, so a weight the face lacks shows as missing in review
rather than faked; `::selection` is `--selection` under `--ink`, a pair in
`tokens-contrast.test.ts`; `#root` fills `100dvh` and clips both axes, so a page
entering with a `transform` or a drawer parked off-screen never scrolls the
document. Both faces load `optional`, and each the first screen reads is
preloaded at the default priority by the prerender's `addFontPreloads`, in the
prerendered pages only — the `index.html` shell also serves the redirect and
the not-found page, where a preloaded font sits unused while the browser warns.
The fallback faces are written per weight band in `_fonts.sass`
(`fonts.fallback-faces`, skipped in fontaine): with `font-synthesis: none`,
fontaine's one regular Arial face would set every bold title regular. The font
tokens name each `… fallback` family themselves, since fontaine adds it to a
`font-family` declaration and never to a custom property. `metricTwins()` from
`@adrienlcp/styles/metric-twins`, right after fontaine, widens Arial and Arial
Bold to their metric twins; no copy of it lives here.

## Class naming

Semantic names scoped by nesting, not BEM. The root class matches the file name
(`player-page.tsx` → `.player-page`); everything inside takes a plain semantic
name (`.roster`, `.blocker`). Prefer `.join-url` over `.url` — a bare generic
name collides with a shared component's class.

## A component answers its container

`globals.sass` makes `body` a container (`layout.container`, forwarded from
`@adrienlcp/styles/containers`), so a component no one wrapped still matches
`container-wide` / `container-narrow` against the page. A query reads `width`
and `aspect-ratio` in range syntax, thresholds in `rem`. The viewport keeps what
is positioned against it — the framed screens held to `100dvh` — and what is not
a width.

## State comes from react-aria's data attributes

`[data-hovered]`, `[data-pressed]`, `[data-selected]`, `[data-disabled]`,
`[data-focus-visible]`. Never compose a state class by hand, and never style
`:hover` where react-aria offers `[data-hovered]` — the latter does not fire on
a touch device that merely scrolled past. A native element react-aria does not
drive — a `<details>` summary, a plain `<a>` — has only `:hover`, which a touch
screen leaves stuck after a tap, so it goes inside `@media (hover: hover)`.

**Read the attribute off the rendered DOM before styling a state**, because it
is not always on the element the interaction is on. `Disclosure` stamps
`data-expanded` on its **root**, never on the trigger inside it, so
`.trigger[data-expanded]` matches nothing and the chevron never turns. A split
primitive is the same trap one level up: `isHovered`, `isPressed` and
`isFocusVisible` belong to `SwitchButtonRenderProps` and not to
`SwitchFieldRenderProps`, so those selectors go on the button. Left on the field
they match nothing, the build stays green, and the control has stopped answering
the pointer.

Visually hidden text is `accessibility.visually-hidden` from
`@adrienlcp/styles/accessibility`, and the ring is `_focus.sass`'s — neither is
written by hand. A ring drawn on a descendant of the focused element passes it
as `$on` — the switch rings its track with `@include focus.ring('.track')` —
and a box around a field takes `focus.ring-within`. Every focusable rings by
default: `globals.sass` includes `focus.ring-focusables` once in `@layer base`,
so a component includes `focus.ring` only where its ring differs or where the
focused element is not one that list matches — a `Radio`'s label over its
hidden input, a slider's thumb — and a ring
closer than the configured offset passes `$offset` rather than an
`outline-offset` written after the include.

## Single-line text in a box is trimmed, not squeezed

`text-box: trim-both cap alphabetic` takes the half-leading and the descender
room off a line, so symmetric padding centres the ink. It is above the build
targets (Vite's `baseline-widely-available`), so every use degrades to today's
rendering, and it **only reaches a block container** — the text of a flex
container is an anonymous item no selector hits, which is why `Button`, `Link`
and `ToggleButton` wrap each string child in a `.control-label` span.

- **A label in a box whose height is a `min-height`** (a control, the menu
  trigger): bare `text-box` on the label. Nothing moves but its centre.
- **A painted stamp, segment or error**: `text-box.trimmed-block($padding)` from
  `@adrienlcp/styles/text-box`, which grows the padding by exactly
  `(1lh - 1cap) / 2` under one `@supports`. The block keeps its size to the
  pixel, so a reservation measured against it (`.banked`, `.yours`) stays right.
- **A figure on a line of its own**: `text-box.trimmed-figure`, with
  `line-height: 1` as its fallback. It shrinks the row, so a board whose type is
  a budget divided by its rows takes a smaller divisor under the same guard —
  `--standings-row`, `--tallest-row`, `--board-row`, each measured on the
  rendered rows.
- **Prose and wrapping display type** keep their line-height: it sets the gap
  *between* lines, which `text-box` never touches. An `overflow: hidden` box is
  clipped to the trimmed height, so a trimmed line that ends in an ellipsis clips
  across only (`overflow-x: clip`).

## A keyframe substitutes a custom property, it does not compute with one

`var()` in a keyframe is fine on its own. **Wrapped in a `calc()` it is never
interpolated** — Chrome holds the declaration unresolved for the whole run, so
the animation sits on its `from` value from the first frame to the last, and
the property only appears to move when something else rewrites the element.
`--stage-unit` follows the same rule: a keyframe that needs a size reads a
token computed outside it.

```sass
// Never: the animation does not run.
@keyframes drain
  from
    stroke-dashoffset: calc(1 - var(--left, 1))

// Do the arithmetic where the value is produced, and substitute it whole.
@keyframes drain
  from
    stroke-dashoffset: var(--drained, 0)
```

Measured on three keyframes of one 10s animation, read at 1.5s:
`calc(1 - var(--f))` came back as the string `calc(0.3px)`, while a bare
`var()` and a literal `0.3` both read `0.406176px`. The floor dial is where it
cost a stage — the ring looked like it stepped once a second, because a
snapshot re-keying the circle was the only thing moving it at all.
