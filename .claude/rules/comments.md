# Comments: the default is zero

A comment is not documentation. It is an admission that the code could not say
something on its own — so the first question is always whether a better name, a
smaller function or a clearer control flow would say it instead. Reach for the
comment only once that has failed.

The bar is not "is this true and interesting?". Plenty of true, interesting
sentences are worth nothing above a line that already says them.

## The only thing that earns a comment

**A rule the reader cannot derive, and would get wrong.** Concretely:

- a **business rule that is unusual, arbitrary or counter-intuitive** — a
  threshold the client chose, an exception that only applies to one role, an
  order of operations imposed from outside;
- a **constraint enforced somewhere else** — a value another module depends on,
  an invariant a schema guarantees, an attribute only some elements carry;
- an **upstream quirk or a worked-around bug** — a library that behaves against
  its own documentation, a browser bug, a race the code is shaped around;
- a **decision with a cost**, where the cheaper-looking alternative is wrong.

Everything else: name it better and say nothing.

## What does not earn one, however true

- ❌ **Restating the expression in prose.** `// The PIN error is a role="alert"
  inside the modal` above `dialog(root).getByRole('alert')`.
- ❌ **The same, with a `so that` clause bolted on.** `… — scoped there so it
  cannot be confused with a toast`. The first half repeats the code, the second
  is its obvious consequence. A `so that` does not turn a paraphrase into a why.
- ❌ **Justifying the obvious implementation.** Explaining why you used the
  natural API for the job is written for a reviewer, and reviewers read diffs.
  It belongs in the MR description.
- ❌ **A danger you did not verify.** A guard against a collision that cannot
  happen here reads as a real constraint and misleads whoever later tries to
  simplify. Check it is real, or write nothing.
- ❌ **Paraphrase, section headers, status notes, banners** — see the forbidden
  list in the global rules.

## The test, in one line

> Name the fact the comment carries that is absent from the code and its
> identifiers. If you cannot, in one breath, delete the comment.

Then read the line without it. If it still reads clearly, it was filler. If it
does not, keep the comment — one or two lines, tight.

## Scope

- **JSDoc on an internal symbol is not exempt.** A `/** … */` above a helper is
  a comment wearing a doc block.
- **React component props are the documented exception**: every prop of a
  `Props` type carries a useful JSDoc — enumerate union values, state the
  default, note behaviour the type cannot express. See
  [`react-components.md`](react-components.md).
- **Do not write comments while iterating.** They bloat the diff the reviewer
  reads line by line, and most of them do not survive the final shape of the
  code. Add them on the last pass, or not at all.

## Related

- `react-components.md` — the prop-documentation exception
- `code-style.md` — naming and structure, which is where most comments should
  have gone instead
- `quality-bar.md` — a bad name is fixed, not worked around
