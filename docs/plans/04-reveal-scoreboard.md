# Stage 04 — Reveal, scores, and the end

**Goal.** The payoff. The track is named, points land visibly, and the game
finishes on something people want a photo of.

**Depends on** stages 01–03. This is the stage that makes it feel like a game
rather than a demo.

## Work

**The reveal** (`features/host/reveal-panel.tsx`). `round.revealedTrack` and
`round.awards` are already on the wire for everyone. The cover art is the
element to build around — it is the only real image in the whole product, and it
arrives from Deezer at 250 px, so plan the layout around that resolution rather
than discovering it at the end.

**Scores that move.** `buildScoreboard` already returns stable competition
ranks — ties share a rank, and the order does not reshuffle between two renders
of the same scores, which matters because this is on a wall for an hour. What is
missing is the transition: a score changing from 3 to 5 should be legible as an
event, not as a different number appearing.

**The phone during a reveal.** It has nothing to do, which is the moment to show
what the player just earned. Do not mirror the host screen — the cover art is
already on the wall.

**End of game** (`features/host/final-scoreboard.tsx`). Podium, the tracks
nobody got, and a way to start another game with the same players — that last
one is the difference between one round of the evening and three.

## Protocol

Probably nothing new. Check whether "play again with the same players" needs a
message: resetting scores and returning to `lobby` while keeping seats is a
server transition, so likely `host.endGame` grows a sibling, or the settings
update covers it.

## Decisions left open

- **Does a wrong answer cost a point?** Currently no — a miss only locks the
  player out. Penalising changes how aggressively people buzz, which is the main
  dial on how this game feels. Try it before deciding.
- **Are title and artist worth the same?** They are today (1 each). Artist is
  usually easier.
- **Does anyone see the answer before the host reveals it?** No — but a host who
  forgets to press reveal stalls the room. Consider an automatic reveal a few
  seconds after the last possible answer.

## Done when

- The reveal shows cover, title and artist, and who scored what
- A score change is visible as a change, not just a new value
- Ties render correctly — two players on 5 are both second, the next is fourth
- The final screen holds up as a photo
- "Play again" keeps the players and their seats, resets the scores
- Verified in a browser, both surfaces

## Out of scope

Persistent history across evenings, sharing results, achievements.
