# The realtime protocol

Defined in `packages/protocol`, spoken over `ws://…/ws/rooms/:code`. Every frame
is JSON, validated against a Zod schema on arrival, at both ends.

For the rules a contributor must follow, see
[`.claude/rules/realtime-protocol.md`](../.claude/rules/realtime-protocol.md).
This page is the format itself.

## Opening a socket

```
client ──▶  { "type": "time.ping", "clientSentAt": 1786215000123 }
server ──▶  { "type": "time.pong", "clientSentAt": 1786215000123,
              "serverTime": 1786215000160 }

client ──▶  { "type": "hello", "protocolVersion": 1, "role": "player",
              "sessionId": "3f2a…", "nickname": "Alice" }
server ──▶  { "type": "welcome", "protocolVersion": 1, "sessionId": "3f2a…",
              "serverTime": 1786215000171, "view": { … } }
```

`time.ping` is answered **before** `hello`, so a client can start estimating the
clock while the player is still typing their nickname.

`sessionId` is minted by the client and stored per room and role. Replaying it
reclaims the same seat and score — after a reload, a screen lock, or a lost
signal. It is also what makes React's StrictMode double-mount harmless: the
second socket is a reclaim, not a stranger.

`hello` must be the first non-ping frame. Anything else closes the socket.

## Client → server

| Type | Sent by | Payload |
|---|---|---|
| `hello` | both | `protocolVersion`, `role`, `sessionId?`, `nickname?` |
| `time.ping` | both | `clientSentAt` |
| `player.buzz` | player | `roundId` |
| `host.updateSettings` | host | `settings` |
| `host.startRound` | host | — |
| `host.judge` | host | `roundId`, `playerId`, `verdict` |
| `host.reveal` | host | `roundId` |
| `host.nextRound` | host | — |
| `host.endGame` | host | — |
| `host.removePlayer` | host | `playerId` |

`player.buzz` carries **no timestamp**, and must never gain one. Ordering is
decided by arrival at the server; anything the client says about "when" is
clock-skewed and forgeable.

Every `host.*` type is listed in `HOST_ONLY_MESSAGE_TYPES`, which the server
checks before dispatch. A test asserts the set matches the naming convention, so
a new host message cannot quietly become player-callable.

## Server → client

Four types, and two of them are role-scoped.

| Type | Payload |
|---|---|
| `welcome` | `protocolVersion`, `sessionId`, `serverTime`, `view` |
| `room.updated` | `view` |
| `time.pong` | `clientSentAt`, `serverTime` |
| `error` | `code`, `message`, `fatal` |

`room.updated` is the only broadcast: after any state change, every socket
receives its whole view. No deltas — a room is at most 24 players changing at
human speed, so a snapshot costs a few hundred bytes and removes every way for a
client to hold a partially-applied update.

### The two views

Shared by both:

```jsonc
{
  "code": "K3M9",
  "phase": "playing",              // lobby | countdown | playing | buzzed | revealed | finished
  "players": [{ "id": "…", "nickname": "Alice", "score": 2, "isConnected": true }],
  "settings": { "roundCount": 10, "countdownMs": 3000,
                "playbackDurationMs": 30000, "source": { "kind": "chart" } },
  "round": {
    "id": "…",
    "index": 3,                    // 1-based
    "audioStartsAt": 1786215012000,// server clock; schedule against your offset
    "activeBuzz": { "playerId": "…", "atServerTime": 1786215014311 },
    "lockedOutPlayerIds": ["…"],   // answered wrong, out for this round
    "awards": [{ "playerId": "…", "points": 2, "verdict": { … } }],
    "revealedTrack": null          // filled at reveal, for everyone
  }
}
```

The host view adds what only the host may see:

```jsonc
{
  "currentTrack": { "id": "…", "title": "…", "artist": "…",
                    "coverUrl": "…", "previewUrl": "https://cdnt-preview…" },
  "remainingPoolSize": 7
}
```

The player view adds instead:

```jsonc
{ "youId": "…" }
```

`HostTrack` reaches the wire in exactly two places: the host view, and
`round.revealedTrack` once the round is over — and the reveal carries no
`previewUrl`.

This is enforced twice. `HostServerMessage` and `PlayerServerMessage` are
separate unions, so only host variants mention the host view; and player frames
are encoded with `encodeChecked`, which parses through the schema so Zod drops
unknown keys. The second layer exists because TypeScript's excess property check
does not fire on a value passed through a variable.

## Errors

```jsonc
{ "type": "error", "code": "nickname_taken",
  "message": "Someone already took that name", "fatal": false }
```

`fatal` decides whether the client stops reconnecting. A refusal the user can
act on is non-fatal, so the socket stays open and the form retries on it:
`nickname_taken`, `room_full`, `host_only_action`, `invalid_message`.

Fatal, followed by close code 1008: `room_not_found`,
`protocol_version_mismatch`, `host_already_connected`.

`not_implemented` marks a message the contract describes but the server does not
serve yet. It should disappear as the stages in [`plans/`](plans/) land.

## Versioning

`PROTOCOL_VERSION` is sent in `hello` and echoed in `welcome`. A mismatch closes
the socket — both sides ship from this repository, so the only realistic cause
is a tab left open across a redeploy, and a stale tab desynchronising a live
game is worse than a reload.

Bump it only when an older peer could **mis-read** a frame. Adding a field or a
message an old client ignores does not qualify.
