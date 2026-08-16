## Who owns a room — **done, 15 August 2026**

The diagnosis, kept because it is what the shape answers: there was no ownership
token. `POST /api/rooms` returned only the code, so during any window where the
host's socket was down, anyone reading the code off the screen became the host —
and the real one came back to a fatal refusal with no recourse. **The takeover
was never the problem; the irreversibility was.**

Both halves were built, and the answer to "should a screen holding only the code
be able to take a room over?" is *yes, but never for good*:

- **A token decides who may.** `POST /api/rooms` mints one with the room and
  hands it to whoever opened it — eight characters from the room code's own
  alphabet, because it is read off one screen and typed on another. It travels
  in `hello` and nowhere else, and it **always wins**: the screen holding it
  takes the room back from whatever is connected, which is what makes a takeover
  undoable in both directions.
- **A grace window covers the Wi-Fi blinking.** `HOST_RECLAIM_GRACE_MS` is a
  minute, stamped on `hostLeftAt` when the room's last console goes, and a
  second screen arriving inside it is refused with `host_reconnecting` rather
  than handed the room. Past it, a room whose laptop is not coming back can
  still be picked up with the code alone — a party is not ended by a dead
  battery.
- **The token is read out of the host's own menu**, hidden behind a press
  because the console is often a television, and typed on the refusal screen the
  second console lands on. That is the whole of "the laptop died, we host from
  the TV", without the room ever seeing it.

What the browser pass corrected, and it is the reason the seam exists: the token
was first kept **on the host seat**, which `refusalVoidsSeat` drops — so being
displaced deleted the very token that was supposed to undo it. Two stores,
`taverla:seats` and `taverla:host-tokens`, because a seat and a room's own secret
do not die together.

