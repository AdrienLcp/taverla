# Stage 17 — a round remembers who was in it

A screen that arrives mid-game keeps its seat and starts playing at the **next**
round. That is the wanted behaviour, and it is not the one the code has: joining
is unguarded in all seven phases, and every predicate that decides whether a
phase can close reads the **live roster**. So a latecomer does not join the
party — they hold it up.

## What is actually wrong

Three symptoms, one cause.

**A latecomer blocks every early close.** `everyoneIsDone` and `everyoneHasActed`
both build their expected set from `[...room.players.values()]` filtered by
`isStillExpected` alone. A player with no attempt makes `.every()` false, so a
round that would have closed the moment the last player answered now runs to its
full deadline. The table sits there. This is the one that is felt.

**A latecomer can act in the round in play.** Buzz, typed answer, pick, lie and
vote are each guarded on phase, round id and mode — never on whether the player
was there when the round opened. Someone who joined during `voting` can score
the two points for finding the truth in a round whose lies they never saw.

**A latecomer keeps a dead buzzer round alive.** `resumeOrReveal` passes
`candidates: [...room.players.values()]` to `hasEligibleBuzzer`, so a round where
everyone present is locked out does not reveal — it waits for the one person who
cannot answer it.

## The fix: the round stamps its roster when it opens

`Round` gains `openedWithPlayerIds`, filled when the phase flips to `playing` —
**not** when the round is created. The countdown is three seconds of a screen
saying "get ready", and a phone that lands inside it is in the round; the stamp
belongs at `startRoundClock`, not at `openRound`.

It is `ReadonlySet<PlayerId> | null` rather than a set that starts empty, and the
`null` is what keeps the countdown honest: an empty set says *nobody is in this
round*, where the truth is that the roster is not decided yet. Every reader gets
the right answer for free — during the countdown nobody has arrived late,
because there is nothing to be late for.

One stamp covers the whole round, Le Fake's `voting` included: the people who
may vote are the people who were there for the writing. A player who was present
and wrote nothing still votes — that stays true, and it is the sentence in
`everyoneHasActed`'s docstring that this stage must not break.

The rule goes in `packages/core/src/round/round-roster.ts`, as two exports
rather than the one this plan first drew:

```ts
hasJoinedAfterStart({ openedWithPlayerIds, playerId })
  === openedWithPlayerIds !== null && !openedWithPlayerIds.has(playerId)

isExpectedInRound({ now, openedWithPlayerIds, participant })
  === !hasJoinedAfterStart(…) && isStillExpected(participant, now)
```

The conjunction is what the two phase-closing predicates read. The bare
predicate is what the four guards and the projection read — and what
`resumeOrReveal` filters its candidates with, because `hasEligibleBuzzer` asks
for a live socket rather than for a seat the room is still waiting on. Feeding
it the grace window would keep a buzzer round open for a phone that cannot
answer it, which is the bug next to the one this stage fixes.

## Protocol

One new error code, `joined_mid_round`, and it earns its place by the rule
[`../realtime-protocol.md`](../realtime-protocol.md) now carries: something sends
it. It is the backstop, not the mechanism — the screen is what should stop a
latecomer acting, and a socket is whatever its owner makes it.

The player's round view gains `joinedAfterStart: boolean`. It is a *player* field
and never a host one, in the shape `yourVerdict` and `yourCandidateId` already
established: the answer to "what is this round to **you**".

## Files

| File | Change |
|---|---|
| `apps/server/src/domain/room/room.ts` | `openedWithPlayerIds` on `Round` |
| `apps/server/src/domain/round/round-service.ts` | stamp in `startRoundClock`; `everyoneIsDone`, `everyoneHasActed`, `resumeOrReveal` read it; refuse in `registerBuzz`, `registerAnswer`, `registerLie`, `registerVote` |
| `packages/core/src/round/round-roster.ts` | the rule, with its test |
| `apps/server/src/__tests__/mid-game-join.test.ts` | the four scenarios below, at socket level |
| `packages/protocol/src/error-code.ts` | `joined_mid_round` |
| `packages/protocol/src/room.ts` | `joinedAfterStart` on the player round view |
| `apps/server/src/domain/room/room-view.ts` | project it |
| `apps/game/src/features/player/player-round.tsx` | the screen for the state |
| `presentation/i18n/dictionary-{en,fr}.ts` | `error.joined_mid_round`, the screen's strings |

## Decisions the session settled

- **The screen carries one idea: *when*.** `Au prochain tour` in `billboard`,
  and one line under it saying the seat is safe. It sits below the reveal and
  the final board in `PlayerRound`, so a latecomer still sees what the round
  turned out to be — it is in the room for that.
- **No scoreboard on it**, against what this plan first asked for. Two things
  the plan did not know: `Scoreline` and `RoundClock` are rendered by
  `player-page.tsx` *above* `PlayerRound`, so the room's size and the round's
  own draining bar are already on the screen — the wait was legible for free.
  What is left is a ranking the big screen in the same room is already showing,
  and repeating it here asks the one player who has not seen the game yet to
  look down at their phone instead of up at the table. That is the product's
  first principle, in the one place it would have been easy to lose.
- **The two strings carry a non-breaking space** between the article and its
  noun (`ce tour`, `this round`). Without it both locales broke the
  line after the article at every width from 320px up.
- **The host's roster does not mark them.** A 0-score latecomer ranks equal-last
  with somebody who played five rounds and scored nothing; the browser pass gave
  no reason to change that.

## How to tell it is done

- Four players in a typed round, a fifth joins mid-clip: the round still closes
  the moment the original four are done, and the fifth's screen says they are in
  from the next round rather than offering a field.
- Le Fake, a player joins during `voting`: no vote from them, the phase closes
  on the writers, and they score nothing that round.
- A buzzer round where every seated player is locked out reveals, even with a
  phone that joined after the lockouts.
- The next round opens and the latecomer plays it like anybody else.
- A browser pass on a phone-width viewport, muted.

All five hold. The first four are `mid-game-join.test.ts`, which goes red on all
six tests when the stamp alone is removed; the last was driven at 320, 414 and
1920 in both locales and both palettes, on a quiz room so that nothing could
play a note.
