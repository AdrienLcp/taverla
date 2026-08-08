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

Use a `createSafeContext` helper (one per project, typically in `helpers/contexts.ts`):
```typescript
export const [MyContext, useMyContext, useOptionalMyContext] =
  createSafeContext<MyContextType>('MyContext')
```
Returns a `[Context, useSafe, useOptional]` tuple:
- `useSafe()` throws if used outside the provider — for components that must be inside the provider.
- `useOptional()` returns `undefined` if used outside the provider — when the provider may be absent.

## Wrapping react-aria primitives

Use a `composeClassName` helper to merge react-aria render props with your own classes:

```typescript
import { Button as ReactAriaButton, type ButtonProps } from 'react-aria-components'

export const Button: React.FC<ButtonProps> = ({ className, ...props }) => (
  <ReactAriaButton
    {...props}
    className={composeClassName(className, 'button')}
  />
)
```

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
