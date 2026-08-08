# Git Hooks

Git hooks live in `.githooks/` and are activated via `git config core.hooksPath .githooks` (run automatically by the `preinstall` script in root `package.json`).

## pre-commit

Runs `biome check --write` on staged TS/TSX files (excluding generated directories), then re-stages the modified files.

**What this means for committing:**
- Biome auto-fixable issues (formatting, simple lint fixes) are applied automatically — the commit succeeds with corrected files.
- Non-auto-fixable Biome errors (e.g., complexity issues, unsafe patterns) cause the hook to fail and block the commit.

**When the hook fails:**
1. Read the Biome error output carefully.
2. Fix the root cause in the code — **never** add `// biome-ignore`, `@ts-ignore`, `@ts-expect-error`, or any suppression directive.
3. Stage the fix and create a **new** commit (do not amend — the previous commit never happened).
