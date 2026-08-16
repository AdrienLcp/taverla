## 17 · A name you give once

> *Note 5 — "si y a déjà un pseudo, ne pas le redemander et arriver direct à la
> table ? Et ajouter quelque part quelque chose pour modifier le pseudo dans un
> menu ou autre ? Ça évite une étape, et c'est un peu le but, que tout soit
> rapide et fluide."*

Most of this already exists and is unused. `taverla:nickname` is a **device-global
stored display name** (`preferences-storage.ts:15`, `:71-84`), deliberately kept
out of the seat store, and it is read in exactly one place: to *prefill* the
join form (`player-page.tsx:92`). The form is still shown, and still needs a
press, because `PlayerScreen` initialises its nickname state to `null`
unconditionally (`player-page.tsx:44-80`) — nothing consults the store, or
`taverla:seats`, before deciding to ask.

So the first half is a default, not a feature: initialise from the store, open
the socket, and fall back to the form on refusal — which the screen already does,
since `rejection !== null` brings it back. `nickname_taken` in a room where the
name is already in use lands there for free.

**Renaming needs a frame, and only just.** There is no `player.rename` in
`playerClientMessageSchema` (`packages/protocol/src/client-message.ts:201-209`),
but the server already renames on a re-sent `hello` — `joinAsPlayer` overwrites
the nickname on a returning session (`room-service.ts:42-52`), the clash check
excludes the returning participant, and there is a test on it
(`room-service.test.ts:61`). The client could rename today by changing the
nickname prop, which is a socket dependency (`use-room-socket.ts:265`) and would
therefore **tear the socket down mid-round to change a label**. A `player.rename`
frame is the small honest addition.

The control belongs in `AppMenu`, which is the only chrome on every screen at
every phase, and it reaches it the way everything else in that menu does: a
field on `RoomExitsProvider`, which already exists for exactly this bottom-up
shape (`presentation/exits/room-exits-provider.tsx:14-21`).

Two smaller things in the same seam:

- **`host-seat.tsx:27` starts its field empty** and never reads the stored
  nickname, where the player's form does. Same fix, same line.
- Skipping the form means a player never *sees* the name they are joining
  under. The menu control is what makes that safe, so the two halves ship
  together or neither does.

### How to tell it is done

- A phone that has played before scans the QR code and lands at the table with
  no step in between.
- The name is visible and changeable from the menu, mid-round, without the
  socket dropping.
- A name already taken in that room still gets the form back, with the refusal.

---

