# SASS architecture

Indented `.sass`, one file per component, co-located with the `.tsx` that
imports it.

## The cascade order is declared in `index.html`, and must stay there

```html
<style>@layer reset, tokens, base, components;</style>
```

A layer's position is fixed by where its name **first appears**. Every component
stylesheet opens with `@layer components`, and Vite injects them in module-graph
order — so a single component imported before the global sheet registers
`components` first and pushes `reset` after it. The reset then beats every
component rule, and the symptom is bizarre: `max-width` applies but `padding`
and `background` silently do not, because those are the properties the reset
sets.

This is not hypothetical; it happened during the bootstrap, caused by
`main.tsx` importing the router (which statically pulls in a page's stylesheet)
above the global stylesheet. Declared in the document head, the order cannot
depend on the import graph. **Do not move it into a `.sass` file.**

## Two kinds of style file

**Side-effect modules** emit top-level CSS and are loaded exactly once, from
`globals.sass`: `_reset.sass`, `_tokens.sass`. A component must never `@use`
them — it would reprint the whole token block into its own `<style>` tag.

**Pure modules** declare only mixins and functions, and any component may
`@use` them: `_typography.sass`, `_layout.sass`, `_focus.sass`, `_control.sass`.

`_control.sass` is how `Button` and `Link` end up identical: both include its
one mixin, so the variants and sizes are declared once and each component keeps
a single root class. The rules are printed into both stylesheets, which is the
point — a route that only uses `Button` does not download `Link`'s CSS.

If a file ever needs both, split it.

## Tokens

CSS custom properties on `:root`, not SASS variables — visible in DevTools,
overridable, and settable from JS via the `style` prop when a value is computed
at runtime. That is the **only** legitimate use of `style`:

Colours come in **two palettes**, `dark-palette` and `light-palette`, declared as
mixins in `_tokens.sass` and included from three selectors. A component never
holds a hex: it would break one theme silently, since nothing type-checks CSS.
See [`i18n-and-theme.md`](i18n-and-theme.md) for the cascade and why the
`data-theme` attribute is absent for `system`.

```tsx
<div className='cover' style={{ '--cover-url': `url(${track.coverUrl})` }}>
```

Every `--transition-*` collapses to `0ms` under `prefers-reduced-motion`, which
is why a duration reference falls back to `0` and never to its nominal value:
`transition: opacity var(--transition-base, 0)`. If the token ever disappears
the fallback is all that is left, and a literal duration would animate for
someone who asked for no motion. Non-duration tokens take their real value as
the fallback (`var(--space-m, 20px)`).

## What the reset owns on a touch screen

Two defaults the browser applies to a *document* and this is not one:

- **`user-select: none` on `body`.** A press that lands on a control the browser
  will not act on — a buzzer disabled because you already buzzed — falls through
  to a text selection, and Android answers it with a "search for SALON" sheet
  over the game. The strings genuinely worth lifting off a screen opt back in
  where they are styled: `.room-code`, `.join-url`, and every input.
- **`-webkit-tap-highlight-color: transparent`.** The grey flash follows the
  element's box and ignores its radius, so on the buzzer — the one round object
  in the product — it drew a rectangle. Nothing is lost: every control answers a
  press through react-aria's `[data-pressed]`, in its own shape.

Neither is visible on a desktop browser, and neither shows up in a screenshot.
They surface by playing on a phone.

## Class naming

Semantic names scoped by nesting, not BEM. The component's root class matches
its file name (`player-page.tsx` → `.player-page`); everything inside uses a
plain semantic name (`.roster`, `.blocker`). Avoid bare generic names that
collide with a shared component class — prefer `.join-url` over `.url`.

## State comes from react-aria's data attributes

`[data-hovered]`, `[data-pressed]`, `[data-selected]`, `[data-disabled]`,
`[data-focus-visible]`. Never compose a state class by hand in the component,
and never style `:hover` where react-aria offers `[data-hovered]` — the latter
does not fire on a touch device that merely scrolled past.
