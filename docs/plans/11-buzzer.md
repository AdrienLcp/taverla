# Stage 11 — The seam, and the buzzer

**Goal.** Two halves. The first is the seam between the shelf and one game on
it, and it is **built**. The second is the game that proves it: a bare buzzer
with no content at all, which the room supplies itself.

**Depends on** stages 01–04 and 09.

## Where it stands

**The seam is built. No second game exists yet.** `beginRound` answers
`not_implemented` for any game that is not the blind test, which is the honest
marker of what is missing.

Landed:

- `settings.game` and `round.content`, discriminated on `kind`, with the whole
  cascade — plus two things this file did not anticipate. The host's secret half
  became one `currentContent` union rather than staying `currentTrack` +
  `currentAudioUrl`, because a game with a question needs it the way the blind
  test needs the track. And `audioStartsAt` / `playbackElapsedMs` became
  `startsAt` / `roundElapsedMs`: a question appearing is as much a round opening
  as a first note is.
- `answerWindowMs`, and with it the whole idea that the floor a buzz takes has a
  clock. It belongs to the room rather than to a game — every game with a buzzer
  wants it, and this one is nothing but buzzers.
- `PROTOCOL_VERSION` 5.

Left: the buzzer game itself, below.

## The seam, and its exact shape — built

`RoomSettings` and `RoundView` were the blind test's, wearing the room's name.
Three fields were the game's rather than the room's — `difficulty`,
`playbackDurationMs`, `source` — and three more on the round: `audioStartsAt`,
`choices` typed as tracks, `revealedTrack`.

The fix was one discriminated union in each place, keyed on the game:

```ts
RoomSettings = {
  answerMode, answerWindowMs, autoAdvanceMs,
  countdownMs, roundCount                              // the room's
  game: { kind: 'blindtest', … } | { kind: … , … }     // the game's
}
```

and the same on the round's content. `lobby` and `finished` stay on the room,
where they belong; every other phase keeps its name, because a countdown is a
countdown and a reveal is a reveal in every game so far.

**What must not happen:** a `Record<string, unknown>` payload, a plugin
registry, or a `GameEngine` interface. Two implementations is enough to see the
shape and not enough to abstract it. Three would be the moment to look again.

## The buzzer, and why it is a game rather than a mode

The room supplies the content. The host runs a charade, a "name five", a pub
quiz off a sheet of paper, a lesson, a drinking game — the server never learns
what the question was and does not need to. What it guarantees is the only
thing a room cannot do for itself: **who pressed first**, unforgeably.

It is not a mode of the blind test, and it is not a mode of trivia. Both of
those *serve* a stimulus; this one serves nothing. Filing it under either would
mean carrying a content pipeline it has no use for, and it would hide the fact
that it is the one game on the shelf with no licensing question, no catalogue,
and no network call.

### What it forces us to look at

The second game is the first honest test of what stage 11 called "what every
game needs", and it disagrees with two of the five:

- **`answerMode`** — this game is `buzzer` by definition. Four candidates and a
  typed answer both need something to answer *against*.
- **`roundCount`** — a host running an evening decides when to stop. A fixed ten
  is the blind test's shape, not the room's.

Both can simply be ignored by a game that does not use them, and the settings
panel already hides controls a game has no use for. Do that first, and note here
if it starts to read as a lie rather than as a default — the moment a *third*
game disagrees with the same fields is the moment they move.

### What is genuinely new

- **A lockout the host owns.** The blind test's lockout lasts one round, because
  a round is one track. Here the host decides: a setting for whether a player
  who has already buzzed may buzz again, and a `host.*` message that clears it
  when they want a fresh field. That is the one piece of state this game has
  that no other does.
- **A round with no content.** The `content` union gains an arm that carries
  nothing but its `kind`, and the host console shows who buzzed instead of what
  the track was. This is mostly deletions.
- **A verdict that is one claim.** Right or wrong, one point, rather than title
  and artist judged independently. `pointsFor` is the blind test's and should
  move to its own directory as part of this.

### Naming, undecided

`docs/game-catalogue.md` calls the arm `hosted`, which reads as "hosted by us"
in English and means the opposite. `spoken` is the candidate — the content is
said, not served. Decide before writing the union arm; renaming a discriminator
later is a protocol bump.

## Done when

- A host opens a room, picks the buzzer, and runs a whole game without the
  server ever holding a question
- The buzz order is unforgeable, and the floor's clock works in both directions
- The blind test still runs in all three answer modes, unchanged
- A player who has buzzed can be barred until the host clears it, and clearing
  it is one press
- Verified in a browser, on a phone and a big screen

## Out of scope

Anything the host would type into the app — a question, a category, a score
adjustment. The whole point is that the room already has the content.
