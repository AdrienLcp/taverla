## 12 · Speed already pays, and nothing in the room says so — **done, 16 August 2026**

> *Note 3 — "gagner plus de points quand on répond bon AVANT. Ça doit être la
> 4ème fois que je te demande ça et c'est toujours pas en place. Il faut peut-être
> un système de points différents (genre on démarre à 30 000 et ça décrémente
> chaque ms ? Ou autre ? Quelles seraient les bonnes pratiques à ce niveau ?)."*

**It is in place**, and this entry exists because that is not the same as it
being true for a room. Session 4 shipped it on 15 August:
`speedBonusForElapsed` (`packages/core/src/scoring/speed-bonus.ts:18-34`) is
called at `round-service.ts:474-530` for every simultaneous round, on the quiz
and the blind test, in `typed` and `choice`. It is linear on the round's own
pausable clock and it has a unit test.

Two things are wrong with it, and neither is the rule.

### It is invisible where the room is looking

The reveal on the **host stage** prefers `round.revealedAnswers` and only falls
through to the `+N` list when that is empty (`reveal-panel.tsx:118-163`).
`revealedAnswers` is non-empty exactly in `typed` and `choice` — the two modes
that pay a speed bonus. So **the big screen shows who said what and never a
single number**, and the one screen that does break the bonus out is the
player's own phone (`player-round.tsx:118-137`, *dont 2 pour la vitesse*), which
only shows it to the player who earned it.

A rule nobody watching the game can see is, for the table, a rule that does not
exist. This half is not optional and it is most of the value.

### The amplitude is four steps and they are invisible too

`MOST_A_SPEED_BONUS_PAYS = 3` (`packages/protocol/src/scoring.ts:67`), rounded
once at the end. Over a 30s round that is **four buckets**: 0–5s pays 3, 5–15s
pays 2, 15–25s pays 1, after that nothing. Against the base scores
(`packages/protocol/src/scoring.ts:5-36`):

| Game and mode | Right answer | With the bonus | Speed is worth |
|---|---|---|---|
| quiz `choice` | 1 | up to 4 | **300%** of being right |
| quiz `typed` | 3 | up to 6 | 100% |
| blind test `typed` | 3 (both halves) | up to 6 | 100% |
| blind test `choice` | 1 | up to 4 | **300%** |
| buzzer, reflex, Le Fake | flat | flat | — (no round clock, or refused by design) |

So in choice mode speed is already worth three times the answer, and it still
does not read — because 4 against 1 on a party scoreline looks like an accident,
not like a rule.

### The practices worth borrowing, and where the note's own proposal breaks

The shape every quiz product converged on is **Kahoot's**:
`points = base × (1 − ½ × elapsed ÷ duration)`, with `base = 1000`. Two
properties are what make it work, and both are worth stealing:

- **Speed is capped at half the answer's value.** Answering at the buzzer still
  pays 500 of 1000. Being right always outranks being fast, at every moment of
  every round — which is the failure mode session 4's own notes flagged and
  which choice mode is currently on the wrong side of.
- **The base is large enough for the difference to be legible.** 1000 against
  780 says *you were faster*; 4 against 3 says *rounding*. The big number is not
  a gimmick, it is the entire mechanism by which a curve becomes visible.

**"30 000 decrementing every millisecond" is the right instinct and the wrong
number**, on two counts worth writing down before somebody builds it:

- 30 000 steps over 30 s means the last three digits are noise nobody can read
  or verify, and a scoreline of 28 447 is not a number anybody says out loud at
  a table. A base in the hundreds or the low thousands, quantised to the nearest
  ten, keeps the whole difference and loses none of it.
- It **reverses a decision taken the day before**. Session 4 deliberately made
  two players who answered in the same breath score the same — "ties stop being
  broken by arrival". A per-millisecond score makes ties impossible again, by
  the back door and with no discussion. That is Adrien's to re-open if he wants
  it; it must not happen as a side effect of picking a scale.

### The one thing that makes this a session and not an hour

**A rescale is shelf-wide or it is incoherent.** If a quiz round pays ~1000 and
a buzzer round pays 1, the five games stop sharing a currency and the scoreboard
stops meaning anything across a mixed evening. So the base scores of the bare
buzzer, the reflex race and Le Fake move with it, or nothing moves. Add to that
every socket suite asserting totals — the harness already has `basePointsFor`
for exactly this reason, see session 4's notes — and the four
`*.scoring.*` strings in both locales, which spell the arithmetic out.

**Recommendation: take the visible half first, on the numbers as they stand.**
Put the award on the host stage's reveal beside the said-answers list, and see
whether a room that can finally *watch* the bonus still wants the scale changed.
The rescale is a real session with a real tail; it should not be paid for a
problem the first half might solve.

### What the session decides

- Whether the base moves at all, and to what — with the constraint that it moves
  for all five games at once.
- Whether the cap becomes explicit (speed never worth more than the answer),
  which changes `choice` mode today whatever the scale ends up being.
- Whether ties survive. They should; say so either way.

### How to tell it is done

- Two players answer the same round eight seconds apart, and **the big screen**
  shows why their numbers differ, in both locales.
- Whatever the scale, a room watching a reveal can state the rule out loud
  without being told it.

### What it found — **done, 16 August 2026**

The recommendation above was taken: the visible half shipped, the cap shipped
with it, **and the base did not move**. The three questions, answered:

- **The base stays.** Nothing in the entry argued the numbers were wrong once
  they could be *seen*, and a rescale moves five games, every socket suite's
  totals and four strings in two locales for a fault the first half may already
  have fixed. It stays re-openable, and the argument for it — that a legible
  curve wants a legible base — is still in this file.
- **The cap is now explicit and it is the whole rule**:
  `speedBonusForElapsed` takes `answerPaid` and pays at most
  `min(MOST_A_SPEED_BONUS_PAYS, answerPaid)`, so the clock can double a score
  and never more. `choice` fell from 300% to 100%, and a fast *half* of a blind
  test answer stopped outscoring a slow whole one.
- **Ties survive**, untouched. The rounding is still the last operation.

The entry's own case for the cap held, and a second one turned up while
building it: **`mode.kind` may change between two rounds** — `revealed` is
deliberately outside `isRoundInPlay` — so a `choice` round paying 4 and a
`typed` round paying 3 land on one board inside one game. The claim that the two
rates are never scored together was simply false.

**The screen is `2 +2`**, not `+4`: what the answer paid, then the clock's share
in the `+N` the product already uses. A total says only that two players differ;
the split is the rule saying itself, which is what the second success criterion
above actually asked for. It sits in `.said` — a fourth column with a fixed
`4.5ch` box, kept on every row once anybody has scored so a miss does not leave
the answers on two right edges. `.scorers` is untouched and never needs it: it
draws only where `revealedAnswers` is empty, which is the buzzer, which pays no
bonus at all.

**One thing was found by playing and was nobody's plan.** The four
`*.mode.*` descriptions in the settings fold spelled the ceiling out — *"the
earlier you find it the more the clock adds — up to +3"* — which the cap made
false in `choice` the moment it landed. They now say **"up to double"** in both
locales, which is the rule rather than a number, and survives the rescale if it
ever comes. The three `*.scoring.*` strings for the buzzer, the reflex race and
Le Fake were checked and are still true: none of those games pays a bonus.

Verified in a browser at 1920 and 414, both locales, both palettes: three
players, a right-fast, a right-slow and a miss, in `typed` and then in `choice`
switched between the two rounds.

---

