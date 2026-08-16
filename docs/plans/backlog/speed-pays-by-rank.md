## 4 · Speed pays by rank; it should pay by the clock — **done, 15 August 2026**

**What shipped**, against what this entry expected — it was right about the
shape, and wrong about two things it could not see from outside:

- Every recommendation was taken: linear, `MOST_A_SPEED_BONUS_PAYS = 3`,
  continuous inside and rounded once at the end, the **first** banked half
  stamping the blind test's pair, nothing at all for a wrong answer.
- **`firstScoredAt` did not gain a sibling; it changed meaning and name.**
  `scoredAfterMs` is how far into the round the player first banked, and it is
  the only stamp — the wall clock it held was used for the bonus and for the
  award order, and both want the round's clock. The rename is what makes the
  next reader notice.
- **The socket assertions could not simply be rewritten to new numbers.** A
  bonus that falls with real elapsed time makes every total a function of how
  loaded the machine was, and four suites asserted totals. `basePointsFor` in
  the harness takes the clock's share back off, so a rate is asserted as a rate;
  the one assertion left on a total is the one that matters — two players who
  answered in the same breath now score **the same**, where the table always
  separated them.
- **The copy was four strings, not two.** `blindtest.scoring.*` and
  `quiz.scoring.*` each spell the rule out in `choice` and `typed`, in both
  locales, and every one of them said *+2 et +1*. Session 7 inherits their
  register, not their arithmetic.
- **The reveal says what the clock paid**, on the phone: `awardSchema` carries
  `speedBonus` beside `points`, and `+3` now has *dont 2 pour la vitesse* under
  it. The big screen still shows the total alone — placing it there is session
  6's, which owns that composition.
- **The browser pass earned its place again.** The bonus line was first written
  as a `<span>` inside `.you-scored`, and `letter-spacing` inherits as a
  *computed length*: `monument`'s -0.035em of a 12rem number reached a 14px
  caption as nearly seven pixels of negative tracking and folded the sentence
  onto itself. Nothing type-checks that. They are siblings under `.your-award`
  now.

> *Playtest 2 — "si on répond plus vite que les autres, on devrait avoir plus de
> points, pour tous les jeux. Plus on a répondu tôt, plus on a de points, on se
> base sur où en était le chrono."*

**It already exists.** `SPEED_BONUS_BY_RANK = [2, 1]`
(`packages/protocol/src/scoring.ts:48`): +2 to the first player who scores, +1 to
the second, nothing after — ranked among the players who *scored*, so being
quickly wrong takes nobody's bonus. Applied at `round-service.ts:502`, on the
blind test and the quiz, in `typed` and `choice`. The buzzer has none because the
order *is* the buzz. Le Fake has none deliberately, and the reason is written
into the constant: voting fast is voting without reading the board, which is the
half of that round worth having.

That rank bonus is what Adrien asked to replace, and the argument for keeping it
was made and turned down on 15 August 2026: *if the first answers at one second
and the second answers correctly at twenty-nine, the gap between them should be
proportional.* So this session swaps the rank for the clock, on the **quiz and
the blind test**. It is a decision taken against the recommendation recorded in
the constant's own comment, which is why that comment is rewritten rather than
deleted — otherwise the next reader restores the rank as an obvious improvement.

**Not the buzzer, and not Le Fake.** Both were asked about, and both are refused
by the mechanism rather than by taste:

- The **buzzer has no denominator**. `roundDurationMsOf` returns `null` — there
  is no round clock at all, because the host brings the content. Eight seconds
  into a charade acted out over forty is not the same eight seconds as into a
  riddle said in five, and nothing in the room knows the difference. It also
  needs the bonus least: one player takes the floor, so speed is already the
  whole prize.
- **Le Fake** stores no timestamp on a vote
  (`packages/core/src/lefake/tally.ts:10-13`) — a new field, and that part is
  easy. What a curve would pay for is the problem: voting fast is voting without
  reading the board, and on the other half of the round it would pay the lie
  written quickly, when a good lie is the one somebody thought about. Both phases
  push the wrong way.

### The shape

One insertion point, one missing datum, one new rule.

- **The datum.** `bank()` (`round-service.ts:399-413`) stamps `firstScoredAt`
  with a raw `Date.now()`. It has to stamp `elapsedRoundMs(round, now)`
  (`:1047`) instead, or beside it. The round clock **pauses** when the host is
  away (`holdRoundClock`), so `firstScoredAt - runningSince` is wrong for good
  the moment a round was ever held — and that is not a rare case, it is every
  round where a console blinked.
- **The rule.** `speedBonusForRank` in `packages/core/src/scoring/speed-bonus.ts`
  becomes `speedBonusForElapsed({ elapsedMs, roundDurationMs })` or near enough.
  It arrives with the unit test the current one never had: there is no
  `speed-bonus.test.ts` at all, the bonus is covered only at socket level
  (`answer-modes.test.ts:279-329`), and those assertions break with this and have
  to be rewritten rather than relaxed.
- **The call site** is the single line `round-service.ts:502`.

### What the session decides

- **Integers or decimals.** A curve naturally produces decimals and they are ugly
  on a party scoreline — *4.7 points* is not a number anybody says out loud.
  Recommendation: continuous inside, rounded to an integer at the end, so the
  bonus is `0…MAX` and the board still reads.
- **`MAX`, and the shape between the ends.** Linear —
  `round(MAX × (1 − elapsed ÷ duration))` — answers the request exactly: at 1 s
  of 30 the first player takes the whole bonus, at 29 s the second takes none.
  `MAX = 3` keeps it in the same range as the answer itself; larger makes speed
  worth more than being right, which is the failure mode to watch for.
- **Ties stop being broken by arrival.** Two players landing in the same second
  now score the same, where the rank table always separated them. More honest,
  and a real change in how the board reads.
- **Which bank counts on the blind test.** A player who takes the title at 3 s
  and the artist at 20 s has two elapsed times, and the pair is scored once — so
  one of them is the answer. Probably the first; say which, in the code.
- **Nothing changes for a wrong answer.** The bonus is still only paid to players
  who scored: being quickly wrong takes nobody's place.

### It is cheap, but it has a tail

The code is small. What costs is everything that *describes* it. The
`quiz.scoring.*` and `blindtest.scoring.*` hint strings spell the old rule out in
both locales — *"les deux premiers à la trouver gagnent +2 et +1 en plus"* — so
session 7 cannot be written until this lands. And a curve is **less** visible
than a rank bonus was: the reveal shows `+N` per player and never breaks it down,
so a player has no way to see the lead they were paid for, and no way to argue
about it. Making it legible is part of this session rather than an afterthought;
the surface it lands on belongs to session 6.

---

