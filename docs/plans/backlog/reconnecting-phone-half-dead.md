## 1 · A reconnecting phone stays half-dead — **done, 15 August 2026**

> *Playtest 3 — "elle a quitté la partie et est revenue, ça fonctionne bien,
> mais son nom est resté grisé toute la partie, et un des 4 boutons apparaissait
> blanc."*

Two symptoms, three faults, and the first is the twin of a bug the working tree
has already fixed for the host.

**What shipped**, against what this entry expected:

- `isSeatConnected` in the connection registry, and the guard in `onClose`
  before both `markPlayerDisconnected` and `releaseBuzz`.
  `reconnecting-phone.test.ts` holds it, and both of its tests were watched
  failing with the guard removed.
- The second-order effect was **not** the seat sweeper failing to fire. Reading
  `isAbandoned` settles it the other way: the dead socket restamps
  `disconnectedAt` at the moment it dies, so the seat looks abandoned from
  *then* — and ten minutes later the sweeper would have taken the seat and the
  score of a player still sitting there. The playtest room did not run that long
  after the handover. The guard closes this too, since the stamp is never
  written.
- The white button was diagnosed further than it could be *confirmed*: the
  specificity is real and reproducible in any browser, and the disabled rule now
  wins in every variant. Whether the stuck attribute on the iPhone was
  `data-hovered` or `data-pressed` is still unread — the fix covers both, and
  `touch-action: manipulation` joins the buzzer's. The design question underneath
  it, what a hover should paint on a touch screen at all, is still session 5's.
- Deriving *I have answered* needed one thing this entry did not see: the host
  console holds no `youId`, so a seated host could not read itself in
  `round.answers`. `hostRoomViewSchema` carries a nullable one now — the server
  already had `seatId` and simply was not sending it. `useAnswering` is gone;
  `ChoiceAnswer` keeps one boolean for the 20–80 ms round trip and takes
  everything else from the snapshot, under the `key={round.id}` its two
  neighbours already had.
- The unshown refusal needed no screen of its own: the second tap it came from
  cannot happen now that a reloaded phone comes back locked.

### The grey name

`onClose` marks the seat disconnected without asking whether **another live
socket still holds it** (`apps/server/src/infrastructure/messaging/socket-handler.ts:891`).
Two sockets sharing a seat is normal — `seatPlayer` reclaims by `sessionId` and
`registerConnection` only ever appends. On iOS an app switch or a Wi-Fi→4G
handover leaves the old socket half-open server-side: she comes back, `hello`
lands, `joinAsPlayer` sets `isConnected = true`
(`apps/server/src/domain/room/room-service.ts:45-51`), and then the zombie TCP
finally dies and `onClose` sets it back to `false` **for good**. She plays
normally — nothing on the answer path reads `isConnected` — and she is grey until
the game ends.

The host half of exactly this is `socket-handler.ts:878-889`, guarded on
`isHostConnected` in the tree right now. The player branch below it never got the
symmetric guard: test `connectionsIn(roomCode).some(c => c.playerId === …)`
before `markPlayerDisconnected` **and** before `releaseBuzz`, or the dying socket
also takes the floor away from someone who has retaken it.

There is a second-order effect worth checking rather than assuming: with
`disconnectedAt` stuck, `startSeatSweeper` should have dropped her seat and her
score after ten minutes (`round-conductor.ts:412-438`,
`ABANDONED_SEAT_MS`). It did not, so either the room ran short or the ordering
was different — find out which before closing this.

### The white button

`ChoiceAnswer` has no *selected* state and no *correct/incorrect* state — at the
reveal it is unmounted for `Revealed`. So a filled button during `playing` can
only be `[data-hovered]` or `[data-pressed]`, and `.button.outlined[data-hovered]`
(0,3,0) outranks `.button[data-disabled]` (0,2,0) — a stuck state stays painted
after the button is disabled, in `--ink` on a dark field, which is white.

React Aria documents the WebKit quirk itself: iOS fires a second `pointerenter`
as `pointerType: 'mouse'`, guarded by a global 500 ms window armed on a `touch`
`pointerup`. Miss that window — a busy main thread on a snapshot re-render, a tap
that ends in `pointercancel` — and `isHovered` latches with nothing to lower it.
The buzzer carries `touch-action: manipulation` (`player-round.sass:107`); the
four choice buttons do not (`answer-forms.sass:28-35`).

**Confirm before fixing**: inspect the offending button on the iPhone and read
whether it carries `data-hovered`. Three levers, and the third is a design
decision that belongs to session 5 rather than here — `_control.sass:49-52`
asserts that `data-hovered` never fires on a touch screen, which is what this
bug disproves.

### The state that should never have been local

`useAnswering` keeps `answeredRoundId` in `useState` (`answer-forms.tsx:37-48`)
and that is the only memory of *I have answered*. After a reload the four buttons
are live again although the server holds her answer; a second tap is refused with
`already_buzzed` and **that refusal is displayed nowhere** — `player-round.tsx:60`
passes `error` to Le Fake's forms only. Derive it instead:
`round.answers.some((a) => a.playerId === youId)` is already on the wire
(`room-view.ts:142-145`), and `ChoiceAnswer` is the one form of the three with no
`key={round.id}` (`player-round.tsx:198` against `:185` and `:208`).

### How to tell it is done

- Two player sockets on one `sessionId`, close the first: the roster stays
  connected and the floor is not released. A socket test beside
  `second-console.test.ts`, which already has `sessionIdOf` for it.
- Reload a phone mid-round after answering: the buttons come back locked, from
  the snapshot.
- A real iPhone, muted, tapping a choice: no button stays painted.

---

