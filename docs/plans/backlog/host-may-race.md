## 15 · The host may race

> *Note 7 — "l'hôte ne peut pas jouer à réflexe ? Pourquoi ?"*

Because of a guard that is right about the buzzer and wrong about the reflex
race. `setup-fold.tsx:117-123` hides the seat form whenever
`view.settings.mode.kind === 'buzzer'`, and its comment gives the reason: *"that
round needs someone reading the answer to judge it, and a judge who is also
answering is not one."*

**The reflex race has no judge.** It settles on the taps
(`settleReflexRound`, `round-service.ts:903`), `HostActions` returns `null` for
it (`host-actions.tsx:44`), and the server already routes a tap by the *seat*
rather than by the role — `socket-handler.ts:406-420`, whose own comment says
*"the seat, not the role: a host running the room from the phone in the middle
of the table holds both."* The server would accept the host's tap today. It is
narrowed out by the client because reflex, like the bare buzzer, offers only
`buzzer` mode (`packages/core/src/room/game-modes.ts:45-54`) — so the guard
catches it by accident of the mode it shares, not by anything true about it.

**And there is a leak on the other side of the same guard.** A host who takes a
seat first — in a room with no game yet, or on the quiz — and *then* picks
reflex **keeps the seat**: nothing on the server or the client revokes it. That
host has no way to tap, because the reflex playing stage is display-only
(`reflex-stage.tsx`), yet they are in `openedWithPlayerIds`, so
`everyoneHasTapped` (`round-service.ts:870-890`) waits for a thumb that has no
button and every heat runs its full duration. Whichever way the seat question is
answered, that path has to stop existing.

So: offer the seat for reflex, give the reflex host stage a tap target when
seated, and key the guard on *does this game need a judge* rather than on the
mode. The bare buzzer's exclusion stays and gets the honest name.

### How to tell it is done

- A host takes a seat, picks reflex, and can tap; their reaction time is on the
  board.
- A heat with a seated host who never taps ends on the deadline, not on a wait
  that nothing can satisfy.
- The bare buzzer still refuses the seat.

## Delivered — 16 August 2026

`isJudgedByHost({ game, mode })` in `@taverla/core/room/game-modes` is the
honest name, and it is `mode === 'buzzer' && game !== 'reflex'`. Verified in a
browser across all five games and both blind-test modes: the seat is offered
everywhere except the bare buzzer and a blind test answered by a buzz.

**The tap target is the stage itself** — a full-bleed control with no ground and
no edge, over an otherwise unchanged screen, rather than a buzzer drawn beside
the flip. The argument is in [`DESIGN.md`](../../../apps/game/DESIGN.md); do not
replace it with a round button. Two things it cost:

- **`.stage.solo` centres its one child**, so `.reflex-stage` was as wide as its
  longest word and the press target measured 202px of a 968px band.
  `align-self: stretch` is what makes "the field is the buzzer" true.
- **The console's own line reserves its height while empty.** It says nothing
  during the wait, then the reaction or a false-start stamp — measured at the
  same 39.5px in all three states, so nothing moves under the eyes waiting for
  the flip.

The seat's description was a promise the reflex race cannot keep — *you stop
seeing the answer before everyone else*, in a game with no answer — so it is two
keys now, `host.seat.cost.hiddenAnswer` and `host.seat.cost.sharedScreen`, and
the caller picks.

**A false start settles a heat immediately when the console is the only seat**,
which is correct and makes the stamp unobservable alone: driving it needs a
second phone in the room.

The leak this entry names is closed for reflex, and **its twin on the bare
buzzer is not** — a console that seats itself and then picks the buzzer keeps a
seat it can never use. Nothing hangs there, so it is filed with the rest of the
seat's lifecycle in
[a host's seat comes off](host-seat-comes-off.md).

---

