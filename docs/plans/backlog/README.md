# The backlog — index

**Read one entry.** The tables below are enough to choose; open the single file
of the session you take, and nothing else. Delivered sessions keep their file so
what they found stays readable, and are never opened to plan new work.

What a session picks up next, and nothing that is already in flight — the
uncommitted tree is [`HANDOFF.md`](../../../HANDOFF.md)'s job, and that file is
local to one machine. This one is committed, because a backlog that dies with a
laptop is a to-do list somebody has to remember.

Each entry is **scoped to one session**. Read it, read what it links, and update
it when reality diverges. A session that turns out to be two says so in its own
file rather than half-landing.

## Open

Ordered by **what is wrong before what is missing**. `host-may-race` and
`board-a-phone-never-sees` are half-sessions and can ride along with a
neighbour; `decades-on-the-shelf` is the only one that is new work rather than a
fault or a polish.

| Session | In one line | Cost | Starts with | Holds |
|---|---|---|---|---|
| [The room is silent, unexplained](silent-room-unexplained.md) | **Half done.** The console names the refusal; why Android refuses is unread | waits on a phone | — | note 6 |
| [A host's seat comes off](host-seat-comes-off.md) | A seated host drops back to plain host after a few rounds | a session | — | note 8, second half |
| [The host may race](host-may-race.md) | A guard right about the buzzer and wrong about the reflex race | half a session | — | note 7 |
| [The board a phone never sees](board-a-phone-never-sees.md) | No standings on the player screen after a reveal, and not only in the quiz | half a session | `/impeccable` | note 8, first half |
| [A name you give once](name-you-give-once.md) | A stored name should skip the form, and be editable from a menu | a session | `/impeccable` | note 5 |
| [Decades on the shelf](decades-on-the-shelf.md) | Genres exist behind a `ToggleGroup`; decades do not exist at all | a session | — | note 2 |

**One diagnosis disagrees with the note that raised it** — read the entry before
planning it:

- **A seated host's clip is not withheld.** The server sends `audioUrl` to a
  seated host and holds back only the title and artist. *Le son ne sort pas
  d'ici.* is an autoplay message that predates the seat entirely, and the
  silence has a different cause. **Do not pick a fix before somebody has read
  the refusal on the Android phone that produced note 6.**

## Delivered

| Session | Landed |
|---|---|
| [A reconnecting phone stays half-dead](reconnecting-phone-half-dead.md) | 15 Aug 2026 |
| [Three exits that say nothing](three-exits-that-say-nothing.md) | 15 Aug 2026 |
| [The question bank's spelling](question-bank-spelling.md) | 15 Aug 2026 |
| [Speed pays by rank; it should pay by the clock](speed-pays-by-rank.md) | 15 Aug 2026 |
| [Two controls that break on their content](controls-that-break-on-content.md) | 15 Aug 2026 |
| [The gap between two rounds](gap-between-two-rounds.md) | 15 Aug 2026 |
| [Say it the way a table says it](say-it-the-way-a-table-says-it.md) | 15 Aug 2026 |
| [The winner gets a moment](winner-gets-a-moment.md) | 15 Aug 2026 |
| [Arriving cold in a running blind test](arriving-cold-mid-blind-test.md) | 15 Aug 2026 |
| [Stage 18 — Reflex race](../18-reflex-race.md) | the fifth game |
| [The field the whole game is typed into](field-the-game-is-typed-into.md) | 16 Aug 2026 |
| [The speed bonus nobody sees](speed-bonus-unseen.md) | 16 Aug 2026 |
| [Who owns a room](who-owns-a-room.md) | 15 Aug 2026 |

**[The question bank's spelling](question-bank-spelling.md) is the one delivered
entry worth opening**, and only for this: two of the three faults it was given
turned out not to be faults at all. It is the standing warning that a diagnosis
written here can be wrong.

## Where this came from

Two playtests, both traced into the code before being written down, so every
entry is a diagnosis and not a wish.

- **14 August 2026**, Adrien and Marina, on an iPhone and a laptop — thirteen
  observations, which became the twelve delivered entries above.
- **16 August 2026**, Adrien and a co-tester, on Android — eight notes, *note 1*
  through *note 8*, which became the six open entries,
  [the field the whole game is typed into](field-the-game-is-typed-into.md) and
  [the speed bonus nobody sees](speed-bonus-unseen.md).

Three times now, a session's own design question turned out to have been
answered before it was asked. It is the ratio [the plans'
README](../README.md) warns about: *the plans cover what is missing; what is
wrong surfaces by playing.*

## Settled, so nobody re-opens them

- **The 10 883 "pending" OpenTDB questions do not exist locally.** They are
  OpenTDB's own review queue; the API serves only the 5 298 verified rows, which
  are already bundled. Getting them means scraping, which
  [stage 14](../14-question-languages.md) rejected on purpose. Recommendation: no.
- **Emoji reactions**: not for now.
- **Mid-game joining stays**: a phone that arrives takes a seat and plays from
  the next round.
