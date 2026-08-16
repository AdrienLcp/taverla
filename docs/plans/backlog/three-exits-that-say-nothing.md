## 2 · Three exits that say nothing — **done, 15 August 2026**

> *Playtest 13 — "« l'hôte a fermé le salon » ⇒ ok. Mais quand on est exclu, on
> n'a pas de message ?"*

He is right, and it is worse than a missing string.

**What shipped**, against what this entry expected:

- `removed_by_host` rather than `kicked`, because the code is read at a call site
  and in two dictionaries and the shorter name says neither who nor what from.
  The frame goes to that player's connections only, and the connection is
  **unregistered on the way out** — this entry stopped at the frame, and a
  socket left in the registry is handed one more view of the room it is out of.
- A console that took a seat is removed from the roster **in silence**, which
  this entry did not foresee: the lobby's ✕ sits beside the host's own seat too,
  and a fatal frame there would take the room's only screen down over a seat.
- The seated host's `onClose` is the seat *before* the room, not after. Holding
  the round for an absent host cancels every timer that releasing their buzz
  would have armed, so the other order re-arms a clip on a room with no screen.
- The credits page took the way home this entry asked for, and the string behind
  it moved: `notFound.back` was already borrowed by `ConnectionRefused`, so a
  third screen made the prefix a lie. It is `navigation.back` now, one key for
  one destination.
- Two faults the browser pass found in the menu itself, both shipped by the
  ownership session and neither in this entry: `Afficher le code de reprise` ran
  eleven pixels past its own block in French — the popover is a fixed 320px box
  and `_control.sass` refuses a line break on every control — and the build line
  pulled up under the exits the moment the credit above it went away. Both fixed
  here, so **session 5 does not need to rediscover the menu's half of playtest 6**.

The one thing left standing was `host.removePlayer` aimed at the console's *own*
seat. **Closed on 15 August 2026, and it was twice the bug this paragraph
described**: the local `seatNickname` was the visible half, and underneath it
`evict` never cleared `connection.playerId` the way `depart` does — so
`toHostView` went on reading a seat the roster no longer held, and the console
was served every round with the answer withheld. A judge with nothing to judge
with, silently, for the rest of the game.

- **The seat comes off the connection wherever the roster loses it**, not only
  on the exit that screen chose. `forgetSeat` is in the connection registry and
  `unseat` calls it, which covers both `depart` and `evict`; the seat sweeper
  calls it too, and `depart`'s hand-rolled copy is gone. One rule, one place.
- **The console reads the room, not its own memory.** `isSeated` and the seat
  control's name both come off `view.youId` and the roster now, so the two props
  that carried the local mirror downward are gone.
- **Removing yourself goes out as `player.leave`.** Deriving the display alone
  would have left the nickname on the socket, and the next reconnect re-seats on
  it — so an eviction aimed at your own row would not have survived a Wi-Fi
  blink.
- The browser pass is what confirmed the far end: the seat control comes back,
  the menu drops its *leave* exit with the seat, and the round after it puts the
  question on the console. Evicting somebody else still lands them on the
  refusal screen.

**A kicked player is never told, and their socket stays open.** `evict()` is two
lines — `removePlayer` then `releaseBuzz` (`socket-handler.ts:754-757`) — with no
error frame, no `fatal`, no close. The connection is never unregistered, so the
phone keeps receiving `room.updated` with a `youId` that is no longer in
`players`; `Scoreline` falls back to *Toi* and `0`, `status` never turns
`refused`, `ConnectionRefused` never mounts. The screen stays alive and stops
counting. There is no `kicked` code in `error-code.ts` at all — the only fatal
the server sends is `room_closed` from `disband()`.

The fix is small and has one trap: send `kicked` **fatal**, to that player's
connection only, *before* `removePlayer`, and make sure `refusalVoidsSeat`
(`packages/core/src/room/session-memory.ts:51-57`) forgets the seat — otherwise a
reload walks straight back in.

**And two more exits in the same family**, carried over from the previous
handoff:

- **A host who took a seat is never marked disconnected.** `onClose` returns
  before `markPlayerDisconnected`, so that seat is `isConnected` forever and the
  sweeper never touches it.
- **Leaving a room by any in-app navigation is unannounced.** The credits link in
  `AppMenu` is the only one that does it today, and it is on every screen at
  every phase: navigating there unmounts the room page, whose socket cleanup
  closes with `disposed = true`. The server cannot tell that from a closed tab —
  a host freezes the round indefinitely with every phone on `buzz.blocked.host_away`
  and no timer running, and their own screen says nothing.

That last one is why the credits page belongs in this session rather than in a
design one: **the page needs a back link** (`credits-page.tsx` has three external
links and no way home, where `not-found-page.tsx:18-20` does the right thing
beside it), and reaching it from a room needs to stop freezing the game. The
shape was already decided — credits are a front-door concern, the menu entry
renders only when `RoomExitsProvider` reports no room exits, and the route stays
for a shared URL.

### How to tell it is done

- The host removes a player: that phone lands on `ConnectionRefused` with its own
  string, in both locales, and a reload does not get the seat back.
- A host who is also playing closes their tab: the seat goes away and is swept.
- The credits page has a way back, and cannot be reached from inside a room.

---

