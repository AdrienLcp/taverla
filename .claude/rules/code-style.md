---
description: const arrows, inline type imports, null is an absence — and naming a new symbol on its merits
paths:
  - "**/*.ts"
  - "**/*.tsx"
---

# Code style

## Functions are `const` arrows

```typescript
export const myFunction = (param: string): string => { … }
export const MyComponent: React.FC<Props> = ({ … }) => { … }
```

**A component's props are carried by the annotation, never by the parameter** —
`React.FC<Props>` on the left, a bare destructuring on the right. It holds for a
private component in the same file and for an inline props type as much as for
an exported one, and `React` is imported for it as `import type React from
'react'`. That leaves the namespace already in the file, so a React type inside
a props declaration is written through it — `React.ReactNode`, not a second
named import.

The exception is a **generic** component, which `React.FC` cannot express: it
keeps its props on the parameter, and in a `.tsx` file its generic takes a
trailing comma to disambiguate from JSX —
`export const List = <T,>({ items }: ListProps<T>) => …`. TypeScript overloads
are the one shape that requires a `function` declaration.

## `null` is an absence, never a state

`T | null` answers one question: **do I hold one?** `view`, `clock` and `error`
are all that shape — `view === null` means no snapshot has arrived, and nothing
else.

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

That replaced a title list, an error and a boolean standing beside each other:
three fields, eight combinations, four of them real, and a refusal from the
previous query could sit under a fresh result.

**Two independent facts stay two fields**, though. `view` and `SocketStatus` are
not folded together, because *do I hold a snapshot* and *is the wire up* are
orthogonal — and the combination a union would forbid, a live view under a
reconnecting socket, is the one that keeps a network blink from ending a round.
Fold them only when a combination is actually impossible.

**Only the first load is a different screen**, which is what `T | null` encodes
for free: nothing yet means a different composition, and every later refresh
keeps the screen it has. Blanking a page on a refresh is what conflating them
costs.

## Imports: the inline `type` keyword

```typescript
import { type ButtonProps, Button } from 'react-aria-components'
```

A standalone type-only import is right when every import from that module is a
type: `import type { Locale } from '@taverla/protocol/locale'`.

## Name a new symbol on its merits

A new symbol — function, type, variable, route, CSS class — takes the name that
is clearest on its own, not the one that matches a badly named neighbour.
Consistency with a weak precedent propagates it.

When the neighbour is the weak one, say so in the same task: propose the better
name for what you are adding, name the neighbours that are now inconsistent, and
**offer to rename them too** — `fmtDate` becoming `formatDate` beside a new
`formatTime`. The rule applies to what you touch, where the rename is mechanical
and the improvement is obvious on first read. A rename across dozens of call
sites is still worth raising, as its own commit rather than a blocker on this
one.

## One `data`, never two

A generic `data` is fine where the API is generic — `Result`'s, Zod's
`safeParse`. Two stacked are not: the reader cannot tell which layer is which.
An envelope (`{ data: … }`) is unwrapped in the adapter that receives it, in its
schema with `.transform` when there is one (`deezerListSchema`). A variable
holding a `Result` is named for what it carries — `const trackList = await
request(…)`, then `trackList.data` — and `response` is kept for a `fetch`
`Response`.

## `toSorted`, not a copy then `sort`

`array.toSorted(…)` wherever it is available, which is everywhere here — Node
and every browser this ships to. `[...items].sort(…)` is the same thing written
twice, and a bare `items.sort(…)` mutates what the caller handed over, which is
how a render-order tweak reorders somebody's state. The same goes for
`toReversed` and `with`.

An in-place `sort` survives only where the array was built inside the function
and never escapes it.

## A `Result` succeeds with nothing, never with `undefined`

`Result.success()` *is* the whole of a `Result<void, …>` — the success arm
carries no `data` key at all. `Result.success(undefined)` builds the identical
value with the absence spelled out, and `Result.failure(undefined)` builds a
failure whose error *is* `undefined` — never the unknown error, which is what
writing it almost always meant.

## A failure is logged once

On the server, an adapter reports a failure and never logs it: the Deezer
client's failure carries each fault's path, detail and kind. The handler that
decides what to do logs it once, with the context only it holds — the round
conductor names the room — at the level the kind calls for: an id nobody knows
(`not_found`) is a host's typo and a `warn`, an outage an `error`. A success
reached past failing paths — one chart of several down — carries its faults
too, and the handler logs them the same way. Nothing logs
then rethrows. Startup lines are `console.info`.

**`Result` is not this repository's code.** `@adrienlcp/result` is installed
from npm and lives in `github.com/AdrienLcp/packages`; change its shape there.
