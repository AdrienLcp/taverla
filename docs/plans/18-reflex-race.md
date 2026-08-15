# Stage 18 — Reflex race, the fifth game

> **Session A is done**: the game is served, tested and correct, and no room can
> be opened on it — `reflex` is in `gameKinds` and deliberately not in
> `shelvedGames`. **Session B is the screens**, and starts with `/impeccable`.
> What follows is the plan as written, with the four places reality diverged
> marked inline and the leftovers gathered under *What session B has left*.

The screen flips, the first thumb wins. No content, no question, no judging —
`docs/game-catalogue.md` costs it at *an evening* and calls it the cheapest thing
left on the shelf, because it is the buzz already built with a colour change
instead of a clip.

It is also the first game whose fairness the four guarantees do not cover, and
that is the part worth doing carefully. Everything else is the checklist.

## The one hard problem: where the stimulus happens

Buzz order is stamped on arrival at the server, which is what makes "who was
first" unforgeable. That measures *arrival*, and a reflex game needs
**reaction** — arrival minus the moment the screen flipped. Two ways to have
one, and only one of them is fair:

- **Broadcast the flip.** Every phone flips when the frame lands, so a player on
  a slow link sees it late and their reaction time carries their latency. The
  race is won by the best Wi-Fi in the room.
- **Send `flipsAt` as a server timestamp** and let each device flip locally
  against its own estimated offset — exactly what `countdown` already does, and
  the reason `clock-sync.ts` exists. Latency drops out of the measurement.

The second is right, and it hands a scripted client the flip time in advance.
The answer is not to hide it: **a buzz that arrives less than 100 ms after
`flipsAt` is a false start.** Human simple reaction to a visual stimulus does
not go below about 150 ms, so the floor costs an honest player nothing and makes
scheduling a tap self-defeating — the scheduled buzz lands too early and is
refused as a false start, and jitter is the only thing that could save it.

Write that in `docs/realtime-protocol.md` when it lands: it is a fifth guarantee
in the same family, and the next reflex-shaped game inherits it.

## The round

`playing` opens with a wait of **2–6 s, drawn per round** — long enough that
anticipation does not pay, short enough that nobody looks away. `flipsAt` is
`playing`'s start plus the draw, and it is on both views: the player needs it to
flip, and hiding it buys nothing once the floor above exists.

A false start — a buzz before `flipsAt`, or inside the 100 ms — locks the player
out for the round, and the round carries on for everyone else. The first legal
buzz wins the round outright: no host judgement, because being first **is** being
right. That makes it the only game on the shelf whose round settles without a
verdict, and `applyVerdict` is not on its path at all.

Answer mode: `buzzer` and nothing else, the same narrowing the bare buzzer does.
`roundDurationMs` is `null` — the round ends when somebody wins it.

> **Diverged — the heat does not end on the first thumb.** The plan said so
> twice, and its own acceptance test contradicted it: *three phones, and the
> reaction times ordered the way the room saw it happen* is a board, and a heat
> that closes on the winner only ever holds one number. Adrien took the call.
> **The first legal tap takes the point; the heat closes when everyone expected
> in it has acted** — tapped or false-started — exactly the way a simultaneous
> round does, and everybody gets their own time.
>
> That needed a backstop the plan had no room for, because one phone face down
> on the table would otherwise hold the heat open with nothing to end it.
> `TAP_WINDOW_MS` is it: the heat closes that long after the flip whatever else
> happens. So `roundDurationMsOf` **is** `null` for this game and the round runs
> on a clock anyway — the wait is drawn per round, so the settings could never
> have said how long a heat lasts, and `openPhaseDurationMs` assembles it off the
> round instead. Both are true at once, and that seam is the first thing to read
> if this ever looks wrong.

## The checklist

**Compiler-forced.** Add `'reflex'` to `gameKinds` and `tsc` names exactly five:
`DEFAULT_GAME_SETTINGS` (`protocol/game.ts:160`), `DEFAULT_ROUND_COUNT`
(`core/room/room-settings.ts:24`), `answerModesFor` (`core/room/game-modes.ts:45`),
`scoringKey` (`game/presentation/i18n/translation.ts:78`, and through `BuiltKey`
both dictionaries), and `roundDurationMsOf` (`protocol/game.ts:96`) because the
settings arm carries no `roundDurationMs`. Adding the two `roundContentSchema`
arms breaks two more — `helpers/round-content.ts:58` and
`features/player/answer-forms.tsx:62`. Adding to `shelvedGames` breaks the three
key builders at `translation.ts:99–109`, which is what forces `reflex.name`,
`reflex.tagline` and `reflex.home.description` into both locales.

**Silent — nothing will tell you.** Work these by hand, in this order:

| Where | What happens if it is missed |
|---|---|
| `round-conductor.ts:53–174` `beginRound` | falls into the blind test's Deezer draw |
| `room-view.ts:45` / `:171` | both content projections fall through to blindtest |
| `host-console-page.tsx:296–323` | the playing stage renders nothing |
| `settings-panel.tsx:297–412` | no controls at all |
| `reveal-panel.tsx:28–89`, `player-round.tsx:358–386` | bare scoreline |
| `player-round.tsx:155–215` | the player gets the generic `<Buzzer>` |
| `verdict-panel.tsx:120–138` | non-exhaustive **today** — it is already missing `lefake` |
| `game.ts:113/127`, `core/scoring/verdict.ts:22` | `locksOutOnMissIn` → `true`, `playsAudioIn` → `false`, `verdictKindFor` → `'single'` — all three happen to be right here |
| `shelvedGames` | invisible on the shelf, the picker and `/:game` — **add it last** |

The buzzer is the reference throughout: content arms of `{ kind: 'buzzer' }`, a
13-line `beginRound` branch, one `Switch` of settings, seven strings.

**Tests.** `game-modes.test.ts`, `room-settings.test.ts` and
`settings-summary.test.ts` iterate the enum and cover a new game for free — they
are also where a missing default fails first. Write
`apps/server/src/__tests__/reflex-game.test.ts` from `buzzer-game.test.ts`. The
false-start floor is a `packages/core` rule with a test of its own, broken on
purpose once.

**No e2e.** Nothing in `e2e/` enumerates games, and Le Fake did not get a journey
either. Add one only if the flow turns out to be new.

## What session A settled

- **The reaction time is not a field.** It is `atServerTime` minus `flipsAt`,
  and both halves are already on the round — a third number could only disagree
  with them. So `Award` is untouched, and the shell gained nothing for one game.
- **The taps live in the game's own arm**, not in `round.answers`. `answers` is
  projected from the attempts a graded round accumulates, and a tap is graded by
  nobody. Le Fake had already made the same move with `votedPlayerIds`.
- **A false start is `lockedOutPlayerIds` and nothing else.** In this game the
  lockout has exactly one cause, so the reveal can read the two lists as *who
  reacted* and *who jumped*. `false_start` is its own error code, deliberately
  outside `BuzzRejection` — the refusal changes the round, where every other one
  only answers the phone.
- **`flipsAt` is derived, not stored.** The model holds `flipDelayMs`; the view
  adds it to `round.startsAt`. One answer to when a round starts.
- **`closeRound` moved into `round-service.ts`** and routes on the content
  before the mode. That is the trap this game sets: it is buzzer-moded and
  settles like a simultaneous round, so the old `mode === 'buzzer'` branch — in
  two places — would have revealed a heat without paying anybody.
- **The harness only posts a game the door has.** `openRoom` filters on
  `shelvedGames`, which is how a served-but-unshelved game is reachable at all,
  and it will keep working unchanged when `reflex` joins the list.

## What session B has left

Start with `/impeccable`: the whole game is one visual event on a screen the
room is staring at, and the waiting state, the flip and the false start are
three screens rather than one.

- The eight silent sites in the table above, in that order.
- Both dictionaries. `reflex.scoring` already exists in each — it was
  compiler-forced by `scoringKey`. Putting `reflex` in `shelvedGames` is what
  forces `reflex.name`, `reflex.tagline` and `reflex.home.description`.
- **`shelvedGames` last**, which is what makes the game visible on the shelf,
  the picker and `/:game`.
- A browser pass, muted, at phone width and on the console.

Two decisions still open, and both are the design pass's rather than Adrien's:

- **What the flip looks like**, including whether a false start is a state the
  screen holds or a moment it plays.
- **Whether the wait is a setting.** 2–6 s is a guess. It becomes a host control
  only if a room asks for it.

## How to tell it is done

The last four are green in `reflex-game.test.ts` and `packages/core/src/reflex/`
at the protocol level; what session B owes is the same list seen on a screen.

- A room opens on `/reflex`, three phones join, the screen flips and the first
  thumb takes the round — with the reaction times ordered the way the room saw
  it happen. **Session B.**
- A tap before the flip locks that player out and does not end the round.
- A scheduled tap at `flipsAt` is refused as a false start.
- Two devices on the same round see the flip at the same wall-clock moment.
- A browser pass, muted, at phone width and on the host's screen. **Session B.**
