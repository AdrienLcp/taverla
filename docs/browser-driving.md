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

More that cost time to learn:

- **A room fills up from one page, not from one browser context per player.**
  Nine seats in a single `browser_evaluate`: open nine `WebSocket`s to
  `ws://localhost:5273/ws/rooms/:code` from a page already on the app, and send
  each a `hello` carrying `role: 'player'`, its own `sessionId` and a
  **`nickname`**.

  The field is `nickname` and nothing else. `helloMessageSchema` is a plain
  `z.object`, so a frame spelling it `name` parses clean with the nickname
  simply absent, and the server answers a **non-fatal** `invalid_message` —
  *Choose a nickname to join* — on a socket that stays open at `readyState: 1`
  forever after. Nothing on the console says so, `__socks` reads healthy, and
  the roster is the only witness: eight seats asked for, one player listed. A
  raw socket has no `onmessage` unless you give it one, which is what makes the
  refusal invisible; attach one before the `hello` when a seat does not arrive. A raw socket reads neither `taverla:seats` nor `taverla:nickname` —
  those are the client's stores — so the two traps above simply do not apply and
  nine distinct names cost nine lines. Keep the sockets on `window`; the page
  owns them, and a navigation closes all nine at once and turns the roster
  *away*. It is what makes a nine-player final board or a full lobby reachable
  at all.

- **A buzz and the verdict that pays it are one call.** The floor closes after
  `answerWindowMs` and a tool round trip spends a good part of it, so a buzz sent
  in one call and judged in the next arrives at a round that has already locked
  that player out and gone back to `playing` — with a *Remettre la tablée en jeu*
  button as the only trace. Send the press and click the verdict inside one
  `browser_run_code_unsafe`. And **poll for `playing` inside the page before
  pressing**: a press during the countdown is refused, and the next call reads an
  untouched board with nothing on it to say why.

- **Two players in one room need a hand.** `taverla:seats` is a single
  `localStorage` array shared by every tab of the context, keyed by room *and
  role* — so a second `/play/:code` reclaims the first player's seat instead of
  taking one of its own. Delete that room's `role: 'player'` entry before the
  second join; the first player's socket is open and never re-reads it. It is
  what lets a latecomer be driven against a round somebody else is already in.

- **Two players with different *names* need a context each, and the seat trick
  is not enough.** `taverla:nickname` is one key per origin and the page writes
  back the name the room **accepted**, so a tab that joins overwrites whatever
  the next tab was seeded with: three tabs seeded `Alice`, `Bertrand`,
  `Anne-Charlotte` all arrive asking for the first accepted name, and the last
  two are refused with *Ce pseudo est déjà pris*. `browser.newContext()` per
  player gives each its own `localStorage` and needs no seat surgery at all —
  and the mute `addInitScript` goes on **every** context, not just the first.

- **`globalThis` does not survive between `browser_run_code_unsafe` calls**, so
  page handles cannot be stashed across them. Re-enumerate instead:
  `page.context().browser().contexts()`, then `c.pages()`, and pick the players
  off the **room code** — `p.url().includes('/play/ABCD')`, never `/play/`
  alone.

  The browser outlives the session that opened it, and every context ever
  created is still in that list: five of them, on three rooms that died with a
  server restart hours earlier, sat in front of the one this pass had just
  opened. `find` takes the first, so the reading came back from a page showing
  *Aucune table sous ce code* — which is exactly what a seat that failed to join
  looks like, and it cost a full launch-to-reveal cycle before the URL was
  printed and read.

- **A room dies whenever the dev server restarts, and a second session is
  enough to restart it.** Rooms live in one process, so an edit landing in
  `apps/server` — or in anything the server imports — takes every room on the
  machine with it, and a pass driving the browser reads that as a player who was
  refused rather than as a room that stopped existing. Two sessions in one
  working tree is the ordinary case here: check `git status` for files this pass
  did not touch before blaming the page, and reopen the room rather than
  debugging the seat.

- **A room can be opened without walking the front door.** `POST /api/rooms`
  from a page already on the app's origin answers `{ code, hostToken }`; write
  `taverla:host-tokens` with it — `[{ at: Date.now(), hostToken, roomCode }]` —
  and navigate to `/host/:code`. It saves three clicks and picks the game in the
  request body.

- **Screenshots and any other file the tool writes must land under the
  repository root** — `C:/git/taverla/.playwright-mcp/` is the one directory to
  use, and a path in the session scratchpad is refused outright.

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
- **The launch is disabled with an empty room**, so nothing that needs a round
  can be driven from the console alone. A second page at `/play/:code` is what
  unblocks it, and with `taverla:nickname` set it needs no interaction at all —
  open it, wait, and the roster has somebody on it.

- A `/play/:code` on a device with a stored `taverla:nickname` **joins on
  arrival** — there is no form to fill. The console's *Take a seat* does the
  same: it seats that screen under the stored name and draws no form at all, so
  a console that looks like it was never asked is already playing. Clear the key
  to reach either form, and expect a session id in `taverla:seats` either way:
  the socket now opens before the join is answered, so a refused arrival leaves
  one behind too.
- `taverla:theme` and `taverla:locale` hold **plain strings**, not JSON. Writing
  `'"light"'` stores a quoted string the reader rejects, and the page comes back
  on the system theme with nothing to say it refused.
- **A press that fires on `onPressStart` needs a real `pointerdown`.**
  `element.click()` drives an ordinary button fine and does nothing at all to a
  buzzer, a reflex press or anything else react-aria arms on the press rather
  than the release. Dispatch `PointerEvent('pointerdown')` and `('pointerup')`
  with `pointerId`, `pointerType` and `isPrimary` set.

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
  queried like any other page. It is the only way to see what a player sees for
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

## Sweeping a responsive control without resizing the window

Setting `element.style.width` on the element that carries `container-type:
inline-size` drives its container queries exactly as a resize would, and the
whole sweep fits in **one** `browser_evaluate` — where eighty `setViewportSize`
calls are eighty round trips. Walk up from the control to the nearest ancestor
whose computed `containerType` is `inline-size`, or use the control itself when
there is none; the playlist picker's two grids take their column count from the
picker rather than from themselves, and sweeping the strip would have moved
nothing.

Two things it cannot tell you on its own. **The widths a layout can actually
produce** are not every width — read them at a 320px viewport first, which is
the floor, or the sweep reports bands no screen reaches. And **a wrap point is
at least one segment wide**, sixty-odd pixels, so a 4px step is three times finer
than it needs to be; a 1px sweep buys nothing but seconds.

## Reaching a state that closes before a tool call returns

**Batch the whole timed sequence into one `browser_evaluate`.** A round trip is
a few hundred milliseconds and several states here are shorter than the tools
are: a reflex press window is 3 s from the flip, the flip itself lands 2–6 s
after the countdown, and a 60 s clip reveals while a stepped-through check is
still walking. Poll inside the page, act inside the page, and return the
reading.

**A press on the frame the field flips is a false start, every time.** Polling
`data-flipped` and dispatching `pointerdown` on the next line reproduces the
one refusal the game has, not the reaction it was meant to measure — the
server floors a press at `FALSE_START_FLOOR_MS` after `flipsAt`, which no hand
ever beats and a script always does. Wait past the floor before the press, and
read the player's screen straight after it: the heat has `PRESS_WINDOW_MS` left
at most, and less than that once the other seats are out.

Two states cannot be reached at all with a single seat in the room, because the
round settles the instant that seat acts and the screen is already the reveal
when the next call lands:

- a reflex heat after the console's own press, or after its false start;
- anything a heat shows *while* waiting for somebody else.

Both need a second screen in the room, by the `taverla:seats` deletion above.

## Measuring a face, not guessing at it

Several sizes here are `Kcqi` divided by a character count, and `K` is `100`
divided by how wide a character of that face actually is. Measure it off the
rendered node with a `Range` per character rather than a probe:

```ts
const range = document.createRange()
range.setStart(node, i); range.setEnd(node, i + 1)
widths.push(range.getBoundingClientRect().width / fontSize)
```

A hidden `<span>` carrying the computed `font` shorthand **under-reports**, and
silently: `monument` measured 0.743 that way against 0.898 from the range, and
the whole point of the constant is that it is right. The shorthand resets the
variable font's width axis, and re-applying `font-stretch` after it does not put
it back. `range.getClientRects().length` is the same tool answering how many
lines a wrap actually produced, which `height / lineHeight` rounds wrong.

**A `cloneNode` of the real element fails the same way, for a different
reason.** The rules that style it are descendant selectors —
`.reveal-panel .identity .title` — so a clone appended to `<body>` to be handed
a width of its own matches none of them, and comes back at 0.724 against the
same 0.898. It looks like the careful version of the measurement, which is what
makes it expensive. **Measure the rendered node itself**: write the sample into
its `textContent`, read the range, and restore `getAttribute('style')` after.

And **force one line while you do it**, with `white-space: nowrap` and
`overflow-wrap: normal` set inline. Summing the rects of a word that wrapped
does not give its unwrapped width back — `WONDERWALL` read 0.983 broken in two
and 0.927 whole, on one node at one size — so a sample taken in a column narrow
enough to break it describes a face that does not exist.

## Two things a browser can be asked that no test can

- **What the answer is, mid-round.** The console does not render a blind test's
  title or a quiz's answer while the clip runs, and the reveal comes too late to
  type against. Walk the host page's React fiber from
  `#root[__reactContainer…].current`, following `child` and `sibling`, for a
  `memoizedProps.view.round.content` — it carries the answer the screens are
  withholding.

  The round's own id is `memoizedProps.view.round.id` on the same walk, and it
  is `id` rather than `roundId`: the field is named for the object it is on, and
  only the *client* frames that reference a round spell it `roundId`. Guessing
  the second name finds nothing and reads exactly like a fiber walk that failed.
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

## A cue that cannot be heard can still be counted

A muted browser is the rule, so a synthesised sound has to be read rather than
listened to. **Patch the Web Audio prototypes in the init script** and the whole
of what a cue did comes back as data:

```ts
await page.addInitScript(() => {
  const w = globalThis
  w.__tones = []
  w.__ramps = []
  const start = OscillatorNode.prototype.start
  OscillatorNode.prototype.start = function (when) {
    w.__tones.push({ hz: this.frequency.value, type: this.type, when })
    return start.call(this, when)
  }
  const ramp = AudioParam.prototype.linearRampToValueAtTime
  AudioParam.prototype.linearRampToValueAtTime = function (value, when) {
    w.__ramps.push(value)
    return ramp.call(this, value, when)
  }
})
```

`start` rather than `createOscillator`: frequency and type are set *after* the
node exists, so a patch on the factory reports a bare oscillator every time. The
ramp is what proves the volume was honoured — `buzz-cue.ts` peaks at the
machine's volume times 0.3, so a console at 5% must report `0.015` and one at 0
must report nothing at all.

It answers three questions a screenshot cannot. **Whether a cue fired**, by the
tone count. **Whether it fired once**, which is the whole risk with a snapshot
the server re-delivers on every roster change: nudge the volume mid-buzz and
reload a player mid-buzz, then read the count again. And **whether silence is
real** — a game that must stay silent, like the reflex race, is proved by a
complete heat leaving the count where it was.

**A press that arms audio has to be trusted.** `AudioContext` is created inside
the gesture that opens a round, so `element.click()` from `evaluate` arms
nothing and every later cue is silent with no error. Drive it with Playwright's
own `click`, and check it took by patching `AudioContext.prototype.resume` the
same way — it reports `running` when the context was born inside a real gesture.

## A vibration nobody can feel can be counted the same way

Desktop Chromium answers `navigator.vibrate` and does nothing with it, so the
haptic half of a buzz is invisible on the machine a pass runs on. Replace it in
the init script and every pattern the page asked for comes back as data:

```ts
await page.addInitScript(() => {
  const w = globalThis
  w.__vibes = []
  Object.defineProperty(Navigator.prototype, 'vibrate', {
    configurable: true,
    writable: true,
    value: function (pattern) {
      w.__vibes.push(pattern)

      return true
    }
  })
})
```

The prototype rather than `navigator.vibrate = …`: the property is inherited, so
an own assignment works on Chromium and silently loses to a user agent that
defines it as a getter. What comes back is a readable sentence — `[30, 100]` is
a press that took the floor, `[30, [45, 65, 45]]` a press that lost it, and `[]`
a screen that was told nothing. **A screen that never pressed must read `[]`**,
and that assertion is the one the code cannot make about itself.

**Three seats, in three contexts.** A losing press only exists if both presses
land before either snapshot does, which no sequence of `click` calls can
guarantee at a 20–80 ms round trip: issue the two `evaluate`s through one
`Promise.all` and let the server decide who won. Whichever it picks, the other
is the one under test.

**Reset the log rather than reloading to clear it.** A reload re-runs the init
script *and* rejoins the room, so an outcome already on the wire is delivered to
a page whose de-duplication ref is empty and fires again — which is a real
behaviour, not a test artifact, and reads as a leak if it is mistaken for one.
`page.evaluate(() => { globalThis.__vibes = [] })` between rounds keeps the two
apart.

**A reflex heat ends on its last press**, so the loser's own reaction arrives in
the same snapshot as the reveal. Anything hanging off the buzzer they pressed is
unmounted by then and observes nothing — which is how the outcome was found to
belong on the page. Read the slow player, never only the fast one: the fast one
passes either way.

## Reaching Le Fake's vote board costs one launch and a wait

Nobody has to write anything. The lie window closes on its own and the round
goes to `voting` with zero submissions — the board draws the truth beside the
bank's own decoys, four rows of it, and the screen is fully formed. Three seats
were in the room and not one of them typed. So the vote screen is the cheapest
of Le Fake's phases to reach, not the most expensive, and the lie-writing
plumbing below is only needed when the *lies* are the subject.

**A raw socket's snapshot arrives on the join and on each change, and never on
request.** A listener attached after the launch sees nothing until the room next
moves, and a `time.ping` buys a pong rather than a fresh view — so a script that
needs the round's id off a socket has to arm the listener *before* the frame
that starts the round. Attaching afterwards and waiting reports an empty log,
which reads as a socket that was never seated rather than a room that simply did
not change.

## What a pass covers

At 414 px and 1920 px:

- both locales, switched **live**, with an error already on screen;
- all three theme paths, including no `data-theme` attribute at all;
- that a locale or theme switch leaves the socket alone — it is not in the
  hook's dependencies, and a remount there ends a round.
