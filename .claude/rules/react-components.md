# React Component Conventions

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
  variant?: 'filled' | 'outlined' | 'ghost'
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

### Two controls that look alike share a mixin, not a component

`Button` and `Link` render different elements for different reasons — one acts,
one navigates — so neither wraps the other. What they share is the look, and
that lives in `styles/_control.sass`. Adding a variant means editing one file.

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
