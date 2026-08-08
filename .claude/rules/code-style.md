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
