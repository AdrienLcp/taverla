---
description: CSS custom properties over SASS variables
paths:
  - "**/*.sass"
---

# CSS Custom Properties over SASS Variables

Default to **CSS custom properties** (`--name: value` + `var(--name)`) for any constant or token used inside a `.sass`/`.scss` file. SASS variables (`$name`) only appear when they bring something CSS custom properties cannot — typically compile-time math, `@if`/`@for` inside mixins, or values consumed by other SASS files at compile time.

## Why

- **Visible in DevTools.** A CSS var shows up on the element's computed style; a SASS variable disappears at compile time. Debugging is faster.
- **Overridable.** Themes, parent components, JS-set values, media queries can all override a CSS var without recompiling SASS.
- **JS bridge for free.** When the value needs to be set at runtime, pass it via `style={{ '--name': value }}` — the only legitimate use of the `style` prop.
- **Cascade-friendly.** A CSS var defined high up the tree is inherited by descendants. SASS `$vars` only exist in the `.sass` file that imports them.

## How

```sass
// CSS custom property, scoped to the component
.table-wrapper--with-footer
  --table-footer-spacing: 104px

  .table
    padding-bottom: var(--table-footer-spacing)
```

```sass
// SASS only when truly needed (compile-time math)
$columns: 12
@for $i from 1 through $columns
  .col-#{$i}
    flex-basis: percentage(math.div($i, $columns))
```

```sass
// Anti-pattern — SASS variable for something a CSS var would cover
$footer-spacing: 104px

.table
  padding-bottom: $footer-spacing
```

If the value is computed in JS (e.g. dynamic theme colour, viewport-derived size), forward it via the `style` prop:

```tsx
<div className='cloud-space-card' style={{ '--card-color': cloudSpace.color }}>
```
