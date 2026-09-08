## Nobody knows how long the reveal has

Opened while giving the reveal hold a duration control instead of a switch — the
control landed, the two things it made visible did not. Neither is a bug report
from a room; both are what the new values expose.

### What changed under them

`host.autoAdvance` was a boolean writing one hard-coded `8_000`. It is a strip
now — 8 s, 15 s, 25 s, *you decide* — and `null` is still the default, which
means the shipped room still waits for the host and cannot be too short. The
numbers came from the bank: **1 407 of the 6 209 banked questions carry a
`note`, and every one of them is French** — four French rounds in five — at a
median of 122 characters and 20 words. Read aloud in a room that is talking,
that is about seven seconds for the note alone, before the answer, the payout
and the standings.

### One · The reveal has no clock, and 25 s of it is a different thing

`grep -rn "advancesAt"` still returns nothing. The deadline is a server-side
`setTimeout` in `armAutoAdvance` and reaches no screen, so a room reading a note
has no idea whether it has two seconds or twenty.

[The gap between two rounds](gap-between-two-rounds.md) declined this in August
and was right at the time: the ask then was to keep the *reveal* on the
countdown, and `advancesAt` would only have bought a clock on the reveal. The
argument does not survive the strip. At eight seconds nobody needed a clock
because nobody had time to wonder; at twenty-five, silence with no clock is a
table looking at each other asking whether the screen is stuck. **The host's
"next round" button is not the answer either** — it is on the console, and the
room reading the note is not.

What a session on this does: put `advancesAt` on the round view when the room is
on a timer, draw the same draining bar the round already has, and leave it
absent under `null` — a bar that never empties is worse than none, and it is
the same reasoning that keeps the clock off a round the host has frozen.

### Two · The hold is remembered per host, and the reading is per game

`autoAdvanceMs` is not in `GameSetup`, so it falls into `HostPreferences['room']`
and survives every game switch. A host who sets 25 s because the quiz has notes
gets 25 s on the reflex race, whose reveal is a reaction time and a name.

Three ways out, and the cheap one is not obviously wrong:

- **Move it into `GameSetup`.** Correct, and it widens the seam `movedToGame`
  turns on — a protocol shape, remembered per game like `mode` and `roundCount`.
- **Scale the hold to what is on the screen**, a floor plus an allowance when
  the round has a `note`. It is the honest model — the hold *is* reading time —
  and it is one arithmetic in `armAutoAdvance`. It also means the number the
  host picked is not the number they get, which no other duration in this
  product does.
- **Leave it.** The host who wants it long can set it long, and the games with
  nothing to read have shorter rounds anyway.

**The recommendation is the first**, and only after the clock exists: a hold
nobody can see the end of is the thing to fix before deciding how it is
remembered.
