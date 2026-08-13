---
description: const arrows, inline type imports, null is an absence never a state
paths:
  - "**/*.ts"
  - "**/*.tsx"
---

# Code Style: const, arrow functions, imports

## Variables: `const` by default

- Use `const` for all variable declarations unless reassignment is needed
- Use `let` only when the variable is explicitly reassigned later (loops, accumulators, conditional mutations)
- Never use `var`

## Functions: `const` arrow functions

- Use `const` arrow functions everywhere:
  ```typescript
  export const myFunction = (param: string): string => { ... }
  export const MyComponent: React.FC<Props> = ({ ... }) => { ... }
  ```
- For generic components in `.tsx` files, use a trailing comma on the type parameter to disambiguate from JSX:
  ```typescript
  export const List = <T,>({ items }: ListProps<T>) => { ... }
  ```
- **Exception**: TypeScript function overloads require `function` declarations (cannot be expressed with arrow syntax)

## `null` is an absence, never a state

`T | null` answers one question: **do I hold one?** `view`, `clock`, `error` are
all that shape, and they are right — `view === null` means no snapshot has
arrived, and nothing else.

The moment `null` means something you would have to explain — "and null is the
one that is still loading", "and null means it failed" — it is a state, and a
state is a discriminated union with no `null` in any arm:

```ts
export type PlaylistPreview =
  | { error: PlainTranslationKey; status: 'failed' }
  | { status: 'found'; titles: string[] }
  | { status: 'idle' }
  | { status: 'previewing' }
```

That replaced a title list, an error and a boolean flag standing beside each
other: three fields, eight combinations, four of them real, and a refusal from
the previous query could sit under a fresh result.

**Two independent facts stay two fields**, though. `view` and `SocketStatus` are
not folded together, because *do I hold a snapshot* and *is the wire up* are
genuinely orthogonal — and the combination a union would forbid, a live view
under a reconnecting socket, is the one that keeps a network blink from ending
a round. Fold them only when a combination is actually impossible.

**Only the first load is a different screen.** That is what `T | null` encodes
for free: nothing yet means a different composition, and every later refresh
keeps the screen it has and says so somewhere small. Blanking a page on a
refresh is what conflating them costs.

## Imports: inline type imports

- When importing both types and values from the same module, use the inline `type` keyword:
  ```typescript
  // Correct
  import { type ButtonProps, Button } from 'react-aria-components'

  // Wrong — separate imports from the same module
  import type { ButtonProps } from 'react-aria-components'
  import { Button } from 'react-aria-components'
  ```
- Standalone type-only imports are fine when ALL imports from that module are types:
  ```typescript
  import type { Meta, StoryObj } from '@storybook/react-vite'
  ```
