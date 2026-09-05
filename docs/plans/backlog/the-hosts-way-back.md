## The host's way back

Close the console's tab by accident and everything needed to come back is
already there — except a door.

**The room survives.** `onClose` only stamps `hostLeftAt`
(`room-service.ts:196`); nothing on the host's departure deletes anything, and
`room.hostSessionId` is kept on purpose (`room.ts:31-33`). The sweeper removes a
room only when it has **no connections at all** *and* ten minutes have passed
since `lastActivityAt` (`room-store.ts:87-105`, `ABANDONED_ROOM_GRACE_MS`), so a
single player still connected keeps it alive indefinitely. The only immediate
deletion is `host.closeRoom`.

**The token survives too.** `taverla:host-tokens` holds up to eight for 24 hours
(`session-memory.ts:146-156`), it is deliberately *not* dropped when a refusal
voids the seat, and it **always wins** a claim — no grace window to wait out, no
takeover, immediate.

**What is missing is the lock to put it in.** `hostPathFor` has exactly one
caller in the app — `use-create-room.ts:49` — and it is reached only after a
`POST` that mints a *new* room. No form, button or link anywhere takes an
existing code to the console; the home's code field goes to `/play/:code`
(`join-with-code.tsx:84`). `HostRefused` is not a way in either: it renders only
once you are already on `/host/:code`, and it asks for the token rather than the
code.

So the host holding the key has nowhere to use it, while a stranger who read the
code off the wall can take the room with no key at all once
`HOST_RECLAIM_GRACE_MS` has passed. That asymmetry is the entry.

## What was decided, 5 September 2026

**The home lists the rooms this device has hosted**, read from
`taverla:host-tokens`. Not a code field, and not a public list — the list is
offered *to the device that holds the token*, which is what lets the console's
door stay URL-only for everybody else.

- **Every entry is resolved before it is offered.** The memory lasts 24 hours and
  a room can be gone in ten minutes; `GET /api/rooms/:code` already exists and is
  unauthenticated. A list that skips this offers ghosts, and at most eight calls.
- **The player half is the same shape and is taken with it.**
  `taverla:seats` holds up to eight seats for 24 hours, so a phone that reloaded
  onto the home goes back to its seat and its score instead of retyping a code it
  no longer has.

## Refused, and it stays refused

**A public list of open rooms.** The code *is* the door: four characters over 28
glyphs, 614 656 combinations, displayed to be read aloud in the room it belongs
to. Publishing the list removes the only lock there is, and it composes badly
with what is already true — past `HOST_RECLAIM_GRACE_MS` the code alone takes the
room, so a public list hands a stranger not a seat but the console: end the
round, remove players, close the room. The product behind such a list is
matchmaking between strangers, and it brings room names, a public/private flag,
reporting and moderation with it. That is a different game. If strangers are ever
wanted, it is decided when the room is opened (`isPublic`), never by publishing
everybody else's.

**A "host with this code" field on the home**, for the same reason — see
[the way in leaves the console](the-way-in-leaves-the-console.md), which is the
session that makes the code travel further and therefore the one that makes this
lock worth keeping.

## Server hardening found on the way, and owed by this session

**No message handler checks `isHostConnected`.** The only gates are
`HOST_ONLY_MESSAGE_TYPES` and whether the room resolves. When the host leaves,
`holdRoundWhileHostIsAway` (`round-conductor.ts:337-343`) cancels all four timers
and freezes the clock, and the phone draws a paused screen
(`player-round.tsx:93-99`) — but that is the *client* refusing. The server still
accepts `player.answer`, so everyone answering satisfies `everyoneIsDone`, closes
the round, and `armAutoAdvance` → `beginRound` → `armCountdown` puts the clip
timer back with nobody connected to play the clip.

Nothing reaches this through the shipped UI. It is still the wrong way round for
this repository: **the server decides**, and a frozen round is a server fact that
only the client currently enforces. The guard belongs beside the phase check in
`registerAnswer` / `registerBuzz`, with an error code of its own — `host_away`
already exists as a client-side buzz blocker and is the name to reuse.

## Verifying it

Real browser, muted — `taverla:volume` to `'0'` before the first navigation. The
scenario is the entry's own: open a room, close the console's tab, land on the
home, and take the room back with no wait and no takeover. Then let the room's
ten minutes pass with nobody connected and confirm the dead entry is not offered.
