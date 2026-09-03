# Git hooks

> **Unscoped on purpose**: it fires at *commit* time, when the files it warns
> about may never have been read — and the partial-staging trap destroys work
> silently.

`.githooks/pre-commit` runs `biome check --write` over the staged TS/TSX files
and re-stages them, so a formatting fix lands in the commit and a lint error
Biome cannot fix blocks it. Fix the root cause and commit again — never amend,
the previous commit never happened.

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

## A second session in the same tree shares the index

Two sessions on one working copy share one index, so a plain `git commit` takes
whatever the other has staged — that is how a commit here once swallowed 255
lines of an unrelated library and needed a second commit to put them back.

`git commit -F msg -- <paths>` is the answer: it records the **working tree** of
the named paths against `HEAD` and leaves the index alone, so nothing staged
elsewhere rides along. Git builds a temporary index for it and exports
`GIT_INDEX_FILE`, so the hook's `git add` lands there and is a no-op.

Where a single file carries both sessions' edits there is no split — hold the
other session's lines out of the working tree for the length of the commit
(above), or change your own approach so the file is not shared at all.

**Check after every partial commit**: `git show --stat HEAD` against what
`git diff --cached --stat` said before. Different numbers mean the hook widened
it.
