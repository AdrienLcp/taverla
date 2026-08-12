---
description: Name a new symbol on its merits, not to match a badly named neighbour — and offer to rename the neighbour
paths:
  - "apps/**/src/**"
  - "packages/**/src/**"
  - "scripts/**"
---

# Naming & quality over legacy consistency

## Don't match an existing pattern if it's suboptimal

When adding a new symbol (function, type, variable, API route, CSS class, etc.), pick the name that is **clearest and most correct on its own merits** — not the one that happens to match an existing neighbouring symbol if that neighbour is poorly named.

Defaulting to consistency with legacy code propagates bad patterns and makes the codebase drift away from "pro" standards over time. The goal is to improve the codebase incrementally, not to preserve historical mistakes.

## Propose the better name AND offer to rename the neighbours

When you spot that an existing symbol is poorly named (too terse, misleading, inconsistent with its siblings, violates a convention), do not:

- Silently copy the bad name to match
- Add the new symbol with a different (better) name and leave the neighbours as-is, creating inconsistency

Instead, in the same review/task:

1. Propose the **best name** for the new symbol.
2. Flag the neighbouring symbols that are now inconsistent or subpar.
3. Offer to **rename them too** (in the same commit if scope allows, otherwise a follow-up commit) so the codebase ends up consistent AND correct.

The end state should be: consistency achieved through improvement, not through preservation of the lowest common denominator.

## Examples

**Bad:** "The neighbouring helper is called `fmtDate`, so I'll add `fmtTime` to match."
**Good:** "`fmtDate` is poorly named — propose renaming to `formatDate`. The new helper should be `formatTime` and we should rename `fmtDate` in the same MR."

**Bad:** "Component files nearby are PascalCase (`TokenModal.tsx`), so I'll add `CardInfo.tsx` with the same style."
**Good:** "PascalCase violates `.claude/rules/file-naming.md` — propose adding `card-info.tsx` and renaming the existing PascalCase files to kebab-case (tracked as a migration task, can be batched)."

## Scope discipline

This is about improving what you touch, not about rewriting the world. The rule applies when:

- The neighbouring symbol is directly related to the change you're making
- Renaming it is a mechanical change (find/replace, small review surface)
- The improvement is obvious enough that reviewers will agree on first read

For deeper renames (dozens of call sites, semantic shifts), still raise them — but as a follow-up ticket, not a blocker on the current task.
