# The realtime protocol

Everything that happens during a game is a WebSocket frame described in
`packages/protocol`. That package is the contract; the server and the app are
two implementations of it. Read this before touching either.

## The four guarantees, and what enforces each

| Guarantee | Enforced by | Where |
|---|---|---|
| A player is never told the answer early | Role-scoped message unions, plus a schema strip on the way out | `server-message.ts`, `codec.ts` |
| Buzz order cannot be forged | The server stamps arrival time; `player.buzz` carries no timestamp | `client-message.ts`, `socket-handler.ts` |
| A client never holds half a state | One `room.updated` snapshot, never a delta | `outbound.ts` |
| Countdowns land together on every device | Server clock, estimated per device from a ping/pong handshake | `clock-sync.ts` |

### Role-scoped messages are the anti-cheat mechanism

`HostServerMessage` and `PlayerServerMessage` are separate unions. Only the host
variants mention `hostRoomViewSchema`, which is the one place `HostTrack` — the
title, the artist and the audio URL — reaches the wire before a reveal.

That is the type-level half. The runtime half is `encodeChecked`, which encodes
*through* the schema so Zod drops unknown keys. It exists because TypeScript's
excess property check does not fire on a value passed through a variable: a host
view assigned into a player-shaped position type-checks. `codec.test.ts` covers
it, and the test fails when the strip is removed.

**Never send a player frame with `JSON.stringify` or bare `encodeMessage`.** Use
`encodeChecked(playerServerMessageSchema, …)`.

### A host who plays is told less, and by the server

One phone can be the speaker and a player at once — the seat is taken by putting
a nickname on the host's `hello`, so it rides the same socket and survives a
reconnect. The moment it is taken, `toHostView` nulls the answer inside
`currentContent` — `track` for the blind test — because that screen is a
player's now, and a payload it could read in a console is not a guarantee.

What it keeps is `audioUrl`, because the speaker still has to play the clip.
Those two fields exist separately for exactly this — the judge's copy and the
speaker's copy were one field, and conflating them is what made "host and
player" impossible. The residual leak is the catalogue id inside the URL, and
it is the reason the seat is offered rather than assumed.

Buzzer mode does not offer it: that round needs someone reading the answer to
judge it.

### The buzz carries no timestamp, deliberately

Ordering is decided by when the frame reaches the server. A client-supplied
"when" is both clock-skewed and trivially edited in a console, and a blind test
is decided by exactly that field. `client-message.test.ts` asserts the shape so
nobody adds one back for "accuracy".

The fairness this buys is bounded by network latency, which the clock handshake
measures but cannot remove. If that ever needs improving, the answer is
compensating with the *measured* round trip the server already knows, never
trusting a number the client sends.

### One snapshot, not deltas

After any state change the server sends every socket its whole role-scoped view.
A room holds at most `MAX_PLAYERS_PER_ROOM` players and changes at human speed,
so the snapshot is a few hundred bytes — and it removes every way for a client
to sit on a partially-applied delta after a dropped frame or a reconnect.

Do not add per-event messages for things that are state. "Someone buzzed" is
`round.activeBuzz`; "the answer is out" is `round.content.revealedTrack`; "she scored"
is `round.awards`. A client that wants to animate a change diffs two views.

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

`not_implemented` exists so a stage that is not built yet answers honestly
instead of borrowing a code that means something else. It should shrink to
nothing as the stages in `docs/plans/` land.

## Related

- `docs/realtime-protocol.md` — the wire format itself, with examples
- `abstraction-boundaries.md` — the socket lives in `infrastructure/messaging`
