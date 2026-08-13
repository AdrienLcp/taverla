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

## Why `@babel/core` is pinned to 7.x

The React Compiler runs through `@rolldown/plugin-babel` in
`apps/game/vite.config.ts`, because plugin-react 6 moved to Oxc and no longer
runs Babel itself. The compiler cannot parse Babel 8's AST for a destructured
parameter with a default — `({ isPending = false }) => …`, which is most
components — and it bails **per function, silently**: the build stays green and
the component is simply not optimized.

Nothing surfaces it, so the pin is the only guard. A dependency bump that lifts
`@babel/core` to 8 costs the compiler on most of the app and reports nothing.
