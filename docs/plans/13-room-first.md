# Stage 13 — The room comes first

**Goal.** Open a room before deciding what to play. The code goes up, the
players arrive, and the table picks the game while they do.

**Depends on** stage 12 only in its ordering: every screen this touches reads
`settings.game`, and doing it with three games on the shelf meant sweeping all
three in one pass rather than writing two of them twice.

## The flow, before and after

| | Before | After |
|---|---|---|
| `/` | a shelf of cards, and nothing else to press | **Create a room**, join by code, and the shelf as content |
| `/:game` | where every room was opened | a shortcut, for a host who already knows |
| `/host/CODE` | a lobby for a game already chosen | a lobby where the game is chosen, beside the QR code |

`/:game` stays, and stays a page with a button rather than a link that opens a
room on arrival: a GET that mutates is a link preview in a group chat opening
rooms.

## `settings.game` is nullable, and that was the decision

Two honest answers were on the table, and the cheap one was rejected:

- **A default, pre-selected in the picker.** Cheap — `movedToGame` already
  resets the mode and the round count on a switch. Rejected because the lobby
  summary and every phone would name a game nobody chose, and because it cannot
  express "the host is still deciding" at all.
- **`null` until somebody says.** Costlier — roughly fifteen sites take a null
  case — but it buys the thing this repo argues for everywhere else: the guard
  on `host.startRound` **is** the narrowing that makes every downstream call
  type-check, exactly as `registerBuzz`'s guard is what produces the answer
  window.

The second is what shipped. `PROTOCOL_VERSION` goes to 9.

## What the null case turned out to be

Fewer sites than the estimate, because three of them were reading the wrong
field to begin with. **The round knows which game it is** — `round.content` is
one arm of a union, and the server refuses a game switched under a round in
play, so `applyVerdict`, `timeOutBuzz`, the round-actions lockout button and the
stage's own "listening…" all read `round.content.kind` now. `settings.game` is
what the room is set to *next*; the round's content is what is on screen.

The rest answer for a room that has not decided:

- `roundDurationMsOf(null)` is `null` — no round, so nothing to run out
- `locksOutOnMissIn(null)` is `true`, the default nobody can reach
- `answerModesFor(null)` is every mode: nothing narrows them yet, which is what
  lets a settings frame through before the table has decided. The panel still
  shows no strip, because "how to answer" cannot be explained without a game
- `settingsSummary` says only the round count
- `roomSettingsFor(null)` is the shell's defaults and nothing else

## `no_game_chosen`

Its own code rather than `wrong_phase`, because the phase is right — the lobby
is exactly where this happens — and what is missing is a decision the host can
make on the screen they are looking at. The console greys the launch out and
says why; the socket refusal is the rule under it, and
`socket-rules.test.ts` holds both halves.

## Where the picker lives

**In the lobby it is on the stage, beside the QR code. Afterwards it is a
setting.** One control, one place at a time, and the rule is the same sentence
either way: while the room is filling up, the game is the decision everyone is
waiting on; once it is running, changing it is a setting like the countdown.

The lobby's two columns were already two audiences — the invitation is what the
room reads, the roster is the host's own — so the picker joins the host's side,
with the chosen game's pitch under it. That pitch is
`${game}.home.description`, the same string the game's own page shows.

## The player screen has two honest states

"The host is choosing a game", and then "You are about to play *X*" with what
the evening pays. That last sentence used to live on a "waiting for the host"
screen reached between rounds; the lobby is the only moment nobody is against a
clock, so it moved to where the waiting actually happens.

A chat in that space was floated and is **not** in scope.

## Done when

- A room opens from `/` with nothing chosen, and the launch refuses until it is
- The player screen says which of the two states it is in
- A game's own page still opens a room already set to it
- Both games' rounds run unchanged once a game is picked
- Verified in a browser, both locales, muted

## What this did to the journeys

**One journey per door**, rather than a fourth. `full-game.spec.ts` goes through
the front door and picks the game on the console — the ordinary way in, and now
the only automated cover for it — and `everyone-answers.spec.ts` keeps the
shortcut.

That change surfaced a real trap: **both pages carry a "Create a room"**, so a
click that lands before the navigation opens a room with no game, and the
failure appears a minute later at a launch that stays greyed out. The landing is
awaited between the two clicks.
