## Everything the phone is already sent — **A and B landed 19 August 2026**

**The big screen is often somebody else's.** It is across the room, angled away,
or — when the host runs the room from a phone, and more so when that host has
taken a seat — in one person's hand and nobody else's. A player who cannot see
it today cannot follow the game: they do not know which round it is, they do not
know where anyone stands, and at the reveal they learn only whether *they*
scored. That is the gap this entry measures.

**Read the principle before the table below.** `PRODUCT.md` was rewritten on
19 August 2026 and corrected the same day, because the rewrite overshot. The old
principle — *the phone is a buzzer, not a screen* — was wrong and is gone. What
briefly replaced it, *both screens carry the whole picture*, was wrong in the
other direction and reads as a licence to draw the console at 414 px. What
stands is: **the phone is enough on its own, and stays quiet doing it.** More on
the phone, not more *at once* — and the UI it has today is the register to keep,
not the one to leave behind.

**The finding that decides the shape: nothing is missing from the wire.** Every
item below is already inside `PlayerRoomView` and arrives on every snapshot. No
protocol change, no `PROTOCOL_VERSION` bump, no server work. This is a rendering
session, and that is what makes it worth taking now rather than later.

## What the big screen shows and the phone does not

| Phase | On the phone today | Absent, and already sent |
|---|---|---|
| every | own nickname, own score, own rank, room size (`Scoreline`, `player-page.tsx:278-303`); room code as text; ~~the round number~~ **drawn beside the code since A** | — |
| `lobby` | game name, one scoring line (`UpNext`) ~~and nothing else~~ · **the roster since B**: every nickname, whose screen has gone, and no rank or score because nobody has one yet | — |
| `playing` | prompt, one form, an answered count, a progress bar when the game has a duration · **the reflex heat's tap count since B**, on the screen of a thumb already down | the running scoreboard, **dropped** — see below |
| `buzzed` | the buzzer, disabled with a reason; who buzzed, by name; **the floor clock since B**, for the room and not only for the player holding it | — |
| `revealed` | title and artist, or the answer; own award; the cover; **the room's round as one board** — every player ranked, what each said, what it paid (`round-board.tsx`, since A). The gap to the player ahead was **removed**: the board says it by name, for everybody | — |
| `finished` | own rank, full scoreboard | the winner headline |

Two phases are already right and are worth reading before building the others:
**`voting`** and Le Fake's and the reflex race's reveals draw the *same
component* on both surfaces (`RevealedLieBoard`, `ReactionBoard`). They are the
proof that symmetry is cheap when the board is designed once.

## A floor, and a queue behind it

The table is a measurement, not a checklist. Three of its rows are the floor —
without them a player who never looks up is not playing the same game as the
room:

- **the round number and the round count**, in the chrome, on every phase
- **what just happened**: every player's answer with its verdict, and what each
  of them scored
- **where everyone stands** once the round is revealed

Everything else has to earn its place against a screen read in glances, and the
arguments cut both ways:

- **The cover art.** The product's only real image, and the reveal is the one
  moment in the loop when nobody is racing. The strongest of the rest.
- **The floor clock for players who did not buzz.** Watching a silence with no
  end in sight is a genuine fault; a second countdown on a screen that already
  has one may not be the fix. A bar rather than a number, or nothing but the
  name.
- **The lobby roster.** The only item here a player has another channel for —
  they can look up, or ask the room. Weighed against the lobby being the one
  screen with room to spare.
- **The running scoreboard mid-round.** The likeliest mistake on this list. A
  player mid-round is racing a clock, and a standings table is what they read
  *after* it.
- **The reflex heat's live tap count**, and **the host-gone signal outside a
  running round.**

The session decides these with `/impeccable` and is expected to drop at least
one. Dropping none is the sign the table was read as a to-do list.

**B kept four and dropped one.** What it decided:

- **The running scoreboard mid-round is dropped, and the entry above called it.**
  A player mid-round is racing a clock; the standings are what they read after
  it, and A already put them there. The persistent strip carries *2nd of 6* at
  every phase, so nothing about their own standing is missing during a round —
  what a table would gain is the console at 414px, on the one screen where the
  round is being answered.
- **The floor clock is the same component, not a bar.** `FloorClock` already
  counts both directions off one `ActiveBuzz`, and during `buzzed` there is no
  other clock on the phone — `RoundProgress` is gated on `playing` — so the
  second-countdown worry the entry raised was void. It draws where the host set
  a window and counts up where they judge it themselves, which is what a bar
  could not have done at all.
- **The lobby roster is the board, unranked.** `hasAnybodyScored` is false in a
  lobby, so `Scoreboard` drops its rank and score columns on its own and what is
  left is names — which is the shape A predicted when it refused to let the
  reveal degrade into one.
- **The reflex tap count is drawn on one of that game's three screens**: the one
  belonging to a thumb already down. The wait before the flip is the only screen
  in the product that never moves, and the bench is reachable *before* the flip,
  so a tally on either is how a table counts the flip out loud. After your own
  tap the heat has up to `TAP_WINDOW_MS` left and the count is the only thing
  that screen can still learn.
- **The host-gone signal replaces the pitch, not the screen.** A running round
  is blanked because nothing on it is answerable; a lobby has nothing to block
  and the roster stays true while the console is away. What could not stay is
  *the innkeeper is choosing a game*, which is the one thing the phone is
  waiting on. `revealed` and `finished` were left silent: the phone has just
  been paid and is waiting on nobody, and a two-second socket blink crying
  *stepped away* over a reveal is worse than the silence.

**A took the floor and the cover.** What it decided, so B does not re-open it:

- The floor is **one list, not two blocks**. The answers and the standings are
  the same people, so the phone folds them into one row per player — rank,
  name, what the round paid, the new total, and what they said under their own
  name. Two boards stacked is the console at 414px, which is the failure mode
  the entry was written around.
- **The receipt survives and shrank.** `+4` is still the loudest thing on the
  screen, one clamp step down, because the row under it now says the same
  number. The line naming the player above was **dropped** — the board says it
  by name, by points and for everybody rather than for one.
- **A board with nothing to say draws nothing.** Before the first point with
  nobody having typed, every column is empty and what is left is a roster,
  which is a lobby concern and B's.
- **The reveal splits in two above `$wide-screen`**, because a laptop has the
  width and not the height, and the board was landing under the fold. Same
  answer the room's own reveal already reached, one screen down.

## The fields on the wire that nothing renders

What is left after B, and none of it is owed: `choices[].coverUrl` ·
`round.lockedOutPlayerIds` for others · every `settings.game.*` the room is
playing under.

B took `players[].isConnected`, `round.content.reflex.taps[]` live,
`activeBuzz.expiresAt` for non-buzzers and `isHostConnected` outside a running
round; A took the other seven. Not one of the eleven cost a line of protocol,
which is what the finding at the top promised and the only prediction in this
entry that held in full.

## What does not move, and why

The anti-cheat seam is untouched and must stay untouched. `playerRoomViewSchema`
is `baseRoomViewSchema` + `youId` and nothing else (`room.ts:426-428`);
`currentContent`, `correctChoiceIndex` and `remainingPoolSize` exist only on the
host's schema; `revealedAnswers` is `[]` and `revealedTrack` is `null` until the
round reveals (`room-view.ts:162-169`, `:206-211`). **Everything this entry asks
for is either already in the player's view or lands after the reveal.** Nothing
here needs a field moved across that line, and a session that finds itself
wanting one has misread the entry.

## The failure mode is the console at 414 px

The phone being enough on its own does **not** mean it draws what the console
draws, smaller. The big screen carries one idea at four metres; the phone
carries detail at 40 cm for one reader, who is standing, in the dark, glancing
down between two answers. Same information, different density and a different
order — the phone can fold, scroll and rank by *you* in a way the big screen
never can, and that is what it is for.

The UI that exists today is spare and should stay that way; the session that
makes it dense has failed even if every field lands. So this is an
**`/impeccable` job before it is a rendering job**, and the information
architecture is the deliverable, not the markup.

## This is two sessions, and here is the seam

**A — the floor. Landed 19 August 2026.** The round number in the chrome, and
the reveal rebuilt: every player's answer with its verdict, every player's award
beside it, the standings after the round, and the cover art. Verified in the
browser at 414 px and 1280 px, both palettes, two players and a synthetic eight
— nothing moved on the wire, exactly as this entry predicted.

**B — the queue. Landed 19 August 2026.** The lobby roster with connection
state, the floor clock for the whole room, the reflex heat's tap count and the
host-gone signal in the lobby. The running scoreboard mid-round was dropped.
Nothing moved on the wire here either.

**Two faults it found that were nobody's item.** Both were invisible until the
thing that surfaced them was drawn beside them, which is the argument for
building against a browser rather than a diff:

- **The floor clock was flush left under a centred buzzer**, and had been for as
  long as it was one player's own clock on a screen nobody else read. Putting it
  on every phone is what made a lone number hugging the edge impossible to miss.
  It is centred now, and it follows the two lines naming whose window it is —
  a number that arrives *before* the name is a countdown to nothing.
- **A seat that had gone was `opacity: 0.45` and nothing else.** That is the
  whole row taken under 4.5:1 on every one of the six fields, and it was the
  only thing saying so — no word, no shape, nothing a reader who cannot tell two
  inks apart could use. The row now carries the word, in `label` beside the
  name, and the ink only seconds it. It was a lobby item that turned out to be a
  `Scoreboard` fault, so the console's roster and both final boards got it too.
