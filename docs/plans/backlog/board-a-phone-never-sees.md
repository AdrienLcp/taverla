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

## Delivered — 16 August 2026

The recommendation held, and split in two rather than landing as one block.

- **The place went into the persistent strip**, not the reveal. It already
  carried the nickname, the score and the room's size, and *2nd of 6* says both
  of the last two in the same line — so a phone answers *where am I* at every
  phase for no extra height, and the reveal did not have to grow to say it. It
  falls back to the bare count while the whole room is on nought, which is
  `hasAnybodyScored` again, the threshold every ranked surface here shares.
- **The reveal became a receipt**: the payout, drawn whether or not there was
  one, and the gap to the row above by name. `round.missed` is the zero arm of
  `round.scored` — muted and a fraction of its size, because a round that paid
  nothing is a result and not a warning, and the ink is what says which.

`standingOf` in `@taverla/core/scoring/scoreboard` is the rule, beside the board
it is derived from. The name it prints is **the row directly above** on that
board, so a tie is reached past rather than named — a gap of nought would say
the opposite of what the line is for.

**The one thing that was removed**: the bare buzzer's phone no longer prints the
room's full board at a reveal. It was the only branch that did, it is the exact
composition [17](../17-mid-game-join.md) and
[session 6](gap-between-two-rounds.md) declined twice, and the receipt now
answers what it was standing in for.

Verified in a browser at 414px with two phones in one room, both locales
switched live: a quiz reveal, a bare buzzer reveal with no answer to print, a
reflex reveal under its reaction board, and the final board, none of them
scrolling.

---

