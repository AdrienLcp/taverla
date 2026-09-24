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

`hostToken` is the room's own secret, minted with the room and returned by
`POST /api/rooms` to whoever opened it — the one place it reaches a client, and
never on a room view. A host claim carrying it is granted whatever else is
connected, and the console that was there is sent a fatal
`host_already_connected` of its own: **the token is what makes a takeover
undoable**, in both directions. Without one, a second console is refused while a
socket is attached (`host_already_connected`) and for `HOST_RECLAIM_GRACE_MS`
after the last one dropped (`host_reconnecting`), which is the Wi-Fi blink and
the closing lid; past that window the code alone is enough, because a room
nobody can pick up is a party ended by a dead battery.

## Client → server

| Type | Sent by | Payload |
|---|---|---|
| `hello` | both | `protocolVersion`, `role`, `sessionId?`, `nickname?`, `hostToken?` |
| `time.ping` | both | `clientSentAt` |
| `player.leave` | any seat | — |
| `player.rename` | any seat | `nickname` |
| `player.buzz` | player | `roundId` |
| `player.answer` | player | `roundId`, `answer` — `{kind:'choice', choiceIndex}` or `{kind:'typed', guess}` |
| `lefake.submit` | player | `roundId`, `lie` |
| `lefake.vote` | player | `roundId`, `candidateId` |
| `slate.write` | player | `roundId`, `itemIndex`, `answer` — an upsert of one line; `''` clears it |
| `host.updateSettings` | host | `settings` |
| `host.startRound` | host | — |
| `host.judge` | host | `roundId`, `playerId`, `verdict` |
| `host.reveal` | host | `roundId` |
| `host.clearLockouts` | host | `roundId` |
| `host.addItem` | host | `roundId` |
| `host.setItemKey` | host | `roundId`, `itemIndex`, `key` — `''` clears it |
| `host.collectSheets` | host | `roundId` |
| `host.showItem` | host | `roundId`, `itemIndex` |
| `host.judgeGroup` | host | `roundId`, `itemIndex`, `groupKey`, `verdict` — `{kind:'single', isCorrect}` |
| `host.nextRound` | host | — |
| `host.endGame` | host | — |
| `host.playAgain` | host | — |
| `host.removePlayer` | host | `playerId` |
| `host.closeRoom` | host | — |

**The `player.` prefix names the seat, not the role.** `player.leave` and
`player.rename` are the two a console holding a seat sends as well, which is why
neither is in `HOST_ONLY_MESSAGE_TYPES` and why both guard on
`connection.playerId` rather than on `connection.role`.

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

**The slate's five host frames and its one player frame.** The sheet is one
round: `playing` is the writing, `host.collectSheets` turns it into
`correcting` with the wall on item 0, `host.showItem` moves the wall — back as
well as forward — and `host.reveal` ends the correction into `revealed`. A
`host.reveal` before the collection is refused with `wrong_phase`: collecting is
a decision of its own, never a reveal pressed early. Every index is 0-based.

`host.judgeGroup` is its own frame rather than `host.judge` taught an item index.
`host.judge` names one player on the floor and ends in a lockout, a resumed clip
or a reveal; this names every player who wrote the same thing on the item on the
wall, is paid or unpaid on the spot, and can be taken back. The two share the
`single` verdict shape and nothing else. `itemIndex` must be the item on the
wall (`stale_round` otherwise, the way a stale `roundId` is), and `groupKey` must
name a group of it (`invalid_message` otherwise) — a blank line is never a group,
which is the whole guard against validating one.

The slate stamps the round's roster **at collection**, not when the writing
opens: a sheet has no clock and no race, so a latecomer gets one. After the
collection the shell's `joinedAfterStart` applies unchanged. `slate.write` is not
a floor frame — it moves nothing along, so it is accepted while the console is
away.

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
  "phase": "playing",              // lobby | countdown | playing | buzzed | voting | correcting | revealed | finished
  "players": [{ "id": "…", "nickname": "Alice", "score": 2, "isConnected": true }],
  "settings": { "roundCount": 10,          // null → until the host ends it
                "countdownMs": 3000,
                "mode": { "kind": "typed" },   // buzzer arm adds answerWindowMs
                "game": { "kind": "blindtest", "roundDurationMs": 30000,
                          "difficulty": "wellKnown",
                          // chart | decade | playlist | search
                          "source": { "kind": "chart" } } },
  "round": {
    "id": "…",
    "index": 3,                    // 1-based
    "startsAt": 1786215012000,     // server clock; schedule against your offset
    "advancesAt": 1786215042000,   // reveal only; null → nothing is counting it down
    "activeBuzz": { "playerId": "…", "atServerTime": 1786215014311,
                    "expiresAt": 1786215024311 },  // null → the host decides
    "lockedOutPlayerIds": ["…"],   // answered wrong, out for this round
    "joinedAfterStart": false,     // you took your seat mid-round; in from the next
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
`advancesAt`,
the buzz, the lockout and the awards are every game's, and what the round is
*asking* belongs to the game asking it. A client that does not recognise a `kind` has no business
rendering that room at all, which is why the shape moving bumps the version.

`advancesAt` is read with `settings.autoAdvanceMs` beside it: the deadline says
*when*, the setting says how long the whole wait was, and a screen needs both to
draw how much of it is left. They are stamped together and go `null` together,
so one of them missing means nothing is counting this reveal down — the host
advances by hand, or their screen has gone and the server has the room frozen.
Neither case owes the room a bar, and a bar that never empties is worse than
none. A hold the host changes mid-reveal restarts from the change rather than
keeping the reveal's first deadline, because the number they just picked is the
wait they are expecting to watch.

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

**The slate splits its round between the two views on privacy, not on the
answer.** `round.content` carries `itemCount`, `currentItemIndex` (`null` while
the sheets are open) and `yourSheet` — the reader's own lines, one per item, each
`{ answer, verdict }`, and `null` for a reader with no seat. It is the only place
a player's answers travel to them, which is what a reload comes back to. The
host arm carries `progress` (`{ playerId, filledCount }` per seat), `keys` (the
host's memo per item, reaching no player frame ever) and `correction`, which is
`null` until the collection: **the host screen is the wall**, so it holds counts
and not one answer while the room writes. From `correcting` it holds the item on
the wall, grouped — `{ key, text, playerIds, isCorrect }` per group, blanks
listed apart as `blankPlayerIds`. A line's verdict is `null` until its group is
judged or the wall has moved past its item, which is when an answer nobody
validated becomes wrong.

`audioUrl` and `track` are separate because a host who has taken a seat keeps
the first and gets `null` for the second: that screen still has to play the
clip, and must not be handed the answer.

That is the whole of the seated host. One screen is the speaker and a player at
once — the seat is taken by putting a nickname on the host's `hello` — and the
moment it is taken, `toHostView` nulls the answer inside `currentContent`,
because a payload that screen could read in a console is not a guarantee. The
judge's copy and the speaker's copy were one field once, and conflating them is
what made "host and player" impossible. The residual leak is the catalogue id
inside the URL, which is why the seat is offered rather than assumed.

**There is no seat message, so the seat is only ever as durable as the name the
console replays.** A socket blink keeps it because the page never went; a tab
discarded on a screen lock is a *reload*, and a name held in component state
alone died with it. It is kept on `taverla:seats` beside that room's session id,
which is what makes the two survive together.

**A room the console has to judge is granted no seat**, and the settings frame
that moves the room to one takes back the seat it already granted — the picker
sits on the lobby stage, where a console may already be playing. `isJudgedByHost`
is the rule and it is the room's, not the form's: a console remembers the name it
was seated under and replays it on every reconnect, so a rule enforced only where
the control is drawn is a rule the next `hello` walks through. Buzzer mode is
what asks for a judge; the reflex race shares that mode and needs none, because
being first *is* being right there. The slate is the other way round: it is
`typed` — a sheet is typed — and still judged, because its host holds the key
and marks the sheets.

**A console's tab closing ends both of the things it was.** `onClose` asks two
questions, and the seated host is the one socket that answers both — whether the
room still has a screen, and whether that seat still has a socket. It used to
return after the first, so a console that had taken a seat left it lit on every
screen for the rest of the evening, and the sweeper never came for it either:
`disconnectedAt` was never stamped, which is the only thing it reads. The seat is
settled first on the way out, because holding the round for an absent host
cancels every timer releasing a buzz would arm.

`roundElapsedMs` is shared rather than the host's, because it is the room's
clock and not the speaker's: the host seeks the track back to it after a reload,
and every screen arms the round bar from it — a player whose screen locked
comes back to where the room is rather than to a full one. It says how long a
round has been open, which the console is already showing to everybody.

The player view adds instead:

```jsonc
{ "youId": "…" }
```

Both views carry `yourVerdict`: the halves *the reader* has banked this round,
and `null` before their first guess or when they hold no seat. Typed mode takes
as many guesses as the clip allows, so a player has to be told which half they
already hold. It is scoped to the reader — everyone else's progress stays secret
until the reveal, like `revealedAnswers`.

`round.joinedAfterStart` is scoped the same way, and is the round's answer to
"what is this one to **you**". A round stamps who it opened on when its clip
starts — the countdown is still *get ready*, so a player who lands inside it is
in the round — and waits for those players and nobody else before closing a
phase. A latecomer keeps its seat and plays from the next round; everything it
could send in this one is refused with `joined_mid_round`, which is the backstop
behind the screen rather than the mechanism. One stamp covers the whole round,
Le Fake's vote included: the people who may vote are the people who were there
for the writing.

`HostTrack` reaches the wire in exactly two places: the host view, and
`round.content.revealedTrack` once the round is over — and the reveal carries no
`previewUrl`.

This is enforced twice. `HostServerMessage` and `PlayerServerMessage` are
separate unions, so only host variants mention the host view; and player frames
are encoded with `encodeChecked`, which parses through the schema so Zod drops
unknown keys. The second layer exists because TypeScript's excess property check
does not fire on a value passed through a variable.

## The stimulus happens locally, and a floor is what pays for it

The fifth guarantee, and the first one the shelf grew rather than opened with.

Buzz order is stamped on arrival, which is what makes *who was first*
unforgeable. That measures **arrival**, and a game whose whole subject is
reaction needs arrival *minus the moment the stimulus happened*. Broadcasting
the stimulus gets that wrong in the one way that matters: every screen would
flip when the frame lands, so a player on a slow link reacts late by exactly
their latency and the race is won by the best Wi-Fi in the room.

So the moment travels **ahead of itself**. `round.content.flipsAt` is a server
timestamp on both views, and every device schedules against its own estimated
offset — the same mechanism the countdown already runs on, and the reason
`clock-sync.ts` exists. Latency drops out of the measurement entirely.

That hands a scripted client the moment in advance, and the answer is not to
hide it. Hiding buys nothing — the countdown gives it away — and costs the
mechanism. **A press arriving less than `FALSE_START_FLOOR_MS` after `flipsAt`
is a false start**: refused with `false_start`, and the player sits out the rest
of the round. Human simple reaction to a visual stimulus does not go below about
150 ms, so the floor costs an honest player nothing and makes scheduling a press
self-defeating — the scheduled press lands too early to be accepted, and only
jitter could save it.

One rule covers both halves of the problem, because a press that beat the flip
measures negative and a negative is under the floor. `packages/core/src/reflex/`
holds it, with no I/O and a test of its own; the next reflex-shaped game
inherits it rather than re-deciding it.

## Errors

```jsonc
{ "type": "error", "code": "nickname_taken",
  "message": "Someone already took that name", "fatal": false }
```

`fatal` decides whether the client stops reconnecting. A refusal the user can
act on is non-fatal, so the socket stays open and the form retries on it:
`nickname_taken`, `room_full`, `host_only_action`, `invalid_message`.

Fatal, followed by close code 1008: `room_not_found`,
`protocol_version_mismatch`, `host_already_connected`, `host_reconnecting`.

**A fatal frame ends the session on its own.** The client acts on the frame, not
on the socket closing after it, and the difference was invisible while every
fatal refusal came from `reject`, which sends and then closes. `host.closeRoom`
broke the tie: the server is answering a *third party*, so the error lands on
two dozen player sockets nobody is closing, and every screen sat on a stale
scoreboard — live and lying — while the room no longer existed. A fatal code may
therefore be sent to a socket the server keeps open, and that is not a loose end
to tidy up by closing it too. It is the guarantee the client owes.

`removed_by_host` is the same shape one scope down, and it was the whole of what
`host.removePlayer` was missing: the seat came off the roster and the screen was
told nothing, so it kept receiving `room.updated` with a `youId` no longer in
`players` and quietly fell back to *You* and `0` — a screen that had stopped
counting and did not say so. The frame goes to that player's connections only,
before the seat is taken, and their connection is unregistered on the way out so
the broadcast that follows never reaches them. It is one of the two refusals in
`refusalVoidsSeat` for a room that still answers: the code keeps resolving, and a
claim replayed on the next reload would be welcomed straight back in.

A console that took a seat is refused nothing when the host removes it from the
roster. It is losing the seat, not the room it is running, and there is no frame
that says that — the one above would be a lie its own screen would act on.

`host_already_connected` now travels both ways for the same reason: at the door
it is `reject`, and to a console displaced by a screen presenting the token it is
a bare frame on a socket that did nothing wrong. A `Connection` carries a `send`
and never its own socket, so closing somebody else's is not something the server
can do anyway.

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
