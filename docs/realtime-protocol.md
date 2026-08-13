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
| `player.answer` | player | `roundId`, `answer` — `{kind:'choice', choiceIndex}` or `{kind:'typed', guess}` |
| `host.updateSettings` | host | `settings` |
| `host.startRound` | host | — |
| `host.judge` | host | `roundId`, `playerId`, `verdict` |
| `host.reveal` | host | `roundId` |
| `host.clearLockouts` | host | `roundId` |
| `host.nextRound` | host | — |
| `host.endGame` | host | — |
| `host.playAgain` | host | — |
| `host.removePlayer` | host | `playerId` |

`player.buzz` carries **no timestamp**, and must never gain one. Ordering is
decided by arrival at the server; anything the client says about "when" is
clock-skewed and forgeable, and a blind test is decided by exactly that field.

The fairness this buys is bounded by network latency, which the clock handshake
measures but cannot remove. If that ever needs improving, the answer is
compensating with the *measured* round trip the server already knows — never
trusting a number the client sends.

`verdict` is discriminated on `kind`, because what the host judged depends on
the game: `{kind:'halves', titleCorrect, artistCorrect}` for the blind test's
two independent claims, `{kind:'single', isCorrect}` for everything else. The
server refuses a shape the current game is not judged in — halves over a bare
buzzer would pay two points for one charade.

`host.clearLockouts` puts everyone who missed back in, mid-round. A blind test
round is a clip that runs out, so a lockout there expires on its own; a game
whose question the room owns has no such clock.

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
  "settings": { "roundCount": 10,          // null → until the host ends it
                "countdownMs": 3000,
                "mode": { "kind": "typed" },   // buzzer arm adds answerWindowMs
                "game": { "kind": "blindtest", "roundDurationMs": 30000,
                          "difficulty": "wellKnown",
                          "source": { "kind": "chart" } } },
  "round": {
    "id": "…",
    "index": 3,                    // 1-based
    "startsAt": 1786215012000,     // server clock; schedule against your offset
    "activeBuzz": { "playerId": "…", "atServerTime": 1786215014311,
                    "expiresAt": 1786215024311 },  // null → the host decides
    "lockedOutPlayerIds": ["…"],   // answered wrong, out for this round
    "awards": [{ "playerId": "…", "points": 2, "verdict": { … } }],
    "content": { "kind": "blindtest", "choices": [],
                 "revealedTrack": null }  // filled at reveal, for everyone
  },
  "roundElapsedMs": 8200          // buzz pauses excluded
}
```

`settings.game`, `settings.mode` and `round.content` are all discriminated on
`kind`. The first and the last are where the split between the shelf and one
game on it is drawn: `roundCount`, `countdownMs`, `autoAdvanceMs`, `startsAt`,
the buzz, the lockout and the awards are every game's, and what the round is
*asking* belongs to the game asking it. A client that does not recognise a `kind` has no business
rendering that room at all, which is why the shape moving bumps the version.

The bare buzzer's `content` is `{ "kind": "buzzer" }` and nothing else — the
room owns the question, and the server never learns it. The arm exists rather
than the field going `null` because "no content" and "no round" are different
facts.

`settings.mode` is the room's second axis and is independent of the game: how a
round is answered is not what is being played. The game *narrows* which kinds
are on offer — the bare buzzer offers only `buzzer`, and the server refuses a
frame that sets a mode the current game does not serve — and each kind carries
its own settings, which is why `answerWindowMs` appears on the buzzer arm and
nowhere else. A mode where nobody buzzes has no floor to time.

The host view adds what only the host may see:

```jsonc
{
  "currentContent": { "kind": "blindtest",
                      "audioUrl": "https://cdnt-preview…",
                      "track": { "id": "…", "title": "…", "artist": "…",
                                 "coverUrl": "…", "previewUrl": "…" } },
  "remainingPoolSize": 7
}
```

`audioUrl` and `track` are separate because a host who has taken a seat keeps
the first and gets `null` for the second: that screen still has to play the
clip, and must not be handed the answer.

That is the whole of the seated host. One phone is the speaker and a player at
once — the seat is taken by putting a nickname on the host's `hello`, so it
rides the same socket and survives a reconnect — and the moment it is taken,
`toHostView` nulls the answer inside `currentContent`, because a payload that
screen could read in a console is not a guarantee. The judge's copy and the
speaker's copy were one field once, and conflating them is what made "host and
player" impossible. The residual leak is the catalogue id inside the URL, which
is why the seat is offered rather than assumed. Buzzer mode does not offer it at
all: that round needs someone reading the answer to judge it.

`roundElapsedMs` is shared rather than the host's, because it is the room's
clock and not the speaker's: the host seeks the track back to it after a reload,
and every screen arms the round bar from it — a phone that locked itself comes
back to where the room is rather than to a full one. It says how long a round
has been open, which the big screen is already showing to everybody.

The player view adds instead:

```jsonc
{ "youId": "…" }
```

Both views carry `yourVerdict`: the halves *the reader* has banked this round,
and `null` before their first guess or when they hold no seat. Typed mode takes
as many guesses as the clip allows, so a player has to be told which half they
already hold. It is scoped to the reader — everyone else's progress stays secret
until the reveal, like `revealedAnswers`.

`HostTrack` reaches the wire in exactly two places: the host view, and
`round.content.revealedTrack` once the round is over — and the reveal carries no
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

**A fatal frame ends the session on its own.** The client acts on the frame, not
on the socket closing after it, and the difference was invisible while every
fatal refusal came from `reject`, which sends and then closes. `host.closeRoom`
broke the tie: the server is answering a *third party*, so the error lands on
two dozen player sockets nobody is closing, and every phone sat on a stale
scoreboard — live and lying — while the room no longer existed. A fatal code may
therefore be sent to a socket the server keeps open, and that is not a loose end
to tidy up by closing it too. It is the guarantee the client owes.

**A code exists when something sends it.** `not_implemented` was the one
exception — a placeholder so a half-built stage could answer honestly instead of
borrowing a code that meant something else — and it outlived the last stage that
sent it by four games, as dead vocabulary carrying a translated string in both
locales. It is gone. The next thing that is not built yet does not get a code
for saying so; it gets finished, or it stays off the wire.

## Versioning

`PROTOCOL_VERSION` is sent in `hello` and echoed in `welcome`. A mismatch closes
the socket — both sides ship from this repository, so the only realistic cause
is a tab left open across a redeploy, and a stale tab desynchronising a live
game is worse than a reload.

Bump it only when an older peer could **mis-read** a frame. Adding a field or a
message an old client ignores does not qualify.
