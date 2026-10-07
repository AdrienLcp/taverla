---
description: The wire contract — role-scoped unions, anti-cheat strip, server-owned time
paths:
  - "packages/protocol/**"
  - "apps/server/src/**"
  - "apps/game/src/infrastructure/messaging/**"
---

# The realtime protocol

Everything that happens during a game is a WebSocket frame described in
`packages/protocol`. That package is the contract; the server and the app are
two implementations of it. Read this before touching either.

The format itself — every frame, both views, the error list — and the reasoning
behind each guarantee are in
[`../../docs/realtime-protocol.md`](../../docs/realtime-protocol.md).

## The five guarantees, and what enforces each

| Guarantee | Enforced by | Where |
|---|---|---|
| A player is never told the answer early | Role-scoped message unions, plus a schema strip on the way out | `server-message.ts`, `codec.ts` |
| Buzz order cannot be forged | The server stamps arrival time; `player.buzz` carries no timestamp | `client-message.ts`, `socket-handler.ts` |
| A client never holds half a state | One `room.updated` snapshot, never a delta | `outbound.ts` |
| Countdowns land together on every device | Server clock, estimated per device from a ping/pong handshake | `clock-sync.ts` |
| A reaction measures the press, not the Wi-Fi | The stimulus is a server timestamp every device schedules locally, defended by a floor rather than by hiding it | `core/reflex/reaction.ts` |

### The stimulus happens locally, and the floor is what pays for it

The fifth is the one the shelf grew rather than opened with, and the only one a
game had to be built to need. Stamping arrival makes *who was first*
unforgeable, but arrival is not reaction: reaction is arrival minus the moment
the screen changed. Broadcast that moment and the race is won by the best link
in the room, so `round.content.flipsAt` travels **in advance** and every device
flips against its own clock offset.

Handing it out is safe because of what sits under it, not because of secrecy: a
press less than `FALSE_START_FLOOR_MS` after `flipsAt` is refused as a
`false_start` and sits the player out. No human reaction is that fast, so an
honest press never meets it and a scheduled one always does. `docs/` holds the
argument in full — do not "fix" this by hiding `flipsAt`, which buys nothing and
costs the countdown its own mechanism.

### Role-scoped messages are the anti-cheat mechanism

`HostServerMessage`, `PlayerServerMessage` and `WallServerMessage` are separate
unions. Only the host variants mention `hostRoomViewSchema`, which is the one
place `HostTrack` — the title, the artist and the audio URL — reaches the wire
before a reveal. The wall, the room's own screen, gets the clip's URL and never
the answer, by the same means.

That is the type-level half. The runtime half is `encodeChecked`, which encodes
*through* the schema so Zod drops unknown keys; `codec.test.ts` fails when the
strip is removed. **Send every player frame with
`encodeChecked(playerServerMessageSchema, …)`**, never `JSON.stringify` or bare
`encodeMessage`.

### The verdict is the game's too

`verdictSchema` is discriminated on `kind`, for the same reason `round.content`
is: the blind test judges two independent claims, and everything else judges
one. `verdictKindFor` says which a game takes, and `applyVerdict` checks it
before scoring — a `halves` verdict over a bare buzzer would pay two points for
one charade, and a host socket is as forgeable as a player's. `yourVerdict` on
the room view is the `halves` arm alone: *banking* is what having two halves
means, and a game judged on one claim has no half to hold.

### The buzz carries no timestamp, deliberately

Ordering is decided by when the frame reaches the server.
`client-message.test.ts` asserts the shape so nobody adds one back for
"accuracy".

### Settings move mid-game; only the game waits

`host.updateSettings` is accepted in every phase, because a party is set up while
it runs — the countdown, the round count, the answer mode, the round duration,
the answer window and the difficulty all land on the round *after* the one on
screen. That is the point of the fold living in the host's footer rather than
inside the lobby.

The two a round is **built on** are stamped on it as it opens — `Round.mode` and
`Round.durationMs`, projected as `round.answerMode` and `round.durationMs` — and
every read that concerns the round in play goes through that copy: scoring
(`settleSimultaneousRound` picks its rate on the way out, so a typed round must
never be paid at a pick's rate), who may buzz or answer, when everyone is done,
the open phase's clock, and every screen drawing the round. **A screen drawing
the round reads `view.round`, never `view.settings`** for those two; the
settings are what the *next* round will be.

One cannot wait, and the server refuses it while `isRoundInPlay(room.phase)`:
`game.kind`, because `round.content` stays on the arm the screens are already
rendering and the game's other settings are read off `settings.game`.
`reshapesRound` in `@taverla/core/room/room-settings` is the rule and
`isRoundInPlay` in `room-phase.ts` the window — `revealed` is deliberately
outside it. The console greys the picker out, and that is a courtesy: **the
guard on the socket is the rule**.

`answerWindowMs` is the exception to the stamp: it is read from the room as a
buzz lands and stamped into the buzz as `expiresAt`, so moving it decides the
next *floor* rather than the next round (`floorWindowMs`). The seat rule follows
the stamp too: a seated host who switches to `buzzer` mid-round keeps playing
the round in front of them, and `unseatConsolesThatMustJudge` takes the seat as
the next round opens (`host-judging.ts`).

### One snapshot, not deltas

After any state change the server sends every socket its whole role-scoped view.
Do not add per-event messages for things that are state: "someone buzzed" is
`round.activeBuzz`, "the answer is out" is `round.content.revealedTrack`, "she
scored" is `round.awards`. A client that wants to animate a change diffs two
views.

### Time is the server's, estimated locally

`time.ping` / `time.pong` runs on every socket, including before `hello`, and
`estimateClockOffset` keeps the sample with the **shortest** round trip rather
than an average — a slow sample is one where a leg was congested, so averaging
drags the estimate toward the noise. Schedule against `millisecondsUntil`, never
against a raw `Date.now()` comparison with a server timestamp.

## Adding a message

1. Add the schema to `client-message.ts` or `server-message.ts`, and to the
   union(s) for the roles allowed to send or receive it. A host action is named
   `host.*`; `client-message.test.ts` fails if it is missing from
   `HOST_ONLY_MESSAGE_TYPES`.
2. Handle it in `socket-handler.ts`. The host-only guard runs before dispatch,
   but a socket is whatever its owner makes it — re-check anything that matters.
3. Prefer extending the room view over inventing a message. See above.
4. Bump `PROTOCOL_VERSION` only when an older peer could **mis-read** a frame.
   Adding a field or a message an old client ignores does not qualify.

## Errors are answers, not silence

Every rejection sends a `protocolErrorMessageSchema` frame with a code from
`error-code.ts`, and `fatal` decides whether the client stops reconnecting. A
refusal the user can act on — `nickname_taken`, `room_full` — is **non-fatal**,
so the socket stays open and the form can retry on it.

**A code exists when something sends it.** `not_implemented` was the placeholder
for work that was not built yet, and it outlived the last stage that sent it by
four games — dead vocabulary with a translated string in both locales. Do not
add its replacement.

**A fatal frame ends the session on its own**, without waiting for a close: the
client acts on the frame, because a fatal code may be sent to a socket the
server keeps open. `use-room-socket.ts` sets `refused` and closes the socket
itself the moment `fatal` arrives.

**An error outlives its moment**, so the client forgets it on a phase change.
The socket keeps its last error until it reconnects — a reflex race's
`false_start`, refused before the screen flipped, would still be on screen over
the reveal that followed. `useForgetErrorOnPhaseChange` clears it when
`view.phase` turns over, and both connection hooks call it.
