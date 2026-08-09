# Stage 01 — The round engine

**Goal.** The server runs a complete round: it draws a track, counts everyone
in, arms the buzzers, decides who was first, takes the host's verdict, and
reveals. After this stage the game is winnable over a raw WebSocket, with no UI
beyond what stage 00 already renders.

**Depends on** stage 00. **Blocks** everything else.

This is the biggest stage. Do it server-first and drive it from a script rather
than the browser — the UI arrives in 02 and 03.

## The state machine

```
lobby ──startRound──▶ countdown ──(audioStartsAt)──▶ playing
                                                       │
                                    ┌──────buzz─────────┘
                                    ▼
                                  buzzed ──judge(miss, others left)──▶ playing
                                    │  │
                     judge(scored)  │  └──judge(miss, nobody left)──┐
                                    ▼                               │
        playing ──(playbackDurationMs elapsed)──▶ revealed ◀────────┘
                                                    │
                              nextRound ────────────┤
                                                    ▼
                                     lobby(next) or finished
```

Three transitions are driven by time rather than a message, and each needs a
cancellable server-side timer: `countdown → playing`, the playback timeout, and
nothing else. **Cancel the playback timer on a buzz and restart it on a miss** —
a round that reveals itself while someone is answering is the bug this stage
will actually produce.

## Work

**`apps/server/src/domain/round/`** — new.

- `round-service.ts` — `startRound`, `registerBuzz`, `applyVerdict`, `reveal`,
  `advance`. Each returns a `Result` and mutates the room; none of them touch a
  socket.
- `round-timers.ts` — the cancellable timers, keyed by room code. One place, so
  a room that ends cancels everything it owns.
- `track-pool.ts` — fill the pool from `settings.source`, draw without repeats,
  and resolve the preview when the round starts (`fetchHostTrack`) rather than
  when the pool is built. Expired signatures are the failure mode here.

**`packages/core/src/round/`** — the decisions worth testing in isolation:

- who may buzz (server-side twin of `findBuzzBlocker`)
- whether a miss ends the round — "everyone is locked out or has scored"
- what a verdict awards (`pointsFor` already exists)

**`socket-handler.ts`** — replace the `not_implemented` branch with a dispatch,
and broadcast after every mutation.

## Protocol

Mostly already there — `roundViewSchema`, `verdictSchema`, `awardSchema` and the
host actions were designed for this. Expect to need:

- `no_tracks_available` when the pool runs dry mid-game
- possibly `RoomSettings.source` validation against what Deezer actually returns

If a change is bigger than a field, stop and reconsider: the contract was built
for this stage, so a large gap probably means the state machine drifted.

## Decisions taken

- **A wrong answer resumes the track.** The plan called this "much harder"
  because it assumed every device plays audio. Only the host screen has a
  speaker, so resuming is one `play()` call — the cost was in the server knowing
  how much clip is left, which is what `playedMs` / `playingSince` are for. The
  miss locks that player out, records a zero-point award, and the clip carries
  on for everyone else.
- **Nobody buzzes** → the clip runs its full `playbackDurationMs`, then reveals
  with no award. Kept at 30 s; it is a setting, so the tests can move it.
- **The host sees the answer only when it is useful.** `currentTrack` is on the
  host view throughout, but stage 02 renders it in the judging panel and at the
  reveal, and nowhere else — so the screen can face the room except during the
  few seconds of a verdict. Cheaper and better than a warning label.

## Done

All of it, in `apps/server/src/__tests__/round-flow.test.ts` — six tests driving
real sockets against the app on an ephemeral port, with the Deezer adapter
mocked at its two exported functions:

- a full three-round game from the lobby to the final scores
- two thumbs landing together produce exactly one `activeBuzz`, and the loser
  gets `already_buzzed`
- a miss locks that player out for the round only, the clip resumes, and the
  lockout is gone on `nextRound`
- a miss by the last eligible player reveals immediately rather than waiting out
  the clip
- a host who reloads mid-round finds the same round still playing
- **no player frame carries the title, artist or preview URL before the
  reveal**, asserted over every frame both phones received

That last one is the test to keep honest. The first version of it filtered the
transcript *by the field it was testing*, so a mutation that leaked the track
into every frame also removed every frame from the check — and it passed. It now
cuts the window by arrival order, and the mutation turns it red.

Verified in a browser as well, against the real catalogue: lobby → countdown →
playing, a buzz that registers and explains itself on the phone, and a clip
running out to a reveal with cover art.

## Out of scope

Audio playback, any UI, persistence, spectators.
