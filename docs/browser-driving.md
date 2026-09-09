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

## `addInitScript` is reachable, through one door

`browser_run_code_unsafe` is handed the `page` itself, so the whole Playwright
API is there — `page.addInitScript`, `page.route`, and
`page.context().newCDPSession(page)`. This page used to say the tool had no init
script at all, which cost a stage's worth of navigating to the home page first.

```ts
await page.addInitScript(() => {
  localStorage.setItem('taverla:volume', '0')
})
```

Where only the ordinary MCP tools are loaded there is no init script, and the
muted state is reached by loading the home page first — it can play nothing —
writing `taverla:volume` there, and navigating afterwards. An init script that
*clears* storage on the way is worse than none either way: it wipes the key
under test on every real navigation and on every second tab of the same context.

Twelve more that cost time to learn:

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

- **One invalid entry costs the device the whole store.** `taverla:seats` and
  `taverla:host-tokens` are re-parsed as a single Zod array, and a failure
  returns `[]` rather than the entries that were fine — so a hand-written token
  containing `O`, `S`, `I` or `Z` (the room alphabet excludes all four) silently
  deletes every *real* token from the reading, and the screen under test draws
  as though the device had never played. Nothing warns, and the store on disk is
  untouched, which is what makes it read as a bug in the page. Seed with values
  that would pass the schema, or seed nothing.

- **An init script runs before `document.documentElement` exists**, so a
  `MutationObserver` pointed at it throws and observes nothing. The trap is that
  an observer which was never installed reports the same empty log as a page
  where nothing happened, so it reads as proof. Observe `document`, which is
  there.

- **The first paint is the page with its bundles aborted.**
  `page.route('**/assets/*.js', (route) => route.abort())` leaves exactly what
  the served document can draw on its own, and it can be screenshotted and
  queried like any other page. It is the only way to see what a phone sees for
  the first second, and `typeof window.React === 'undefined'` is how the shot
  proves it ran no script.

- **Throttling goes through CDP, and `page.route` cannot stand in for it.**
  `Network.emulateNetworkConditions`, `Network.setCacheDisabled` and
  `Emulation.setCPUThrottlingRate` on a session from
  `page.context().newCDPSession(page)`, applied **before** the navigation. Check
  it took: `performance.getEntriesByType('paint')` reporting a first paint under
  100 ms means the conditions were not applied, or the assets came from cache.

- **A background tab is not a hidden document.** Selecting another tab with
  `browser_tabs` leaves the first page reporting `visibilityState: 'visible'`,
  so nothing that depends on the document going away can be driven that way —
  a wake lock the browser would have released stays held, and the return path
  never runs. Reach that branch by hand instead: drop whatever the user agent
  would have dropped, then `document.dispatchEvent(new Event('visibilitychange'))`.

## Reaching a state that closes before a tool call returns

**Batch the whole timed sequence into one `browser_evaluate`.** A round trip is
a few hundred milliseconds and several states here are shorter than the tools
are: a reflex tap window is 3 s from the flip, the flip itself lands 2–6 s after
the countdown, and a 60 s clip reveals while a stepped-through check is still
walking. Poll inside the page, act inside the page, and return the reading.

**A tap on the frame the field flips is a false start, every time.** Polling
`data-flipped` and dispatching `pointerdown` on the next line reproduces the
one refusal the game has, not the reaction it was meant to measure — the
server floors a tap at `FALSE_START_FLOOR_MS` after `flipsAt`, which no thumb
ever beats and a script always does. Wait past the floor before the press, and
read the phone straight after it: the heat has `TAP_WINDOW_MS` left at most,
and less than that once the other seats are out.

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
