## Nobody knows how long the reveal has

> **Delivered.** Section One landed 8 September 2026, Section Two on the 9th.
> Kept for what the two sessions found; not a plan any more.

**What shipped, against what this entry expected.** The prescription held in
full — `advancesAt` on the round view, the round's own bar, absent under
`null` — and cost almost nothing to design, because the bar it names already
carried the doctrine: it drains from the fraction still standing, it re-keys on
every snapshot, and it is already absent while the host is away. What the entry
had not priced was four things underneath it:

- **Every path to a reveal broadcasts *before* it arms the timer**, at nine call
  sites. A deadline computed beside the `setTimeout` would have reached the room
  one frame after the reveal it belongs to, and the fix is not to reorder nine
  sites — a rule that lives in call-site ordering is a rule nobody enforces.
  `revealRound` is the single seam where the phase becomes `revealed`, so the
  hold is stamped *there* and `armAutoAdvance` obeys the stamp rather than the
  setting. That inversion pays for itself twice: re-arming now re-aims at the
  deadline the room is already watching, where reading the setting again handed
  it a fresh full wait — which every `host.updateSettings` during a reveal was
  quietly doing.
- **A frozen room needed the deadline taken off the wire**, or a phone drains a
  bar against a timer the server has cancelled. `holdRoundClock` clears it and
  `resumeRoundClock` re-stamps it, which is the mirror those two already were —
  `revealed` was simply an arm the resume half never had.
- **The hold restarts on resume rather than resuming**, and that is the one
  place this parts company with the round clock beside it. It is what the code
  already did; the reveal is reading time, and a room watching a console that
  had gone read none of it.
- **On the console the bar spends a row of a screen three formulas divide.**
  `--hold-bar` is what they subtract, `0px` when no bar is drawn. And it gives
  up the component's own 900px ceiling there — measured in the browser, where a
  900px bar under a 1 710px split stage read as an object stopping short of
  nothing rather than as the screen counting itself down.

`reveal-hold.test.ts` is the suite: the deadline reaching both views identically,
its absence under `null`, its removal while the host is away, the whole wait
given back on their return, and a mid-reveal change moving it.

---

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

### One · The reveal has no clock, and 25 s of it is a different thing — **done**

`grep -rn "advancesAt"` returned nothing when this was written. The deadline was
a server-side `setTimeout` in `armAutoAdvance` and reached no screen, so a room
reading a note had no idea whether it had two seconds or twenty.

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

### Two · The hold is remembered per host, and the reading is per game — **done**

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
remembered. The clock exists now, so this is takeable — and the room it was
argued from has moved, because a hold nobody could see was also a hold nobody
could notice was wrong on the game it carried over to.

**What it cost, 9 September 2026: one field on `GameSetup` and four documents.**
The seam was already load-bearing enough that the code barely moved —
`rememberSettings` destructures one more name, `HostPreferences['room']` is an
`Omit` and shed it without an edit, and the storage schema's `omit` was the one
place the fourth field had to be spelt twice. It cannot drift: the parsed blob
is returned as `HostPreferences`, so a schema that forgets the field fails to
compile.

**What the entry got wrong is that this was a choice between three.** The second
option — scaling the hold to what is on screen — is not an alternative to this
one; it is a thing that could still be built *on top* of it, and it would now be
scaling a number the host picked for this game rather than for the last one. The
third was never live once the clock existed.

**No game opens on a hold of its own**, and that is the deliberate half. The
temptation, once the field is per game, is a `Record<GameKind, number | null>`
beside `DEFAULT_ROUND_COUNT` — eight seconds for the reflex race, twenty-five
for the quiz. It is refused because `null` waits for the host and therefore
cannot be too short, which is the property the whole strip was given a `null`
default for. Being on the game's side of the line buys the memory; the default
stays the shell's until a room says otherwise.
