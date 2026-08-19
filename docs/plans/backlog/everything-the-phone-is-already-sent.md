## Everything the phone is already sent

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
| every | own nickname, own score, own rank, room size (`Scoreline`, `player-page.tsx:278-303`); room code as text | **the round number** — `round.index` and `settings.roundCount` are read in `host-console-page.tsx:266-275` and **nowhere** in the player tree |
| `lobby` | game name, one scoring line (`UpNext`, `player-round.tsx:251-273`) | the roster: every nickname, every connection state, the head count. A phone cannot see who else is in the room it just joined |
| `playing` | prompt, one form, an answered count, a progress bar when the game has a duration | the running scoreboard (`host-console-page.tsx:526`); the reflex heat's live tap count (`reflex-stage.tsx:66-68`) |
| `buzzed` | the buzzer, disabled with a reason; who buzzed, by name | the floor clock, unless it was you (`player-round.tsx:406`). Everyone else watches a silence with no end in sight |
| `revealed` | title and artist, or the answer; own award; a one-line gap to the player ahead | **every other player's answer and whether it was right**; **every other player's award**; the standings; the 250 px cover art (`coverUrl` is on the wire, `reveal-panel.tsx:48-59` draws it) |
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

## The fields on the wire that nothing renders

`round.index` · `settings.roundCount` · `round.revealedAnswers[]` (`said`,
`isCorrect`) · `round.awards[]` for anyone but you · `players[].score` for
anyone but you · `players[].isConnected` mid-game · `revealedTrack.coverUrl` ·
`choices[].coverUrl` · `round.content.reflex.taps[]` live · `activeBuzz.expiresAt`
for non-buzzers · `round.lockedOutPlayerIds` for others · every `settings.game.*`
the room is playing under · `isHostConnected` outside a running round.

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

**A — the floor.** The round number in the chrome, and the reveal rebuilt: every
player's answer with its verdict, every player's award beside it, the standings
after the round, and the cover art. It is the larger half and by far the more
valuable — today a player finishes a round knowing only whether they scored.

**B — the queue.** The lobby roster with connection state, the floor clock for
everyone rather than the buzzer alone, the running scoreboard mid-round if it
survives the argument above, the reflex heat's live tap count, and the host-gone
signal outside a running round.

Take A first. B is comfort, and some of it will not be built; A is the half
where the phone currently cannot follow the game.
