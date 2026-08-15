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

Five more that cost time to learn:

- **Two players in one room need a hand.** `taverla:seats` is a single
  `localStorage` array shared by every tab of the context, keyed by room *and
  role* — so a second `/play/:code` reclaims the first player's seat instead of
  taking one of its own. Delete that room's `role: 'player'` entry before the
  second join; the first player's socket is open and never re-reads it. It is
  what lets a latecomer be driven against a round somebody else is already in.

- **Two consoles in one room need the same hand, one store further.** A second
  tab shares `taverla:host-tokens` as well as `taverla:seats`, so it is already
  the room's owner and displaces nothing. Delete that room's `role: 'host'`
  **seat** and leave the token to drive the deliberate handover; delete both to
  drive a screen that only has the code. Deleting both and then driving the
  takeover is what makes the two tabs indistinguishable from one machine, which
  is exactly the case a browser cannot reproduce.

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

## A silent round looks exactly like one that plays

Nothing on the console distinguishes them: *À l'écoute…* renders unconditionally,
the clip's progress bar comes from the server's `roundElapsedMs`, buzzes work and
the reveal lands. So a screenshot is no evidence at all here, and neither is
watching it — the browser is muted.

What answers it is the console saying so itself: `isClipUnheard` puts *Le son ne
sort pas d'ici.* and a press on screen whenever no gesture has blessed an audio
element on this screen. **Reload the console mid-round and look for that block**;
its absence during a round the console opened is the other half of the check.

## What a pass covers

At 414 px and 1920 px:

- both locales, switched **live**, with an error already on screen;
- all three theme paths, including no `data-theme` attribute at all;
- that a locale or theme switch leaves the socket alone — it is not in the
  hook's dependencies, and a remount there ends a round.
