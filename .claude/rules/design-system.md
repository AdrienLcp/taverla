---
description: Wrapping a react-aria primitive — extend its props, compose its class, and which primitive is the honest one
paths:
  - "apps/game/src/presentation/components/**/*.tsx"
---

# The design system

## Extend the primitive's props; never re-declare a subset

A wrapper that lists `onPress`, `isDisabled` and `type` by hand has quietly
removed `onPressStart`, `autoFocus`, `form`, `slot` and every ARIA attribute,
and the next feature that needs one adds it back a prop at a time.

```tsx
type ButtonProps = ReactAriaButtonProps & {
  size?: 'medium' | 'large'
  variant?: 'filled' | 'outlined' | 'underlined'
}
```

Add a prop of your own only for something react-aria has no opinion about — a
visual variant, a label the wrapper renders, an input attribute the primitive
does not forward. `Omit` what the wrapper owns: `SegmentedControl` omits
`orientation` because its layout is horizontal by definition.

**Let a prop do its own work.** `isPending` on a react-aria `Button` already
blocks presses and hovers while keeping the button focusable and announced;
`isDisabled={isDisabled || isPending}` on top of it takes the focusability away,
which is a regression rather than a belt.

`composeClassName` merges a caller's `className` with the classes the wrapper
always applies. It wraps react-aria's `composeRenderProps`, so it **always
returns a function** — which is what makes it fit a react-aria component and not
a plain DOM element. For a plain element, a template literal is the answer.

## A line is not a `Separator`

`Separator` renders `role="separator"`, which tells assistive technology that
two *groups of content* end and begin here. Reach for it when that sentence is
true, and for nothing else:

- **Yes** — the "or" between hosting a game and joining one on the join page.
  Two independent choices, and the boundary is the only thing between them.
- **No** — the rules between scoreboard rows, the edge above the playlist
  picker, the underline under the player's scoreline. Those are borders on
  elements that already carry their own structure.

Its `className` is a plain string rather than react-aria render props, so the
wrapper composes with a template literal and not `composeClassName`.

## A glyph composes `Icon`

A new glyph is a component supplying only geometry (`copy-icon.tsx`,
`check-icon.tsx`), never a `<Icon name='copy' />` — see
[`abstraction-boundaries.md`](abstraction-boundaries.md) on why a named
component beats a string key. `Icon` itself is the family's geometry, and
[`apps/game/DESIGN.md`](../../apps/game/DESIGN.md) holds why it is authored here.

## Two controls that look alike share a mixin, not a component

`Button` and `Link` render different elements for different reasons — one acts,
one navigates — so neither wraps the other. The look is declared once on each
side: `styles/_control.sass` holds the rules, `components/control-appearance.ts`
holds their names, the defaults and the class list. Adding a variant is two
edits, never four, and both components pass `size` and `variant` through
undefaulted so the fallback cannot drift.

`SegmentedControl` and `ToggleGroup` are the same arrangement one layer up.
**One answer or several is a semantic difference**, and the primitive has to
match: a radio group for one, a `ToggleButtonGroup` for several — a screen
reader announces which it is, and "several toggles limited to one" is a lie a
user hears. They wear one look, held in `styles/_strip.sass`, and their segments
carry a `.segment` class rather than react-aria's own because one renders a
`<label>` around a radio and the other a `<button>`. `ToggleButtonGroup` does
not hand its `Label` an id through context the way `RadioGroup` does, so
`ToggleGroup` wires `aria-labelledby` itself — drop that and the group loses its
name with nothing failing.
