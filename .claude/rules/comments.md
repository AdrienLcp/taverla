---
description: Names first — a comment carries a fact absent from the code; JSDoc documents what a caller relies on
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.sass"
  - "**/*.css"
---

# Comments: names first

A comment is an admission that the code could not say something on its own — so
the first question is always whether a better name, a smaller function or a
clearer control flow would say it instead. Reach for the comment only once that
has failed.

The bar is not "is this true and interesting?". Plenty of true, interesting
sentences are worth nothing above a line that already says them.

## The only thing that earns a comment

**A rule the reader cannot derive, and would get wrong.** Concretely:

- a **business rule that is unusual, arbitrary or counter-intuitive** — a
  threshold somebody chose, an exception that applies to one role, an order of
  operations imposed from outside;
- a **constraint enforced somewhere else** — a value another module depends on,
  an invariant a schema guarantees, an attribute only some elements carry;
- an **upstream quirk or a worked-around bug** — a library behaving against its
  own documentation, a browser bug, a race the code is shaped around;
- a **decision with a cost**, where the cheaper-looking alternative is wrong.

Everything else: name it better and say nothing. Paraphrase, a paraphrase with a
`so that` bolted on, a justification of the obvious implementation, a danger you
did not verify, section headers, status notes and banners are each written for
somebody who is not reading this file.

## The test, in one line

> Name the fact the comment carries that is absent from the code and its
> identifiers. If you cannot, in one breath, delete the comment.

Then read the line without it. If it still reads clearly, it was filler. If it
does not, keep the comment — one or two lines, tight.

## JSDoc is documentation

- **A `/** … */` on an export, a component, a prop or a type is welcome**: it
  shows on hover and states the contract a caller relies on — enumerate union
  values, state the default, note behaviour the type cannot express. Every prop
  of a `Props` type carries one that adds information. Rewrite it when the
  symbol changes.
- **JSDoc on an internal helper is a comment wearing a doc block**, and meets the
  bar above.
- **Write them on the last pass.** Comments added while iterating bloat the diff
  and most do not survive the final shape of the code.

## Stylesheets

The same rule holds in `.sass` and `.css`, where nothing type-checks and a
comment drifts unseen:

- **`///` SassDoc on a pure module's `@mixin` or `@function`** is welcome like
  JSDoc on an export: what it is for, what it demands of the element, what it
  degrades to.
- **The first line of a style module names its kind** — side-effect or pure
  (`sass-architecture.md`) — the one fact a component needs before `@use`-ing it.
- **A `//` on a declaration** names a browser bug, a constraint another rule
  depends on, or why the obvious value is wrong. What a block styles is its
  selector's name; what a value means is a token's name; a section banner is a
  sign the file holds two components.
- **A measurement or a design decision** — the viewport a size was tuned on, the
  ratio a face was compared at — goes to `apps/game/DESIGN.md`, not above the
  mixin.
