# Stage 03 — The player's round

**Goal.** The player's screen becomes worth holding: a countdown that matches
everyone else's, a buzzer that fires the instant a thumb lands, and honest
feedback about what just happened.

**Depends on** stage 01. Can run in parallel with 02.

## Work

**Countdown** (`features/player/round-countdown.tsx`). Driven by
`millisecondsUntil(clock, round.audioStartsAt, Date.now())`, not by a local
timer started when the message arrived. That difference is the whole point of
the clock handshake — a phone whose clock is four seconds fast must still count
to zero at the same instant as everyone else.

**The buzzer, live.** `onPressStart` is already wired, and it fires on pointer
down rather than release — worth keeping, and worth not regressing. What this
stage adds:

- **Optimistic local feedback.** The round trip is 20–80 ms, and a button that
  waits for the server to confirm feels broken. Show the pressed state
  immediately; reconcile when `room.updated` arrives.
- **`send` returns `false` when the socket is down.** Currently ignored. A buzz
  that vanished must say so — this is the one interaction where silence is
  unacceptable.
- **Haptics.** `navigator.vibrate(30)` on buzz where supported. Silently absent
  on iOS Safari; do not build anything on top of it.

**Losing the race.** Someone else buzzed: say who, immediately. The information
is already in `round.activeBuzz`.

**Lockout.** `findBuzzBlocker` already returns `you_already_missed`. Make it
feel like a consequence rather than a bug — the round is still running, they can
still hear it, they just cannot answer.

## Decisions left open

- **Is the buzz confirmed or optimistic?** Optimistic feels better and can lie
  for ~50 ms. Given that the server decides and the truth arrives immediately
  after, the lie is short and self-correcting — but agree on it explicitly.
- **Does the phone play audio too?** Twelve phones playing the same clip a few
  milliseconds apart is a mess. Almost certainly no: the host screen is the only
  speaker. Worth stating so nobody adds it later.

## Done when

- Countdowns on two devices with deliberately skewed clocks hit zero together
- The buzzer responds visually in under a frame of the press
- Two phones racing: the loser learns who won, and why they cannot buzz
- A buzz sent while the socket is down surfaces an error instead of vanishing
- The screen is usable one-handed, in the dark, without reading anything small
- Verified on a real phone over the LAN, not only in a resized desktop browser

## Out of scope

Typed answers, emoji reactions, chat, per-player audio.
