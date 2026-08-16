## 16 · The board a phone never sees

> *Note 8, first half — "dans « quiz » ⇒ « on tape » : on ne voit pas le
> classement des joueurs après chaque réponse sur l'écran du joueur."*

True, and it is not specific to the quiz. `Revealed`
(`player-round.tsx:389-433`) dispatches per game and only its **final fallback**
renders `<Scoreboard>` — a branch reached solely by the bare buzzer, which has
no answer to reveal. Quiz and blind test players see the answer, plus a `+N`
**only if they scored** (`:124`). A player who got it wrong sees the answer and
nothing else: no board, no *you were wrong*, not even the words they typed. A
scoreboard reaches a phone only at `finished`, and the persistent `Scoreline`
strip carries their own score and the room size.

**This has been declined twice**, in [17](../17-mid-game-join.md) and again in
[session 6](gap-between-two-rounds.md), on the same
principle: repeating the room's ranking on every phone asks the table to look
down at a phone. A third ask from a room that has now played several evenings
outranks a principle written at a desk — **but the principle is right about the
composition**, which is why this starts with `/impeccable` rather than with a
component.

The recommendation to argue against: a phone does not need the list. It needs
**where I stand and what just happened to it** — a rank, a score, the delta from
this round, and at most the neighbour above. That answers *did I gain?* in one
glance, where the full board asks the player to read it. It also composes with
[12](speed-bonus-unseen.md), which is putting
the number on the big screen at the same moment.

### How to tell it is done

- A player who answered wrong learns, on their own phone, that they did.
- After a reveal a phone says where its owner stands without being scrolled.
- The big screen is still the thing the room looks at.

---

