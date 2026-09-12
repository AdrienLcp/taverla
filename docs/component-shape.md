# The shape of a component

What an audit of every component in this app concluded, so the next split is
decided on the same grounds. The rules that came out of it are in
[`.claude/rules/react-components.md`](../.claude/rules/react-components.md) and
[`.claude/rules/design-system.md`](../.claude/rules/design-system.md).

## Line count is a poor proxy

Two signals predict a component worth cutting, and neither is its size:

- it holds an **asynchronous I/O routine** — a fetch, the error mapping, the
  "nothing came back" case. That is a hook (`use-playlist-preview.ts`), and what
  stays behind is the draft the JSX is built from;
- it computes a **decision that deserves a test**. There is no component runner
  in this repo, so that decision is untestable where it sits: move it into
  `packages/core` and leave the rendering behind (`settingsSummary`, and
  `findBuzzBlocker` and `buildScoreboard` before it).

## A file holding several screens is the real fault

`host-console-page.tsx` was 602 lines and six screen-sized components. Sibling
components sharing no state are files that have not been given names yet, and
they got them: `features/host/` now holds `lobby-stage.tsx`,
`settings-panel.tsx`, `reveal-panel.tsx`, `verdict-panel.tsx` and the rest as
files, and the page is 428 lines holding three — the route, the console that
owns the socket, and the stage that switches on the phase.

## What stays long, on purpose

| Shape | Why it stays |
|---|---|
| A page owning a socket and its state | That is its job. A `useX` hook moves the same lines behind a name |
| A phase switch whose branches delegate to a panel each | A file per branch to write `<RevealPanel />` is worse than the switch |
| A flat list of sibling controls with no nesting | Splitting means opening seven files to see one panel. Remove the *repetition* instead — `NumberChoice`, not seven components |
| A design-system wrapper | Its length is the prop documentation every prop carries |

## The React Compiler runs on Oxc, and Babel is gone

`apps/game/vite.config.ts` turns it on through the plugin itself —
`react({ compiler: { logDiagnostics: true } })` — with `oxc-transform-react`
installed beside it. There is no `@babel/core` in this repo any more, no
`@rolldown/plugin-babel`, no `babel-plugin-react-compiler` and no version
guard: every one of them existed to hold `@babel/core` on 7.x.

**What the pin was for.** Babel 8 took `AssignmentPattern` out of the `LVal`
alias group, and the compiler's `BuildHIR::lowerAssignment` keeps an object
pattern's property values behind `isLVal()` — so a destructured parameter with a
default, `({ isInvalid = false }) => …`, failed a test that the
`AssignmentPattern` case a few lines below would have handled. The bail is filed
under `Todo` and recorded without being printed, which is what made it silent:
one function out of 116, and the one it took was `TextField`, which every form
in the product renders. Three fixes are open upstream, none merged, and
`babel-plugin-react-compiler` has published no stable release since 1.0.0 in
October 2025. Oxc parses its own AST and never meets the bug.

**Measured before switching**, because *equivalent* is not a word to take on
trust. Built both ways back to back on the same tree: **every asset identical in
name and in size** — and a Vite asset name carries its content hash, so the JS
payload is byte-identical, 767 521 bytes over 27 chunks. The build went from
**21.3 s to 3.3 s**, on a machine loaded enough for the Babel run to take 21 s at
all; the plugin timings had put `@rolldown/plugin-babel transform` at 58% of it.

Vite still calls the Oxc integration experimental. What stands behind it here is
that byte comparison, which is the thing to re-run the day a chunk changes size
for a reason nobody can name.

### Seeing what bailed

`logDiagnostics: true` prints the recoverable diagnostics — the bails — through
Vite, and a fatal one fails the transform on its own. **It printed nothing** on
the switch-over build, where the Babel pipeline had stood at 114 successes
against two permanent `CompileError`s, both attributed to `round-audio.ts`
mutating a value the compiler would not let it. Those two are doubly worth
re-establishing rather than assumed: the emitted code is identical, so this is a
difference in what the two pipelines *report*; and the `useEffectEvent` pass
landing alongside this removed the very ref mutations they named.
