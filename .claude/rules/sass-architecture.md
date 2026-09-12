---
description: Layers, the index.html cascade order, the two palettes, react-aria's state attributes
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

Every `--transition-*` collapses to `0ms` under `prefers-reduced-motion`, which
is why a duration reference falls back to `0` and never to its nominal value:
`transition: opacity var(--transition-base, 0)`. A literal duration there would
animate for someone who asked for no motion. Non-duration tokens take their real
value as the fallback (`var(--space-m, 20px)`).

## Colours come in two palettes

`_tokens.sass` holds `dark-palette` and `light-palette` as mixins, included from
three selectors. Every colour is a semantic token — `--field`, `--ink`,
`--ink-muted`, `--rule`, `--cut`, `--cut-ink` — and the pair a component reads is
only ever `--field` / `--ink`: the phase decides which of the six they point at,
and a component never names a phase. **A hex in a component breaks one theme
silently**, because nothing type-checks CSS.

```sass
\:root                                          // dark, the default
\:root[data-theme='light']                      // an explicit light choice
@media (prefers-color-scheme: light)
  \:root:not([data-theme='dark'])               // the system, resolved in CSS
```

`ThemeProvider` stamps `data-theme` **only for an explicit choice** and removes
it for `system`. That is what keeps the first paint correct: a JavaScript-decided
theme cannot apply until React has mounted, and that gap is the flash of the
wrong ground. Do not "simplify" it into always stamping.

**Adding a colour is adding it to both mixins**, then checking contrast at the
size it is used — 4.5:1 for body text, and the light palette is where this
usually fails, because the muted greys that read well on black are too pale on
white. The `theme-color` meta tags in `index.html` are the same two grounds: if
`--void` changes, they change.

## What the reset owns on a touch screen

Two defaults the browser applies to a *document* and this is not one:

- **`user-select: none` on `body`.** A press that lands on a control the browser
  will not act on — a buzzer disabled because you already buzzed — falls through
  to a text selection, and Android answers it with a "search for SALON" sheet
  over the game. What is genuinely worth lifting off a screen opts back in where
  it is styled: `.room-code`, `.join-url`, `.join-reminder .code`, the player
  header's own `.room`, and every input. The list grows with every surface that
  puts the room code somewhere new — a code you cannot lift is a code somebody
  retypes.
- **`-webkit-tap-highlight-color: transparent`.** The grey flash follows the
  element's box and ignores its radius, so on the buzzer — the one round object
  in the product — it drew a rectangle. Nothing is lost: every control answers a
  press through react-aria's `[data-pressed]`, in its own shape.

Neither shows up in a screenshot. They surface by playing on a phone.

## Class naming

Semantic names scoped by nesting, not BEM. The root class matches the file name
(`player-page.tsx` → `.player-page`); everything inside takes a plain semantic
name (`.roster`, `.blocker`). Prefer `.join-url` over `.url` — a bare generic
name collides with a shared component's class.

## State comes from react-aria's data attributes

`[data-hovered]`, `[data-pressed]`, `[data-selected]`, `[data-disabled]`,
`[data-focus-visible]`. Never compose a state class by hand, and never style
`:hover` where react-aria offers `[data-hovered]` — the latter does not fire on
a touch device that merely scrolled past.

**Read the attribute off the rendered DOM before styling a state**, because it
is not always on the element the interaction is on. `Disclosure` stamps
`data-expanded` on its **root**, never on the trigger inside it, so
`.trigger[data-expanded]` matches nothing and the chevron never turns. A split
primitive is the same trap one level up: `isHovered`, `isPressed` and
`isFocusVisible` belong to `SwitchButtonRenderProps` and not to
`SwitchFieldRenderProps`, so those selectors go on the button. Left on the field
they match nothing, the build stays green, and the control has stopped answering
the pointer.

## A keyframe substitutes a custom property, it does not compute with one

`var()` in a keyframe is fine on its own. **Wrapped in a `calc()` it is never
interpolated** — Chrome holds the declaration unresolved for the whole run, so
the animation sits on its `from` value from the first frame to the last, and
the property only appears to move when something else rewrites the element.

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
