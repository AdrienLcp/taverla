# Committing

> **Unscoped on purpose**: it applies at *commit* time, when the files being
> committed may never have been read.

## A second session in the same tree shares the index

Two sessions on one working copy share one index, so a plain `git commit` takes
whatever the other has staged — that is how a commit here once swallowed 255
lines of an unrelated library and needed a second commit to put them back.

Commit with `git commit -F msg -- <paths>`: it records the **working tree** of
the named paths against `HEAD` and leaves the index alone, so nothing staged
elsewhere rides along. Then check `git show --stat HEAD` lists exactly those
paths.

Where a single file carries both sessions' edits there is no split by path —
hold the other session's lines out of the working tree for the length of the
commit, then put them back, or change your approach so the file is not shared.
