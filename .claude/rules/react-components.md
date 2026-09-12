---
description: React components — the compiler owns memoization, functions hoist out, the style prop carries variables
paths:
  - "**/*.tsx"
  - "apps/game/src/**/*.ts"
---

# React components

## Memoization: the compiler owns it

**The React Compiler is enabled** (`babel-plugin-react-compiler` in
`apps/game/vite.config.ts`). Inside a component the default is a plain
`const arrow = () => …` and a plain `const value = compute()`: the compiler
already caches every value and callback on dependencies it infers itself, so a
hand-written `useMemo`, `useCallback` or `React.memo` only adds an array to keep
correct.

**The one reason left to write `useCallback`** is a function that is a
**dependency of a `useEffect`**, and anything that function depends on. A fresh
identity on every render re-runs the effect on every render — in
`use-room-socket.ts` that means tearing down and reopening the WebSocket
continuously, which is a correctness bug rather than a slow one.

## A value from outside is an Effect Event, not a ref

Where the value comes *from outside* the hook — a callback passed in as a prop,
or something that moves on its own like the clock estimate — reach for
**`useEffectEvent`** rather than a latest-ref, and never demand a stable identity
from every caller. It holds one identity for the life of the component and
always runs the latest closure, which is what `use-room-socket.ts` does with
`onFrame`: the socket is built once and still forwards to whatever the current
render handed it.

Two rules come with one. It is **never a dependency** — leave it out of the
array — and it **cannot be called during render**, which is the only thing React
guards at runtime. Calling one from an event handler works and `useSettledStatus`
does it, but the shape React documents is a call from inside an Effect.

## A function with no closure lives at module scope

If a body does not reference props, state, refs, context or the return value of
a hook, define it outside the component. It is computed once per process where
the compiler would cache it once per render, and it keeps a dependency array
from ever being written about it.

## Contexts

`createSafeContext` in `@/helpers/contexts.ts` returns
`[Context, useSafe, useOptional]` — `useSafe()` throws outside the provider,
`useOptional()` returns `undefined`.

## An `isInvalid` field stops the form submitting, natively

`TextField` inside a react-aria `Form` sets the input's **native** custom
validity from `isInvalid`. A controlled error that stays on screen therefore
leaves `form.checkValidity()` false and `requestSubmit()` a silent no-op: the
button looks alive, the press does nothing, and nothing is logged. Le Fake found
it — writing the real answer is refused on purpose and the player is meant to
try again, which they could not.

**Clear the error as the value changes**, which is what a form should do anyway:

```tsx
onChange={(next) => {
  setLie(next)
  setSentForRoundId(null)   // drops `isInvalid`, and the field submits again
}}
```

It shows one way only: read `input.validationMessage` in a browser after a
refusal, then again after typing.

## The `style` prop carries CSS custom properties, and nothing else

Every value lives in the `.sass` beside the component. The one legitimate use of
`style` is a property computed at runtime and consumed through `var(--foo)`:

```tsx
<div className='cover' style={{ '--cover-url': `url(${track.coverUrl})` }}>
```

A wrapper `<div>` added to receive a layout style is two faults at once — apply
the layout to the existing root, or to the parent.

## Related

- [`design-system.md`](design-system.md) — wrapping a react-aria primitive
- [`../../docs/component-shape.md`](../../docs/component-shape.md) — when a
  component is worth splitting, what stays long, and the `@babel/core` pin
