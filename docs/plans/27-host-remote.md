# Stage 27 — The wall

**Done.** Both sessions landed in one sitting; read *What the build disagreed
with* at the end first.

Asked while trying the slate: run the room from **my phone**, and let the
computer's screen show only what the room should see.

## The reframe

The first draft of this stage split the host into a wall and a *remote*, both
holding the token. Adrien turned it around while it was being planned: **the host
can already be a phone.** Nothing about the console assumes a big screen, so
there is no remote to invent. What is missing is the other half — a **wall**: a
screen the room reads beside the one in each hand, which shows the game and holds
no secret and no control.

So the console stays exactly what it is, wherever it runs, and the stage adds one
surface.

## Decisions taken

- **A third role, `wall`, not a flag on the host.** Every `role === 'host'`
  check in the server then means what it should without being touched: a wall is
  not a presence (`isHostConnected`), cannot send a `host.*` frame
  (`HOST_ONLY_MESSAGE_TYPES`), is never displaced by a token claim and never
  displaces one, holds no seat, and its closing freezes nothing. It gets its own
  message union and its own view, `WallRoomView`, encoded through its own schema
  — the catalogue's rule that role-scoped unions are never diluted, applied to a
  third role rather than bent for it.
- **The wall's view is a player's without a seat, plus what only a wall shows**:
  the blind test's `audioUrl` (the wall is the speaker) and the slate's grouped
  correction and progress counts. No `track`, no `question`, no slate `keys`, no
  `remainingPoolSize`. `encodeChecked` through the wall schema strips anything a
  projection gets wrong.
- **A wall needs the host token.** It carries the audio URL, which names the
  catalogue id, so it cannot be something any player opens with the room code.
  A hello with `role: 'wall'` and no matching token is refused with a fatal
  `wall_not_paired`.
- **The token reaches the wall by pairing, and the host's device does the
  confirming.** A screen that opens `/wall` shows a short pairing code and a QR
  code. The host scans it (or types the code in the menu); the host's device
  posts the code with its own room code and token; the waiting screen, polling,
  receives them once. The QR is on a screen the whole room sees, and that is
  fine: a player scanning it holds no token, so it pairs nothing. Adrien's first
  pick was a one-use QR shown by the host — it does not survive the case that
  motivates the stage, because a laptop plugged into a TV cannot scan anything.
- **Same browser, no pairing.** The menu's *Project* link opens `/wall/:code` in
  a new tab; the token is already in `taverla:host-tokens`.
- **The wall is the speaker whenever it is there.** `isWallConnected` on the
  host view tells the console to keep the clip and the buzz cue to itself. The
  wall arms its audio on its own press — the pairing confirmation or a one-time
  *enable sound* prompt — because no *Start* is ever pressed on it.
- **When the host goes, the wall waits and offers the room back.** Asked of
  Adrien: both. The room freezes exactly as today (the wall is not a presence).
  The wall says the host is gone and offers *take over here*, which reopens it
  as a console under the token, **with the answers folded behind a tap** because
  that console is still in front of everyone. When the host's device comes back
  its token claim displaces that console, and a console that came from a wall
  goes back to being one instead of showing a refusal.
- **One wall or several.** Nothing limits the count; every one is a speaker.
  Two walls in one room is a real case (two rooms of a flat), and the only cost
  is the one stage 10 measured — a flange if they share a room.

## Protocol

- `connectionRoles` gains `wall`; `PROTOCOL_VERSION` 21 → 22.
- `WallRoomView`, `WallRoundContent`, `wallServerMessageSchema`.
- `isWallConnected` on the host view.
- Error code `wall_not_paired` (fatal).
- HTTP: `POST /api/walls` → `{ pairingCode, secret }`;
  `GET /api/walls/:pairingCode?secret=` → `waiting | paired { roomCode, hostToken }`,
  consumed on read; `POST /api/walls/:pairingCode/pair { roomCode, hostToken }`.
  A pairing lives ten minutes.

## Size

Two sessions, split like the slate.

- **A — served.** Protocol, the wall projection, pairing routes, the registry and
  handler changes, socket tests: a wall reads no answer in any game, is refused
  without the token, sends no host frame, freezes nothing when it closes and
  unfreezes nothing when it opens, is not displaced by a console claim.
- **B — drawn.** `/wall` pairing screen, `/wall/:code` display, `/pair/:code`
  confirmation, the menu section, audio on the wall, take-over-with-answers-folded,
  both dictionaries, the muted browser pass with a console and a wall in two
  browser contexts.

## Out of scope

- A seat on the wall. It is the room's screen, not a player's.
- Co-hosts: two consoles with controls remain the token's takeover, as today.

## Done when

- A room opened on a phone-sized console is paired to a second context through
  `/wall`, and the wall shows the lobby's QR, then each game's round without its
  answer, while the console still reads the answer.
- The blind-test clip plays on the wall and not on the console.
- Closing the console freezes the room; the wall offers the room back, the answer
  is folded there, and reopening the console returns the wall to being one.
- `pnpm validate` green, and the wall anti-leak test fails when the projection is
  broken on purpose.

## What the build disagreed with

**The wall replaced the poster.** `/invite/:code` was a socketless page showing
a room's invitation for a projector, reached from the home page's *show a
table's invitation* fold and the console menu's *on its own screen* link. The
wall's lobby is that poster, and every later phase too, so both doors now lead
to the wall and the poster page is gone: the home fold opens `/wall`, the menu
opens `/wall/:code` in a new tab. What the poster could do and the wall cannot
is show a room with nobody from it in the room to pair — an event projector
typed in by a stranger — which is a case nobody has had.

**The console's stage is the wall's.** No second set of screens: `Stage` left
`host-console-page.tsx` for `room-stage.tsx` as `RoomStage`, taking
`controls: StageControls | null`, and the lobby, both slate boards and the
verdict panel learnt to draw without them. The wall adapts its `WallRoomView`
to the host's shape with every secret in the state the host view already has
for *not held* — `asRoomScreenView` in `features/wall/wall-view.ts` — which is
honest because the wall was never sent any of it.

**The wall arms its own audio unasked, once.** A wall opened by a click in the
same tab — the home fold, the pairing screen navigating on — already carries
the browser's permission, so it tries on mount and offers *turn the sound on*
in its header only if that was refused. A wall opened in a new tab from the
menu is the case that needs the press.

**The host-away notice waits five seconds** (`useAbsentFor`), so a console's
Wi-Fi blink does not offer the room to whoever is standing at the wall.

**The takeover is a navigation, not a role switch on the socket.** *Keep the
table from here* goes to `/host/:code?from=wall`; that console folds the answer
behind *show me the answer* and, when a token claim displaces it, goes back to
`/wall/:code` instead of drawing the refusal. A buzz that was held when the host
left is voided by the freeze as before, so the takeover opens on the round's
reveal rather than on the buzz.

**Verified muted in three browser contexts**: pairing by scan and by the menu's
field, the lobby, a quiz round in choice mode and in buzzer mode (the wall
reads *Zoé a buzzé* and a clock, the console reads the answer), the host-away
notice, the takeover with its folded answer, and the return.
