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

## Decisions left open

- **Does a wrong answer resume the track, or reveal it?** Resuming is more fun
  and much harder — the audio has to restart mid-clip on every device, from a
  server-supplied offset. Consider shipping "reveal on first miss" and taking
  resume in a later stage.
- **What happens when nobody buzzes?** Timeout → reveal, nobody scores. Confirm
  `playbackDurationMs` should be the full 30 s.
- **Does the host see the answer before the reveal?** They must, to judge. So
  the host screen has to be face-away from the room — a real product constraint
  worth stating in the UI at stage 02.

## Done when

- A script drives a full 3-round game over two sockets: countdown, buzz, judge,
  reveal, next, final scores — with assertions, kept as
  `apps/server/src/__tests__/round-flow.test.ts`
- Two players buzzing within the same millisecond produce exactly one
  `activeBuzz`, and the loser is told why
- A miss locks the player out for that round only, and the lockout clears on
  `nextRound`
- No player frame ever contains a title, artist or preview URL before the
  reveal — assert it over the whole recorded transcript, not one frame
- A host who reloads mid-round finds the round still running
- `pnpm validate` green

## Out of scope

Audio playback, any UI, persistence, spectators.
