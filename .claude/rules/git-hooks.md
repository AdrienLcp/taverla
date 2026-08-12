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

## It destroys a partial staging of a TS/TSX file

The hook's last line is `git add` over **every** staged TS/TSX file, whether or
not Biome touched it. `git add` takes the working tree, so a file staged as a
subset of its working-tree changes — `git add -p`, or a blob written straight to
the index — is silently replaced by the whole of it. The commit succeeds and
carries changes that were deliberately held back. Nothing warns.

It bites whenever two pieces of work share a file: splitting one commit out of a
mixed tree, or holding back an experiment sitting in the same module.

**The fix is not `--no-verify`.** Put the intended content in the *working tree*
before committing, so the hook's `git add` is a no-op, then restore the full
version afterwards:

```bash
cp file.tsx /tmp/full.tsx          # keep what is being held back
git apply -R held-back.patch       # working tree = what the commit should carry
git add file.tsx && git commit     # the hook re-adds identical content
cp /tmp/full.tsx file.tsx          # put the rest back, still uncommitted
```

Markdown, `.sass` and untracked files are unaffected — the hook filters on
`.ts .tsx .js .jsx .mjs .json .css .scss`.

**Check after every partial commit**: `git show --stat HEAD` against what
`git diff --cached --stat` said before. Different numbers mean the hook widened
it.
