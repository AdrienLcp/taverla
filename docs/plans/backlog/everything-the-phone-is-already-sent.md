## Everything the phone is already sent

`PRODUCT.md` changed on 19 August 2026. Its first principle used to be *the
phone is a buzzer, not a screen*; it is now **both screens carry the whole
picture, at their own density**, and a player who never looks up must still know
the score, the round, the clock and what just happened. The app does not do that
yet, and this is the measurement of the gap.

**The finding that decides the shape: nothing is missing from the wire.** Every
item below is already inside `PlayerRoomView` and arrives on every snapshot. No
protocol change, no `PROTOCOL_VERSION` bump, no server work. This is a rendering
session, and that is what makes it worth taking now rather than later.

## What the big screen shows and the phone does not

| Phase | On the phone today | Absent, and already sent |
|---|---|---|
| every | own nickname, own score, own rank, room size (`Scoreline`, `player-page.tsx:278-303`); room code as text | **the round number** — `round.index` and `settings.roundCount` are read in `host-console-page.tsx:266-275` and **nowhere** in the player tree |
| `lobby` | game name, one scoring line (`UpNext`, `player-round.tsx:251-273`) | the roster: every nickname, every connection state, the head count. A phone cannot see who else is in the room it just joined |
| `playing` | prompt, one form, an answered count, a progress bar when the game has a duration | **the running scoreboard** (`host-console-page.tsx:526`); the reflex heat's live tap count (`reflex-stage.tsx:66-68`) |
| `buzzed` | the buzzer, disabled with a reason; who buzzed, by name | the floor clock, unless it was you (`player-round.tsx:406`). Everyone else watches a silence with no end in sight |
| `revealed` | title and artist, or the answer; own award; a one-line gap to the player ahead | **the 250 px cover art** (`coverUrl` is on the wire, `reveal-panel.tsx:48-59` draws it); **every other player's answer and whether it was right**; **every other player's award**; the standings |
| `finished` | own rank, full scoreboard | the winner headline |

Two phases are already right and are worth reading before building the others:
**`voting`** and Le Fake's and the reflex race's reveals draw the *same
component* on both surfaces (`RevealedLieBoard`, `ReactionBoard`). They are the
proof that symmetry is cheap when the board is designed once.

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

## "All the information" is not "all of it at once"

The new principle says neither screen is a summary of the other. It does **not**
say the phone draws the host console at 414 px, and building it that way is how
this lands badly: the big screen carries one idea at four metres, and the phone
carries detail at 40 cm for one reader. Same information, different density and
different order — the phone can fold, scroll and rank by *you* in a way the big
screen never can, and that is what it is for.

So this is an **`/impeccable` job before it is a rendering job**, and the
information architecture is the deliverable, not the markup.

## This is two sessions, and here is the seam

**A — the standings and the reveal.** The round number in the chrome, the
running scoreboard mid-round, and the reveal rebuilt: cover art, every player's
answer with its verdict, every player's award beside it. It is the larger half
and by far the more valuable — today a player finishes a round knowing only
whether *they* scored.

**B — the room and the live round.** The lobby roster with connection state, the
floor clock for everyone rather than the buzzer alone, the reflex heat's live
tap count, and the host-gone signal outside a running round.

Take A first. B is comfort; A is the half where the phone currently cannot
follow the game.
