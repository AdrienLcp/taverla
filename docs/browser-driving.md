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
- A `/play/:code` on a device with a stored `taverla:nickname` **joins on
  arrival** — there is no form to fill. Clear that key to drive the form, and
  expect a session id in `taverla:seats` either way: the socket now opens before
  the join is answered, so a refused arrival leaves one behind too.
- `taverla:theme` and `taverla:locale` hold **plain strings**, not JSON. Writing
  `'"light"'` stores a quoted string the reader rejects, and the page comes back
  on the system theme with nothing to say it refused.
- **A press that fires on `onPressStart` needs a real `pointerdown`.**
  `element.click()` drives an ordinary button fine and does nothing at all to a
  buzzer, a reflex tap or anything else react-aria arms on the press rather than
  the release. Dispatch `PointerEvent('pointerdown')` and `('pointerup')` with
  `pointerId`, `pointerType` and `isPrimary` set.

## Reaching a state that closes before a tool call returns

**Batch the whole timed sequence into one `browser_evaluate`.** A round trip is
a few hundred milliseconds and several states here are shorter than the tools
are: a reflex tap window is 3 s from the flip, the flip itself lands 2–6 s after
the countdown, and a 60 s clip reveals while a stepped-through check is still
walking. Poll inside the page, act inside the page, and return the reading.

Two states cannot be reached at all with a single seat in the room, because the
round settles the instant that seat acts and the screen is already the reveal
when the next call lands:

- a reflex heat after the console's own tap, or after its false start;
- anything a heat shows *while* waiting for somebody else.

Both need a second phone in the room, by the `taverla:seats` deletion above.

## Two things a browser can be asked that no test can

- **What the answer is, mid-round.** The console does not render a blind test's
  title or a quiz's answer while the clip runs, and the reveal comes too late to
  type against. Walk the host page's React fiber from
  `#root[__reactContainer…].current`, following `child` and `sibling`, for a
  `memoizedProps.view.round.content` — it carries the answer the screens are
  withholding.
- **What an autoplay refusal looks like.** Replace
  `HTMLMediaElement.prototype.play` with one returning a promise that rejects
  with a chosen `DOMException` name. That is how all three refusal messages on
  the console were verified without an Android phone in the room.

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
