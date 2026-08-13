# Driving the app in a browser

`CLAUDE.md` carries the imperative — a change to what a user sees is verified by
driving the real app, muted. This page is how.

## Muted, before the first navigation

The host console plays music, `taverla:volume` defaults to 80%, and it survives
in `localStorage` — so a page that merely *reaches* a round makes noise on
whatever machine is running the dev server, which is somebody's flat. Write the
value before the page loads; dragging the slider afterwards is a fix arriving
after the clip.

```ts
await context.addInitScript(() => {
  localStorage.setItem('taverla:volume', '0')
})
```

Raise it to 5% at most, and only when the audio itself is what is being tested —
the countdown landing on the first note, a buzz pausing the clip, a reload
seeking back into a round. Say so in the reply when you do.

## The MCP Playwright tool has no `addInitScript`

Reach the muted state by loading the home page first — it can play nothing —
writing `taverla:volume` there, and navigating afterwards. An init script that
*clears* storage on the way is worse than none: it wipes the key under test on
every real navigation and on every second tab of the same context.

Four more that cost time to learn:

- A react-aria segment does not take a click on its `<input>`; the `<label>`
  intercepts the pointer. Click `label.segment`, and scope the query — the
  console carries two `English` at once, the menu's and the fold's.
- The menu's popover intercepts clicks meant for its own buttons. `Escape`
  first.
- Playwright MCP writes its screenshots and `.playwright-mcp/` at the
  **repository root**. Delete them before committing.
- A `/play/:code` opens no socket before the join, so nothing lands in
  `taverla:seats` until the nickname is accepted.

## A microtask hides a phase a timer catches

`Loader` mounts its live region empty and fills it 250 ms later. A
`MutationObserver` cannot prove that empty phase: its callback is a microtask,
so it sees the filled node and reports the region was never empty. Read the DOM
on a timer instead.

## What a pass covers

At 414 px and 1920 px:

- both locales, switched **live**, with an error already on screen;
- all three theme paths, including no `data-theme` attribute at all;
- that a locale or theme switch leaves the socket alone — it is not in the
  hook's dependencies, and a remount there ends a round.
