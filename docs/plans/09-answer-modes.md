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
plausibly have heard. Draw them from the room's own pool, never from a chart it
did not pick, or the right answer is obvious from the odd one out — and note
that the pool is now several charts merged, so "the same genre" is no longer a
thing a decoy can be drawn from.

## Scoring by speed — decided: rank bonus

The server already stamps arrival order, which is the whole mechanism. The curve
is a **rank bonus**: being correct is worth its own points, and on top of that
the first correct answer of the round earns +2 and the second +1.

Chosen over a decay curve because a player can compute their own score from what
they saw happen, and arguing about it out loud is most of what a party game is
for. Flat scoring was never in the running — it removes the tension the mode
exists to create.

It goes in `packages/core/src/scoring/` with a test, and the test derives its
fixture from the rule rather than from the implementation.

**Left open:** in typed mode an answer can be half right, so "the first correct
answer" needs a reading. The intended one is *the first player to score
anything at all this round*, which keeps one rule across both modes. Confirm it
against a real round before writing it down as settled.

## Typed answers need a matcher, and it is a core rule

Fuzzy matching belongs in `packages/core`, pure and tested.

### Decided: both fields count, and both together are worth more

Two inputs, title and artist, each worth a point on its own — getting only the
artist still scores. Getting **both** adds a bonus point on top, so the round
rewards the player who had the whole thing over the one who recognised a voice.

That is deliberately more generous than the buzzer mode's title-and-artist pair:
typing on a phone against a clock is harder than saying it out loud, and a mode
where half-knowledge scores nothing goes quiet fast.

### Normalising is not optional, and it comes before any distance

Both sides — what the player typed and what the catalogue holds — go through the
same normalisation before anything is compared:

- lowercase, and accents folded — `Ella elle l'a` matches `ella elle la`
- punctuation and apostrophes dropped, including the curly ones a phone inserts
- whitespace collapsed, so `daftpunk` and `daft  punk` land on the same string
- the noise Deezer ships in titles removed: `(feat. …)`, `- Remastered 2011`,
  `(Radio Edit)`

Most "wrong" answers a real room produces are already fixed by this step alone.

### Then, and only then, a tolerance for typos

After normalisation the two strings are usually either identical or genuinely
different — but not always: someone types `bohemian rapsody`, one letter short
of right, and refusing that would feel broken.

So the comparison allows a small number of single-character corrections —
insert, delete, or replace one letter — between what was typed and the answer.
That count is the **edit distance**, and the threshold is how many corrections
are forgiven. It has to be chosen, not guessed, because it cuts both ways: too
forgiving and `love` matches `live`, too strict and a real answer with a slipped
finger is refused.

The threshold scales with length rather than being a flat number — one
correction on a short title, more on a long one — and it is defended by a table
of cases in the test: real near-misses that must pass, and short wrong answers
that must not.

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
- A player who typed only the artist scores, and one who typed both scores more
- No player frame ever says which choice is correct — asserted over a whole
  round's transcript, the way stage 01 does it
- Switching modes between rounds works, and the buzzer mode is untouched
- Verified in a browser with three devices

## Out of scope

Team play, per-player audio (stage 10), a mode that mixes buzzer and choice.
