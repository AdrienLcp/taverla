# Workflow Feedback

> **Unscoped on purpose**: every rule here fires on a *moment* — a bug reported,
> a validation asked for — never on a file being opened. Kept whole in the
> repository rather than trimmed against a contributor's personal global config,
> which the repository does not ship.

## Fix all mentioned bugs regardless of origin

When a bug or test failure is mentioned, fix it. Do not spend time investigating whether it was caused by the current change or is pre-existing. Skip the "is this pre-existing?" investigation entirely — go straight to root cause analysis and fix.

## Run the full validation, not just filtered checks

When asked to validate changes, run the full validation pipeline (`pnpm lint && pnpm build && pnpm test` or the project's equivalent), not a filtered subset. Partial checks miss regressions in unrelated code paths. Run targeted checks first for fast feedback, then follow up with the full pipeline.

## Project knowledge goes in `.claude/`, not local memory

Shared knowledge (lessons, gotchas, architecture details, naming conventions) belongs in `.claude/` (shared via git), NOT in local memory. Local memory is only for user-specific info (personal preferences, credentials). If a lesson or discovery would benefit other developers on this project, add it to `CLAUDE.md` or the relevant doc in `.claude/rules/`.

## Save discoveries immediately

Do not wait until the end of a session. After each significant finding (gotcha, architecture detail, naming convention), persist it right away to `.claude/rules/` or docs.
