# Stage 09 — Two more ways to answer

**Goal.** The blind test grows a second and third answer mode: **four choices**
on screen, or a **typed answer**. Everyone answers at once, the server decides,
and how fast you were is worth points.

**Depends on** stages 01–04. Independent of everything else.

## Why this is a mode and not a new game

The pool, the audio, the countdown, the reveal, the scoreboard, the room and the
seats are identical. What differs fits in a table:

| | Buzzer (shipped) | Choice | Typed |
|---|---|---|---|
| Who acts | one player, the first | everyone, once each | everyone, once each |
| Round ends on | the host's verdict | everyone answered, or the clip runs out | same |
| Who decides | the host | the server, exactly | the server, fuzzily |
| What scores | title and artist, 1 each | correct, plus speed | correct, plus speed |

So: `RoomSettings.answerMode: 'buzzer' | 'choice' | 'typed'`, one field in a
schema that already exists. `buzzer` stays the default.

## The shape change, which is the real work

Everything shipped so far assumes **one** player holds the floor. These modes
assume **all** of them act simultaneously, and that ripples:

- `round.activeBuzz` has no meaning; `round.answers` does.
- The playback timer is no longer cancelled by the first action — it runs until
  everyone has answered or it expires.
- The host has no judging step at all. The verdict panel does not appear.
- `findBuzzBlocker` answers the wrong question. It needs a sibling, or a mode
  argument, and the existing tests must keep passing untouched.

## The anti-cheat rule needs restating, not relaxing

Today: *a player is never sent the answer*. In choice mode a player is sent four
candidates and one of them **is** the answer — that is the game, not a leak.

The rule becomes: **a player is never told which one is right.** Concretely,
`playerRoundViewSchema` gains `choices: TrackIdentity[]` in choice mode, the
correct index lives only in the server's `Round`, and `codec.test.ts` grows a
case proving the index never reaches a player frame. Do not weaken
`encodeChecked` to make this easier.

The decoys come from the pool for free — three other tracks the room might
plausibly have heard. Draw them from the same genre chart, never from a
different one, or the right answer is obvious from the odd one out.

## Scoring by speed — decide this deliberately

The server already stamps arrival order, which is the whole mechanism. What is
undecided is the curve, and it changes how the game feels:

- **Rank bonus** — correct is worth 1, the first correct answer earns +2, the
  second +1. Simple, readable on the reveal, and brutal in a big room.
- **Decay** — points fall from 2 to 1 across the clip's length. Smoother, but
  nobody can compute their own score, which costs the arguing that makes a party
  game fun.
- **Flat** — correct is correct. Kills the tension the mode exists for.

Whatever is chosen goes in `packages/core/src/scoring/` with a test, and the
test derives its fixture from the rule rather than from the implementation.

## Typed answers need a matcher, and it is a core rule

Fuzzy matching belongs in `packages/core`, pure and tested. It has to survive
what people actually type:

- case and accents — `Ella elle l'a` vs `ella elle la`
- punctuation and apostrophes, including the curly ones the phone inserts
- the noise Deezer ships in titles: `(feat. …)`, `- Remastered 2011`,
  `(Radio Edit)`
- a plausible typo, which means an edit distance, which means picking a
  threshold and defending it with cases

**Decide whether the artist counts.** In buzzer mode title and artist are worth
a point each. Typing both is a lot on a phone — probably title only, with the
artist as an optional second field.

## Protocol

- `player.answer`, carrying a choice index or a string, and **no timestamp** —
  the same rule as `player.buzz`, for the same reason.
- `round.answers: { atServerTime, playerId }[]` so the room can see who is in
  without seeing what they said.
- The reveal grows per-player answers, which is most of the fun.

## Done when

- A four-choice round scores three phones by speed, and the reveal shows what
  each of them picked
- A typed round accepts `ella elle la` for `Ella, elle l'a (Remasterisé en 2004)`
  and refuses something genuinely wrong, both covered by tests
- No player frame ever says which choice is correct — asserted over a whole
  round's transcript, the way stage 01 does it
- Switching modes between rounds works, and the buzzer mode is untouched
- Verified in a browser with three devices

## Out of scope

Team play, per-player audio (stage 10), a mode that mixes buzzer and choice.
