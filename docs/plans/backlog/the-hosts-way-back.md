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

This refuses **that** field and not every field. The same entry puts a code field
on the home for `/invite/:code`, and it is safe for the reason this one is not:
the poster grants nothing — no seat, no console, no token — where the console is
the room itself. What must never happen is the two being served by one field.

## Server hardening found on the way — **landed 9 September 2026**

**No message handler checked `isHostConnected`.** The only gates were
`HOST_ONLY_MESSAGE_TYPES` and whether the room resolves. When the host leaves,
`holdRoundWhileHostIsAway` (`round-conductor.ts:337-343`) cancels all four timers
and freezes the clock, and the phone draws a paused screen
(`player-round.tsx:93-99`) — but that is the *client* refusing. The server still
accepts `player.answer`, so everyone answering satisfies `everyoneIsDone`, closes
the round, and `armAutoAdvance` → `beginRound` → `armCountdown` puts the clip
timer back with nobody connected to play the clip.

Nothing reached it through the shipped UI. It was still the wrong way round for
this repository: **the server decides**, and a frozen round is a server fact that
only the client was enforcing.

The guard went one level up from where this entry put it. `registerAnswer` and
`registerBuzz` are two of **four** frames that move a round along from the floor
— `lefake.submit` and `lefake.vote` carry the same fault, and a guard threaded
through four domain functions is four places to forget the fifth. So
`FLOOR_MESSAGE_TYPES` partitions the union in `client-message.ts` and the gate
sits in `dispatch`, beside the host-only one it mirrors. `host_away` is the code,
as prescribed, and it needed a sentence in both dictionaries before it compiled.
`host-absence.test.ts` covers it: the floor answers a frozen round in full and
the round is still `playing` afterwards.

## The door — **landed 9 September 2026**

`HeldRooms` sits in `features/home/`, under the two doors and above the shelf.
Three things it decided that the section above did not.

**Where it goes was settled by a measurement, not by rank.** It is drawn only
once the server has answered — the lookup returns a bare boolean, so there is
nothing to enrich a row with afterwards and a row put up early would be an offer
withdrawn. Above the two doors that arrival moved `Open a table` down **221px**,
which is the same fault as the verdict line that shifted a form by 20px, six
times over. A block whose height is unknown cannot sit above the one action a
thumb aims at, and reserving does not save it: a candidate that turns out to be
dead collapses the reservation and moves the same button the other way. So it
goes under both doors, where its arrival pushes only the shelf, and at 414px it
still opens at y=627 on a 896px screen — visible without scrolling, which was
the whole reason to want it high.

**A lookup that fails is not a refusal.** Only `exists: false` says a room has
gone; a request that never landed says nothing, and withholding the door then is
the failure this entry exists to fix. So an unanswered candidate is still
offered and the room page's own refusal screen says so if it turns out to be
dead. Only a confirmed absence prunes, and it prunes the token *and* both seats,
which is what keeps the eight slots each store has for rooms that still exist.

**Two exclusions carry the security posture**, and both live in
`heldRooms` in `packages/core/src/room/session-memory.ts` with tests. A **host
seat is not a way in** — only the token opens the console, so a device left
holding a seat and no token is offered nothing, which is the soft lock this
entry spent its argument protecting. And a **seat with no nickname is not a
seat**: the socket opens before the join is answered, so a refused arrival
leaves an entry behind, and offering it would send somebody back to a room they
never got into. Four rows is the ceiling — a front door is not a history.

A row is one line: the code at one edge, `Your table` or `Your seat` at the
other in the `label` register. It is the design system's `Link`, `outlined` and
`large`, rather than a fourth hand-rolled surface — a room has one fact and the
word beside it says which door the press opens.

## Verifying it

Real browser, muted — `taverla:volume` to `'0'` before the first navigation. The
scenario is the entry's own: open a room, close the console's tab, land on the
home, and take the room back with no wait and no takeover. Then let the room's
ten minutes pass with nobody connected and confirm the dead entry is not offered.
