# React Component Conventions

## When a component is worth splitting — and when its length is the point

**Line count is a poor proxy here.** An audit of every component in the app
found two signals that predict one worth cutting, and neither is its size:

- it holds an **asynchronous I/O routine** — a fetch, the error mapping, the
  "nothing came back" case. That is a hook (`usePlaylistPreview`), and what
  stays behind is the draft the JSX is built from;
- it computes a **decision that deserves a test**. There is no component runner
  in this repo, so that decision is untestable where it sits: move it into
  `packages/core` and leave the rendering behind (`settingsSummary`, and
  `findBuzzBlocker` and `buildScoreboard` before it).

A **file** holding several screen-sized components is a separate problem, and a
real one: `host-console-page.tsx` was 602 lines and six of them. Sibling
components sharing no state are files that have not been given names yet.

What stays long, on purpose:

| Shape | Why it stays |
|---|---|
| A page owning a socket and its state | That is its job. A `useX` hook moves the same lines behind a name |
| A phase switch whose branches delegate to a panel each | A file per branch to write `<RevealPanel />` is worse than the switch |
| A flat list of sibling controls with no nesting | Splitting means opening seven files to see one panel. Remove the *repetition* instead — `NumberChoice`, not seven components |
| A design-system wrapper | Its length is the prop JSDoc the rules below require |

## Accessibility first

Always use `react-aria-components` (or `react-aria` hooks) for interactive UI. Check available primitives (Dialog, Toolbar, GridList, Checkbox, etc.) BEFORE writing custom HTML with manual ARIA attributes.

## Keep functions outside components when they don't depend on component state

If a function body does NOT reference props, state, refs, context, or the return value of any hook, define it at module scope — never inside the component. This avoids needless `useCallback` boilerplate, per-render allocations, extra hooks in the stack, and misleading dependency arrays.

```tsx
// Stateless handler — lives at module scope
const reload = () => {
  window.location.reload()
}

export const VersionChecker: React.FC = () => {
  return <Button onPress={reload}>Reload</Button>
}
```

Rule of thumb: if the body has no closure over anything the component owns, it is a module-level constant pretending to be a component detail — hoist it.

## Memoization: the compiler owns it

**The React Compiler is enabled** (`babel-plugin-react-compiler` via
`@rolldown/plugin-babel` in `apps/game/vite.config.ts`). Inside a component the
default is a plain `const arrow = () => …` and a plain `const value = compute()`.
Do not reach for `useCallback`, `useMemo` or `React.memo` to make something
faster — the compiler already caches every value and callback, on dependencies
it infers itself, and a hand-written one only adds an array to keep correct.

`@babel/core` is pinned to **7.x**. The compiler cannot parse Babel 8's AST for
a destructured parameter with a default — `({ isPending = false }) => …`, which
is most components — and it bails per-function *silently*: the build stays
green and the component is simply not optimized. Nothing surfaces it, so the pin
is the only guard.

### The one reason left to write `useCallback`

A function that is a **dependency of a `useEffect`** keeps it, and so does
anything that function depends on. Two reasons, and the second is the real one:

- Biome's `useExhaustiveDependencies` is not compiler-aware and reports it;
- more importantly, a fresh identity on every render re-runs the effect on every
  render. In `use-room-socket.ts` that would mean tearing down and reopening the
  WebSocket continuously. That is a correctness bug, not a performance one.

Where the value is a *callback passed in from outside* rather than one the hook
owns, prefer the latest-ref pattern over demanding a stable identity from every
caller — `use-room-socket.ts` does this with `onFrameRef`.

Hoisting still applies, and matters more than before: the compiler caches a
value per render, a module-level constant is computed once per process.

## Contexts

`createSafeContext` lives in `@/helpers/contexts`:
```typescript
export const [MyContext, useMyContext, useOptionalMyContext] =
  createSafeContext<MyContextType>('MyContext')
```
Returns a `[Context, useSafe, useOptional]` tuple:
- `useSafe()` throws if used outside the provider — for components that must be inside the provider.
- `useOptional()` returns `undefined` if used outside the provider — when the provider may be absent.

## Wrapping react-aria primitives

**Extend the primitive's props; never re-declare a subset of them.** A wrapper
that lists `onPress`, `isDisabled` and `type` by hand has quietly removed
`onPressStart`, `autoFocus`, `form`, `slot` and every ARIA attribute, and the
next feature that needs one adds it back a prop at a time.

```typescript
import {
  Button as ReactAriaButton,
  type ButtonProps as ReactAriaButtonProps
} from 'react-aria-components'

import { composeClassName } from './compose-class-name'

type ButtonProps = ReactAriaButtonProps & {
  size?: 'medium' | 'large'
  variant?: 'filled' | 'outlined' | 'underlined'
}

export const Button: React.FC<ButtonProps> = ({
  className,
  size = 'medium',
  variant = 'filled',
  ...props
}) => (
  <ReactAriaButton
    {...props}
    className={composeClassName(className, 'button', variant, size)}
  />
)
```

Add a prop of your own only for something react-aria has no opinion about — a
visual variant, a label the wrapper renders, an input attribute the primitive
does not forward. `Omit` the props the wrapper owns: `SegmentedControl` omits
`orientation` because its layout is horizontal by definition.

**Do not re-derive what a prop already does.** `isPending` on a react-aria
`Button` already blocks presses and hovers while keeping the button focusable
and announced — passing `isDisabled={isDisabled || isPending}` on top of it takes
the focusability away, which is a regression, not a belt.

`composeClassName` merges a caller's `className` with the classes the wrapper
always applies. It wraps react-aria's own `composeRenderProps`, so it **always
returns a function** — which is what makes it fit a react-aria component and not
a plain DOM element. For a plain element, a template literal is the answer.

### A line is not a `Separator`

`Separator` renders `role="separator"`, which tells assistive technology that
two *groups of content* end and begin here. Reach for it when that sentence is
true, and for nothing else:

- **Yes** — the "or" between hosting a game and joining one on the join page.
  Two independent choices, and the boundary is the only thing between them.
- **No** — the rules between scoreboard rows, the edge above the playlist
  picker, the underline under the player's scoreline. Those are borders on
  elements that already carry their own structure (a list, a section), and
  wrapping them in separator elements adds DOM and ARIA noise for nothing.

Its `className` is a plain string rather than react-aria render props, so the
wrapper composes with a template literal and not `composeClassName`.

**A label goes beside the rule, not inside it.** `Separator` takes no children,
and one boundary should stay one element: the wrapper punches the word through
a single rule rather than splitting it into two separators with a gap.

**Never borrow a control's look from a separator.** The text field used to be a
ruled underline in the same weight and ink as the page's dividers, so it read as
a third divider — and taking focus drew a box around a line.

The fix for that overshot, and the correction is worth keeping because it is the
whole material system in one example: bare `--cut` paper is the material of the
things you only *look* at — the QR card, the cover, the reveal panel. A field
wearing it was a filled button with the values swapped. **The edge says control,
the ground says which kind**: `filled` is an ink block, `outlined` is the field
behind an ink edge, an input is paper behind the same edge. See
`apps/game/DESIGN.md`.

### Three sizes, and an input is never taller than its action

`small` (40px) is for an action that sits *beside* something, `medium` (52px) is
the ordinary control, `large` (72px) is meant for a thumb or a room. Before
`small` existed every secondary action was a 52px block, so every one of them
read as a second primary action — that is what made the copy button beside the
room code look broken.

An input at 60px next to a 52px submit is what makes a form read as a stack of
slabs. The field takes the same 52px.

### Icons are authored here, not installed

`Icon` is the whole family: a 24-unit grid, `1.25em`, 3.5 units of stroke, butt
caps, miter joins. That lands the stroke on the stem weight of Archivo 900
beside it, which is the point — a library's 2-unit round-capped hairline reads
as another product's UI next to lettering this heavy, and tuning one to match
costs more than drawing the few glyphs this product needs.

A new glyph is a component that composes `Icon` and supplies only geometry
(`copy-icon.tsx`, `check-icon.tsx`). Never a `<Icon name='copy' />` — see
`abstraction-boundaries.md` on why a named component beats a string key.

**A glyph never travels alone.** The word stays beside it: a grandparent and a
child are both expected users, and a bare icon asks them to already know.

### Two controls that look alike share a mixin, not a component

`Button` and `Link` render different elements for different reasons — one acts,
one navigates — so neither wraps the other. What they share is the look, and it
is declared once on each side: `styles/_control.sass` holds the rules, and
`components/control-appearance.ts` holds their names — the `size` and `variant`
unions, the prop documentation, the defaults, and the class list the two
components hand to react-aria.

Adding a variant is therefore two edits, one per side, and never four. Both
components pass `size` and `variant` straight through undefaulted; the fallback
to `medium` / `filled` belongs to `controlClassName` so the two cannot drift.

`SegmentedControl` and `ToggleGroup` are the same arrangement one layer up.
**One answer or several is a semantic difference, not a visual one**, and the
primitive has to match: a radio group for one, a `ToggleButtonGroup` for
several — a screen reader announces which it is, and "several toggles limited to
one" is a lie a user hears. So they stay two components wearing one look, held
in `styles/_strip.sass`.

Their segments carry a `.segment` class rather than react-aria's own, because
one renders a `<label>` around a radio and the other a `<button>`. And
`ToggleButtonGroup` does not hand its `Label` an id through context the way
`RadioGroup` does, so `ToggleGroup` wires `aria-labelledby` itself — drop that
and the group loses its name with nothing failing.

### An `isInvalid` field stops the form submitting, natively

`TextField` inside a react-aria `Form` sets the input's **native** custom
validity from `isInvalid`. So a controlled error that stays on screen leaves
`form.checkValidity()` false and `requestSubmit()` a silent no-op: the button
looks alive, the press does nothing, and nothing is logged.

That turns a recoverable refusal into a dead end. Le Fake found it — writing the
real answer is refused on purpose and the player is meant to try again, and they
could not. **Clear the error as the value changes**, which is what a form should
do anyway:

```tsx
onChange={(next) => {
  setLie(next)
  setSentForRoundId(null)   // drops `isInvalid`, and the field submits again
}}
```

Verify it the only way it shows: read `input.validationMessage` in a browser
after a refusal, then again after typing. A type-check says nothing here.

### A state attribute is not always on the element you are styling

`Disclosure` stamps `data-expanded` on its **root**, never on the trigger button
inside it — so `.trigger[data-expanded]` silently matches nothing and the
chevron never turns. The build stays green and the type-check says nothing;
only opening it in a browser does. Read the attribute off the rendered DOM
before styling a state, rather than assuming it sits where the interaction does.

### A pending state must not resize the control

`Button` renders a `Spinner` on top of its label rather than in place of it, and
the label goes `color: transparent` instead of disappearing. The box is
unchanged, so nothing on the screen moves — and the label stays in the
accessibility tree, so the button keeps its name while it works.

The spinner is `aria-hidden`. react-aria already announces `isPending`; a second
live region would say the same thing twice.

## Styling — no inline styles

**Never write style values inline** (`style={{ flex: 1, minHeight: 0 }}`, `style={{ display: 'block' }}`). All styling lives in `.sass`/`.scss` files alongside the component.

The `style` prop is **reserved for passing dynamic CSS custom properties** — values computed at runtime and consumed by SASS via `var(--foo)`. That's the only legitimate use:

```tsx
// Dynamic value forwarded as a CSS var, consumed by SASS
<div className='cloud-space-card' style={{ '--card-color': cloudSpace.color }}>
```

If a wrapper `<div>` is added solely to receive an inline style for layout, that's a smell on two counts: (1) inline style, (2) needless wrapper. Apply the layout to the existing component's root in SASS, or to the parent.

## Component structure

```typescript
import type React from 'react'

import './my-component.sass'

type MyComponentProps = {
  // use type, not interface
}

export const MyComponent: React.FC<MyComponentProps> = ({ ... }) => {
  return (...)
}
```
