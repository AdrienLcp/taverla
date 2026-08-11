# Stage 11 — The seam, and the buzzer

**Goal.** Two halves. The first is the seam between the shelf and one game on
it, and it is **built**. The second is the game that proves it: a bare buzzer
with no content at all, which the room supplies itself.

**Depends on** stages 01–04 and 09.

## Where it stands

**Done.** Both halves. The rest of this file is the reasoning, kept because the
next game will need it; read the divergences at the end before trusting a
detail.

Landed in the first half:

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

Landed in the second:

- The `buzzer` game kind, its settings arm, and a `content` arm that carries
  nothing but its own name. `beginRound` opens it with no catalogue call.
- `roundCount` nullable, `answerMode` narrowed by the game, `roundDurationMs`
  under one name in both arms that have one.
- `locksOutOnMiss` and `host.clearLockouts`.
- A verdict union, `halves` | `single` — see the divergences.
- `POST /api/rooms` carries the game, so a room opens on the one whose front
  door the host came through.
- `PROTOCOL_VERSION` 6, `buzzer-game.test.ts`, and a browser pass.

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

### Two room settings that are not every room's

The second game is the first honest test of what this stage called "what every
game needs", and two of the five do not survive it:

- **`answerMode`** — this game is `buzzer` by definition. Four candidates and a
  typed answer both need something to answer *against*, and this one serves
  nothing.
- **`roundCount`** — a host running a charade evening stops when they stop. A
  fixed ten is the blind test's shape wearing the room's name, which is the
  exact mistake this stage exists to undo.

**Fix both here rather than waiting for a third game.** The shelf is the point
of the product, so a second case that disagrees is evidence, not an anomaly —
and the two fixes are small:

- `roundCount` becomes **nullable**: `null` is "until the host ends it". That
  serves the buzzer and every open-ended game after it, and the final board
  already knows how to end on a press.
- `answerMode` **stays on the room**, and the game constrains it: the server
  refuses a mode the current game does not offer, and the panel hides the
  control rather than showing two options that would break the round. It is a
  constraint, not dead weight.

Do **not** move `answerMode` into the game arms. The shell reads it everywhere
that decides how a round is answered and scored — `registerBuzz`,
`registerAnswer`, `settleSimultaneousRound`, the scoreboard — and pushing it
down means narrowing on the game at every one of those call sites to learn
something the room already knows.

### The third owner, and why it stays unbuilt

There is a **mode** axis as well as a room and a game one, and
`docs/game-catalogue.md` now names it: `answerWindowMs` belongs to buzzer mode
rather than to the room, because nothing holds the floor when everyone answers
at once. The panel already hides it outside buzzer mode, which is that truth
expressed as a UI rule instead of as a type.

It stays a UI rule for now. A `mode` union today would have one field in one arm
and two empty ones, which is the same mistake as a `game` union built before the
second game existed. **The trigger is the second mode-specific setting** — how
many candidates choice mode shows, whether typed mode pays partial credit, how
many thumbs a buzzer round takes before it closes. Build it then, and move
`answerWindowMs` into it in the same change.

One naming fix does belong in this stage, though, because it is cheap and the
server currently pays for it: the blind test's `clipDurationMs` and the quiz's
`answerDurationMs` are one concept — how long a round stays open — under two
names, which is why `round-service.ts` has a `roundDurationMs` switch that
exists only to translate between them. Rename both to `roundDurationMs` in their
own arms, each keeping its own bounds, and the switch becomes a projection.

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

### Naming, decided: `buzzer`

`gameKinds` becomes `['blindtest', 'buzzer', 'quiz']` — three common nouns in
one register, and the word the room actually uses for it.

`docs/game-catalogue.md` called it `hosted`, which reads as "hosted by us" in
English and means the opposite. `spoken` was the other candidate and is an
adjective among nouns. The one objection to `buzzer` is that `answerMode` has a
value of the same name, and it does not hold: they are different fields, and for
this game the answer mode is a constraint nobody sets.

## Done when

- ✅ A host opens a room, picks the buzzer, and runs a whole game without the
  server ever holding a question
- ✅ The buzz order is unforgeable, and the floor's clock works in both
  directions
- ✅ The blind test still runs in all three answer modes, unchanged
- ✅ A player who has buzzed can be barred until the host clears it, and
  clearing it is one press
- ✅ Verified in a browser, on a phone and a big screen

## Out of scope

Anything the host would type into the app — a question, a category, a score
adjustment. The whole point is that the room already has the content.

## Where the build diverged from this plan

**The verdict became a union too.** This file said "a verdict that is one claim"
without saying what carried it, and `Verdict` was the blind test's two booleans.
Paying a charade with `{titleCorrect: true, artistCorrect: true}` would have
scored it twice, so `verdictSchema` is now discriminated on `kind` — `halves`
for the blind test, `single` for everything else — and `verdictKindFor` decides
which a game is judged in. The server checks the shape before applying it, for
the same reason it re-checks everything a host socket sends.

`yourVerdict` stayed the `halves` arm alone, because *banking* is what having
two of them means. A game judged on one claim has no half to hold.

**`pointsFor` did not move to the blind test's directory.** Over the union it
covers both games and belongs to the shell, so `scoring/verdict.ts` holds it
with `isMiss`, `verdictKindFor` and `nothingScored`; `scoring/speed-bonus.ts`
holds the rank bonus; and `blindtest/typed-answer.ts` took everything that reads
a title and an artist. The line in this plan predates the union.

**The game is picked before the room exists, not in the lobby.** The shelf
already had one door per game, and `POST /api/rooms` carries which — so the host
lands on a console already set up. The lobby picker exists as well, above
everything it decides, for the table that changes its mind while standing there.

**`shelvedGames` is not `gameKinds`.** The quiz has a settings arm and a content
arm and no server, so it is refused at the door rather than at the first
"start". `beginRound`'s `not_implemented` branch is what that leaves behind, and
it is the exhaustiveness arm rather than dead code.

**The buzzer's strings forced the i18n namespaces open.** `blindtest.buzz.*` and
`blindtest.round` were the *mode*'s and the *round*'s all along; they are now
`buzz.*` and `round.*`, and `blindtest.answerMode.*` is `host.answerMode.*`. The
rule in `.claude/rules/i18n-and-theme.md` was already the right test — this is
the first time it had a second case to answer against.
