# Stage 15 — A chat in the room, and public rooms

**Both evaluated, both declined.** Neither was built; this file is why, so the
next person who has the idea reads the reasoning instead of rediscovering it.
Each ends with the smaller thing that *is* worth building, because in both cases
there is one.

## A chat in the room — no

The idea: a message field on the player's screen, so the table can talk inside
the game.

**Everyone is already in the same room, and they already have a chat.** It is
called talking, and it is faster, funnier and needs no protocol.
[`PRODUCT.md`](../../apps/game/PRODUCT.md) does not describe an app people use
together from elsewhere: "People in the same room, at the same time, each on a
screen of their own."

Four things followed. **The first was narrowed on 19 August 2026**, and most of
the weight moved onto the other three:

1. **It contradicts the product's first principle** — which used to read "the
   phone is a buzzer, not a screen", and no longer does.
   [`PRODUCT.md`](../../apps/game/PRODUCT.md) now says the phone carries what a
   player needs to follow the game and stays quiet doing it, so a player reading
   their own phone is the intended case rather than the failure. A chat is still
   refused by that principle, but as a question of what earns its place on a
   screen read in glances rather than as a flat contradiction — a weaker ground
   than the one written here first. Nothing below depended on it.
2. **It competes with the game for the one thing the game needs.** During a round
   a player is racing a clock; between rounds the room is looking at the reveal
   on the big screen. There is no moment in the loop where a chat is what the
   player should be doing.
3. **Free text, no accounts, children in the room.** Anyone who can scan the QR
   code can type, there is no identity, no report, no block, and no moderation of
   any kind. Against a stated commitment that the tone "must work with a
   grandparent and a drunk friend in the same room". A nickname is one field
   entered once and visible to a host; a chat is an open channel. Those are not
   the same exposure.
4. **It is the one shape that breaks the snapshot rule.** State travels as a
   whole snapshot precisely because a room is small and changes at human speed. A
   chat is a *log*: it grows without bound, it needs ordering and history, and a
   client that reconnects needs what it missed. So it is not a field on the room
   view — it is a second transport discipline beside the one the protocol has.

**Where it would genuinely pay is remote play**, where there is no shared voice
channel — and remote play is out. Stage 10 was dropped, audio is host-screen only
and permanently so. Even then, a table playing remotely is already on a video
call, which carries the voice better than a text field would.

### What is worth building instead, if the itch returns

**Emoji reactions from the phone to the big screen.** One tap, nothing to read,
a fixed vocabulary so there is nothing to moderate, and it lands where the room
is already looking rather than on twelve private screens. It gives back the
banter a chat was wanted for and costs the game nothing.

It is not a new idea here: stage 03 already listed "emoji reactions" beside chat
as out of scope. The difference is that reactions are compatible with the first
principle and a chat is not.

## Public rooms, and a list of them — no

The idea: choose public or private when creating a room, and list the public ones
so strangers can join.

Cost was the stated worry. It is real — Render's free tier, one process, rooms in
memory — but it is the **least** of the reasons, and leading with it would hide
the two that actually decide it.

1. **The blind test is structurally unplayable by a stranger.** Audio only ever
   plays on the host screen, and `PRODUCT.md` calls that "deliberate and
   permanent". A public room for the flagship game hands someone a buzzer and no
   music. The quiz would survive it, since both screens render the question — but
   shipping a front door that works for one game on the shelf and not the first
   one is not a feature, it is a trap.
2. **There is no identity layer, and children are a named audience.** No
   accounts, free-text nicknames, no reporting, no blocking, no history to ban
   against. A public list is an invitation for strangers to enter a family's
   game. That is not fixable with a flag on room creation: it needs accounts,
   moderation and a reporting path — which is a different product, not a feature
   of this one.
3. **Griefing is free.** 24 seats and no authentication, so a listed room can be
   filled or nickname-spammed by anyone who reads the list. Today the only
   defence is that somebody has to *tell* you the code: 28⁴ is 614 656
   combinations, thin protection on its own, and a directory removes even that.
4. **Rooms do not survive a restart** and live in one process. A public directory
   promises a permanence the server does not have and was deliberately not given.

**What people actually want from "public" is matchmaking** — a way to play when
nobody is around. That is a real want and a real product, with the accounts,
moderation and persistence that come with it. It is not this one.

### What is worth building instead, and it is nearly free

**The private half, as a lock the host controls.** Two gaps found while auditing
this, and they fit together:

- **A player can join in any phase.** `JoinError` in `room-service.ts` is
  `room_full | nickname_taken` and there is no phase guard, so a stray scan of a
  QR code still on screen walks into a game in progress and appears on the
  scoreboard.
- **`room_closed` already exists** in `error-code.ts` and in both dictionaries —
  *"L'hôte a fermé le salon."* — and **nothing in the server sends it**. The
  vocabulary for this is built and dangling.

So the useful half of "private" is a host toggle that refuses new players,
answering with the code that is already written. It needs no choice at creation
time, no directory, and it retires a protocol code that currently means nothing.

**Both premises have since expired, and the candidate with them.**
`host.closeRoom` sends `room_closed` on disband, so the code means something
now. And joining mid-game is **wanted**: a phone that arrives during a round
takes a seat, sits out the round in play, and answers from the next one — which
is what a room where people drift in and out of the kitchen actually does. The
lock is not built and is not on the list; what the audit really found was the
round in play needing to know who was in it when it opened, and that is
[stage 17](17-mid-game-join.md).
