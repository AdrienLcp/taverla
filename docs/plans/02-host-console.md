# Stage 02 — The host console

**Goal.** The screen that runs the evening: choose what to play, start a round,
hear the track begin exactly when the players' countdowns hit zero, see who
buzzed, and judge them in one gesture.

**Depends on** stage 01.

## Work

**Playlist picker** (`features/host/playlist-picker.tsx`). Three sources are
already in the contract: chart, a Deezer playlist id, a free-text search.
`searchTracks` in `taverla-api.ts` is wired and returns results without
preview URLs. Show what the pool will contain before the game starts — a blind
test with the wrong decade is a wasted evening.

**Synchronised playback** (`features/host/round-audio.ts`). The one genuinely
interesting piece:

```ts
const waitMs = millisecondsUntil(clock, round.audioStartsAt, Date.now())
```

Schedule against that, not against a raw `Date.now()` comparison. Two traps:

- **`setTimeout` is not accurate enough on its own.** Wake ~200 ms early, then
  spin on `requestAnimationFrame` until the target. Do not busy-wait the whole
  delay.
- **Autoplay is blocked until the user interacts.** The host presses "Start", so
  the gesture exists — but the `<audio>` element must be created and unlocked
  *within that press handler*, not later in an effect. Getting this wrong is
  silent: no error, no sound.

**Judging** (`features/host/verdict-panel.tsx`). When someone buzzes, the track
pauses and this is the whole screen: who buzzed, how fast, and two independent
toggles for title and artist. The host is reading a name off a screen while
someone shouts an answer at them — one glance, two presses, no scrolling.

**Round chrome.** Round 3 of 10, a timer that runs down, the scoreboard in the
periphery.

## Decisions left open

- **Where does the host screen physically sit?** It shows the answer, so it
  cannot face the room. Either say so in the UI, or add a "presenting" mode that
  hides the title until the reveal and shows it only in a corner panel.
- **Does the host need a keyboard path?** Judging with number keys is much
  faster than pressing, and this is the one surface where a shortcut earns its
  place. react-aria gives it for free through focus management.

## Done when

- A round plays audio that starts within ~100 ms of the players' countdown
  hitting zero, measured across two real devices rather than two tabs
- A buzz pauses the track immediately
- Judging takes two presses and the score moves on every screen at once
- The picker's chosen source is what actually plays
- A host reload mid-round resumes with the audio at the right offset, or states
  plainly that it cannot — silently restarting the clip is worse than either
- Verified in a browser, phone included

## Out of scope

Volume ducking, waveform display, replay, skipping a track.
