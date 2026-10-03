# The catalogue beyond the blind test

The blind test is the first game, not the product. The product is a room full
of screens pointed at one of them, and the blind test is what that room does
first. This file was written so the decisions taken while finishing it would not
have to be undone when the second game arrived.

Four have arrived since, and the seams held. What follows is still a map rather
than a schedule: the shapes below, the honest cost of each, and — the part worth
re-reading — which seams are open and which were deliberately left welded.

## What the shell already is

Ignore the word "blindtest" in the package names for a moment and the bootstrap
reads as a generic party-game platform:

| Piece | What it is, generically |
|---|---|
| Room + 4-character code | A joinable session with a code humans can read aloud |
| Host / player socket roles | One screen running the room, N players |
| Session id in `localStorage` | A seat that survives a screen lock |
| Role-scoped message unions | **Hidden information, enforced by the compiler** |
| `encodeChecked` | The runtime half of that: Zod strips what leaked |
| Server-stamped arrival order | **Who was first**, unforgeable |
| Clock handshake | Countdowns that land together on every device |
| Whole-snapshot broadcast | No client ever holds half a state |
| Roster, scores, connection state | The lobby every game needs |
| i18n dictionaries, theme | Shell-level, already namespaced |

Two of those are worth more than the rest. **Role-scoped views** are the
mechanism behind every hidden-information game, not a blind-test detail — a
werewolf's identity and a track's title are the same problem. **Server-stamped
order** is the mechanism behind every race.

## The five shapes

Almost every party game worth building is one of these. The shape, not the
theme, is what costs work.

**1. Buzz-first.** A stimulus on the console, the first press wins, the host
judges. *This is the shape the current engine already implements.* A second game
of this shape is close to free.

**2. Submit-then-vote.** Every player types something, the screen reveals the
answers, everyone votes. Needs a collection phase with a deadline, a reveal that
does not leak authorship, and a vote tally. **This is the biggest reusable thing
missing** — six of the games below want it, which is most of what remains
behind one engine that does not exist yet.

The first game of this shape builds its board and tally inside its own arm of
`round.content` and its own directory of `@taverla/core`, not as a shared
engine. Generalising before there are two cases is the anti-pattern this file
names three times — the second game is what earns the shared shape, and it is
the one that shows which half was the first game's alone.

**3. Hidden role.** Each player gets a private payload, then discussion, then a
vote. Needs per-player private state (the role-scoped views are half of it) and
a phase machine with day/night.

**4. Continuous stream.** A player streams strokes or motion to the screen at
30–60 Hz. **The only shape that breaks "state travels as a whole snapshot"** —
see the warning below.

**5. Team relay.** Two teams, a turn timer, one device passed around. Needs a
team on the player model and a turn owner.

## The catalogue

| Game | Shape | What it needs that does not exist | Appetite |
|---|---|---|---|
| **Blind test** | Buzz-first | — | **shipped** |
| **Buzzer** — the room brings its own content | Buzz-first | — | **shipped** ([stage 11](plans/11-buzzer.md)) |
| **Quiz / trivia** | Buzz-first | — | **shipped** ([12](plans/12-trivia.md), [14](plans/14-question-languages.md)) |
| **Lyrics blackout** — the line is missing, sing it | Buzz-first | Same as the blind test, different reveal | a session |
| **Reflex race** — first to press when the screen flips | Buzz-first | It needed one thing after all: a fair stimulus | **shipped** ([stage 18](plans/18-reflex-race.md)) |
| **Petit Bac** — a letter, six categories, type fast | Submit-then-vote | Scoring by uniqueness | a session |
| **Just One** — everyone writes one clue, duplicates cancel | Submit-then-vote | A clue-collision pass | a session |
| **Qui a écrit ça ?** — answer a prompt, then guess the author | Submit-then-vote | Authorship survives the reveal | a session |
| **Le curseur** (Wavelength) — a spectrum, a secret target, one clue | Submit-then-vote | A shared slider; the target is hidden from all but one | two sessions |
| **Undercover** — same secret word for everyone but one | Hidden role | Per-player payloads, a talk phase, a vote | two sessions |
| **Loup-garou** — the full night/day machine | Hidden role | Phase machine, timers, a narrator screen | the biggest on this list |
| **Deux vérités, un mensonge** | Hidden role | Light: submit three, everyone votes | a session |
| **Qui est le plus susceptible de…** | Submit-then-vote | Voting for a *player* rather than an answer | an evening |
| **Dessine** (Skribbl) — one draws, the others guess | Continuous stream | A stroke channel, a canvas, a word list | two sessions, and read the warning |
| **Time's Up** — three rounds, same cards, less and less speech | Team relay | Teams, turn owner, per-turn timer | two sessions |
| **Bingo de soirée** — a grid of things that will happen tonight | Submit-then-vote | Almost nothing; grids and presses | an evening |

Submit-then-vote is the shape that unlocks the most: six games share it. Their
appetites assume the engine exists, so the first of them also pays for it, and
every one after is a session rather than two plus an engine.

**Reflex race was costed as the cheapest, and the estimate was wrong in an
instructive way.** "Almost nothing; it *is* the buzz" was true of everything
this table measures — no catalogue, no bank, no new phase, no new shape. What it
missed is that a buzz answers *who arrived first* and a reflex race asks *who
reacted fastest*, and the gap between those two is the room's Wi-Fi. Costing it
by what it reuses could not see that, because the thing it needed was not a
feature but a **guarantee**: the stimulus has to happen on each device against
its own clock estimate, defended by a floor rather than by secrecy. That is now
the fifth entry in `docs/realtime-protocol.md`, and the next reflex-shaped game
inherits it.

The lesson for the rest of this table: this column costs *parts*, and a game can
still owe a rule. Ask what a game **measures** before trusting its appetite.

## The quiz, costed — and it needs no database

The instinct is that a quiz needs a question bank, a bank needs storage, and
storage means a database. The first two are true and the third is not: a few
hundred questions are a **file in git**, reviewed in a merge request, loaded
into memory at boot. Rooms were held in memory on the same argument until a deploy ending every party in progress outweighed it — see stage 28.

A database only becomes the answer when questions are **written from inside the
app** — a host composing their own pack on their phone. That is a feature, not
a prerequisite, and it is the one that should be allowed to force the decision.

### Where a question would slot in

The blind test's source picker is the template, and it is more reusable than it
looks. `TrackSource` is `chart | decade | film | playlist | search` — five ways
to fill one pool, chosen in the lobby, committed by the launch. A quiz is the same
picker with different arms, and the shape underneath is already built: the
countdown, the buzz order, the lockout, the verdict, the reveal, the scoreboard.

The fourth and fifth arms are worth reading before adding a sixth, because the
fourth is the one that carries **no catalogue detail at all**. A decade is six words the room
already says, and which Deezer playlists each costs lives in `deezer-client.ts`
with the popularity floors. The alternative — a preset that is really a playlist
id the browser holds — was rejected for what it does to the round trip: a host
who typed that id by hand reopens the picker on the wrong control, and nothing
ties the label to what it fetches. `TrackDifficulty` settled the same argument
first, and the rule it leaves is: **an arm names what the room asked for, never
what the catalogue charges for it.**

The fifth is the one that moved something no arm had moved before: **what the
round asks for**. Every other source hands the room a title and an artist, and
the film arm hands it a film and a composer — a score cue is called `Cornfield
Chase`, which is the one thing at the table nobody can produce. So
`TrackIdentity` gained `film`, `null` on every other arm, and it is the film the
half is measured against wherever it is set. The verdict kept its two field
names on purpose: what each half *is* is a property of the track, and renaming
the wire contract to fix a word on one screen would have been paying the whole
protocol for a label. The screens say *film* and *compositeur*; the schema still
says `titleCorrect`.

It is also the first arm to **overrule a room setting**. Deezer's rank scores
the recording and a score cue carries almost none of a single's, so the whole
composer table holds 135 tracks above `wellKnown`'s floor against 1 155 above
this arm's own — and a difficulty control whose *hard* position leaves 75 tracks
is a control whose room never learns why. The strip is ruled and says so, read
off the **draft** rather than the room, or it would go on claiming to work for a
whole round after the composers were chosen.

So `QuestionSource: hosted | bank | api`, and each arm is a separate size:

**1. `hosted` — the host asks out loud. An evening.** The server serves a round
with *no content at all*: a countdown, the buzzers open, the host reads a
question from a book, a website or their own head, the first press wins and the
host judges it. This is the existing buzzer round minus the track, and it is
mostly deletions — an optional round content, a host panel that says who buzzed
instead of what the track was, and a verdict that is one right/wrong rather than
title-and-artist.

**Since promoted out of this list, built, and named `buzzer`.** Filing it under
`QuestionSource` was the mistake of assuming the content had to be a question.
A server that serves nothing is a buzzer system for *any* animation — a charade,
a "name five", a lesson, a drinking game — and calling it trivia would hang a
content pipeline off something whose whole value is not having one. It shipped
as [stage 11](plans/11-buzzer.md), ahead of the quiz, and it was as nearly free
as this paragraph predicted: the one thing it needed that no other game does is
a lockout the host can clear, because its round has no clip to run out.

`hosted` was the wrong name — it reads as "hosted by us" and means the opposite.
`gameKinds` is `blindtest | buzzer | quiz`.

It is the only game with no content pipeline and no licensing question at all,
and it turns the product into a buzzer system for anything anyone already has. A
family quiz on paper, a pub quiz, a teacher's revision game. The room, the QR
code, the unforgeable buzz order and the scoreboard are the whole value, and
they exist.

**2. `bank` — a curated file, shipped with the server. A session.** A few
hundred French questions in one JSON asset, drawn without repeats exactly as the
track pool is, with categories where the genres are. Honest limits, both fine:
the pool is finite so a heavy evening will repeat, and adding questions means a
deploy. It is the arm that makes the quiz a *game* rather than a buzzer.

**3. `api` — a public trivia service. A session.** The same shape as
`deezer-client.ts`: one adapter, one boundary module, everything above it
speaking the domain.

This ranked last, and the reason was never technical: Deezer works because music
is language-neutral, where trivia is not — the free banks are thin and often
ambiguous in French, and a quiz nobody can answer is a broken game. **That
objection assumed an English-first source.** It does not survive a French-first
one, and [OpenQuizzDB](https://www.openquizzdb.org/) is exactly that. See
[stage 12](plans/12-trivia.md) for what still has to be confirmed before it can
ship — chiefly whether a question arrives with its own wrong answers, which is
what decides whether choice mode is free or unbuildable.

### What it would cost that is genuinely new

Nothing structural for `hosted`. For `bank`, one core rule (drawing without
repeats, which already exists for tracks and should be *shared* rather than
copied) and one adapter. The real work in both is the seam this file already
names: `RoomPhase` is the blind test's life cycle wearing the room's name, and
a second buzz-first game is the moment that costs an hour to fix and never
less.

**The answer modes are more reusable than the table above admits.** Four
choices and a typed answer were built as blind-test modes, and a quiz wants both
— a multiple-choice question *is* the choice mode with a different pool. When
the quiz lands, the mode machinery moves to the shell and the blind test keeps
only what is about tracks.

## An answer mode is not a game

Settled while playing the first one. Four choices on screen and a typed answer
are **modes of the blind test**, not entries in the table above: the pool, the
audio, the countdown, the reveal and the scoreboard are identical, and only who
acts, when the round ends and who decides differ. They live behind
`RoomSettings.answerMode`, and they are stage 09.

The distinction is worth holding. *Reflex race* and *Quiz* really are separate
games of the same shape, because they have no track. A blind test answered by
pressing one of four covers is still a blind test.

What they do change is an assumption everything shipped so far rests on:
**exactly one player acts at a time**. That is the expensive part, not the UI.

## A setting has three possible owners, not two

Stage 11 split settings into "the room's" and "the game's". That is one axis
short, and the missing one is worth naming before anybody writes another
setting:

| Owner | The test | Today |
|---|---|---|
| **The room** | true of any game, in any mode | `countdownMs`, `autoAdvanceMs`, `roundCount` |
| **The game** | true of this game, whatever the mode | `difficulty`, `source`, the round's duration |
| **The mode** | true of this way of answering, whatever the game | `answerWindowMs` — and nothing else yet |

`answerWindowMs` is the one that exposed the gap, and **the `mode` union is
built**. `settings.mode` is discriminated on `kind` beside `settings.game`, for
the same reason: which game the room is playing and how it is answered are
independent choices, and each owns settings the other cannot read.
`answerWindowMs` lives in the buzzer arm alone, so the guard in `registerBuzz`
against a hand-written buzz *is* the narrowing that produces the window — a mode
where nobody buzzes cannot reach it.

**It was built on one field rather than the two the threshold below asked for**,
and that revision is worth more than the rule it broke: the field was in the
wrong *place*, which is a different fault from a missing abstraction. A union
invented for symmetry is premature; a union that makes an unreachable field
unrepresentable pays for itself the day it is written. The cost the old
paragraph feared was real — `answerMode` was read by `registerBuzz`,
`registerAnswer`, `settleSimultaneousRound`, `findBuzzBlocker`, the scoreboard
and three UI branches — and it was one afternoon, against a setting the panel
had to hide by hand in two modes out of three.

**The threshold still holds for the next axis**, with that exception carved out:
one mode-specific field is a documented exception, two are a shape — *unless*
the one field is reachable somewhere it means nothing, which is a type bug and
gets fixed as one.

**The naming smell beside it is fixed.** `clipDurationMs` and
`answerDurationMs` were the same concept — how long a round stays open — under
two names, and both are `roundDurationMs` now, each in its own arm with its own
bounds. The blind test's ceiling is a thirty-second Deezer preview and the
quiz's is a taste call, which is exactly why the field stays per-game instead of
being hoisted to the room. The bare buzzer has no arm for it at all:
`roundDurationMsOf` returns `null`, and a game that serves nothing has nothing
for the room to run out of.

## The seams, and what it costs to keep them open

**Room state and game state were fused, and are not any more.** Stage 11 split
them: `settings.game` and `round.content` are discriminated on `kind`, and the
compiler did walk through the change in an afternoon, exactly as this paragraph
predicted it would once there were two cases.

**`RoomPhase` stays fused.** `lobby → countdown → playing → buzzed → revealed →
finished` is the blind test's life cycle wearing the room's name, and it stays
whole because a phase carries **no field at all** — it is a name. `settings.game`,
`settings.mode`, `round.content` and `Verdict` each split because a field
belonged to one arm and sat on all of them. Splitting a name buys nothing of the
sort, and costs every check in the shell the ability to spell what it is
checking.

The rule is to split it the day a game needs a phase these names cannot carry,
and that day is likelier to arrive as an *addition*: a submit-then-vote game
needs **one** new name, for the room choosing from a board. Not two — its
writing phase *is* `playing`, because "everyone submitting against a deadline"
is what a simultaneous round already means. Adding a member keeps the enum
shared. A drawing game's "everyone is drawing at once" is the same test again,
and still has no equivalent here.

The slate added a name on that argument, `correcting`, and gave it back a stage
later. Marking one item while the rest are still being written
means writing and marking overlap, and a phase is the room's, not an item's: so
the slate lives in `playing` and each item carries `open | closed | marked` on
its own arm of `round.content`. A phase name earns its place when the *whole
room* changes what it is doing; a game whose parts move separately carries the
state on the parts.

**Message names are blind-test verbs.** `player.buzz`, `host.judge`,
`host.reveal`. A frame no other game could receive takes its game's own
namespace (`slate.write`) and the shell keeps `host.startRound` /
`host.endGame`. `HOST_ONLY_MESSAGE_TYPES` partitions by prefix already, so the
guard survives the split.

**Do not dilute the role-scoped unions.** They look like ceremony until the
second hidden-information game, at which point they are the entire anti-cheat
story. A "generic payload" field on the room view would undo them in one commit.

**One snapshot per change holds for four shapes out of five.** A drawing game
streams 30–60 messages a second, and a whole-room snapshot per stroke is
absurd. That game gets its own frame type carrying stroke deltas, and it is the
*only* place a delta is right. Write that down where the next person will read
it, or the rule will get quietly relaxed for everything.

**Routes are already open.** `/host/:code` and `/play/:code` say nothing about
which game is running, because the game is a property of the room, not of the
URL. Keep it that way. What *is* in the URL is the shelf: `/:game` is one page
for every game's front door, and a room opened through one arrives already set
to it — `POST /api/rooms` carries the game when it was asked for.

**The ordinary way in carries none.** The front page opens a room with nothing
chosen and the lobby's picker is where the table decides, which is what
`settings.game` being nullable buys: a room is a code on a screen before it is a
game. See `docs/plans/13-room-first.md`.

**i18n is namespaced by game.** A prefix per game — `blindtest.*`, `buzzer.*`,
`quiz.*`, `reflex.*`, `slate.*` — and `join.*`, `host.*`, `player.*`, `round.*`, `buzz.*`,
`error.*`, `connection.*`, `menu.*` and `preferences.*` for the shell. A new game
adds its own prefix and touches nothing else. The test itself — *would the second
game display this string unchanged?* — is in
[`.claude/rules/i18n.md`](../.claude/rules/i18n.md); what follows is what it has
already decided.

**The trap is `host.*`**: it names a *screen*, and a screen shows both kinds of
string. "Start the game", "Next round", "How to answer" and "Volume" are shell —
every future game has a host console with those, and volume presupposes *audio*
rather than the blind test, so a second game that plays anything reuses it. The
source picker, the genres, the clip length and the title/artist verdict are the
blind test's, and live under `blindtest.*` even though the host console is what
renders them.

**A mode is not a game.** `blindtest.buzz.*` was filed under the game because
only one game had a buzzer; it is `buzz.*` now, because `answerMode` is a *room*
setting and the bare buzzer renders every one of those strings unchanged — the
button, the blockers, "{nickname} buzzed". `blindtest.round` is `round.*` one
level up, because "Round 3 of 10", "+2" and "Nobody got it" are what a *round*
shows in any game.

**The third game moved four more**, and they are the same shape.
`blindtest.answer.*` is `round.answer.*` — the field a *simultaneous round* is
answered in, its label, its send, its "waiting for the others", its "as many goes
as you like" — and the bare buzzer's right/wrong pair is `host.verdict.*`. Two
games needing a string unchanged is the signal; one game plus a hunch is not.

What stays inside a game's prefix is what only that game can say:
`blindtest.reveal.title` is "It was", and a charade has no "it".
`blindtest.answer.bothFound` says "both", and only a pair of halves has two.

**Themes are semantic, so a game can own a colour.** Every component reads
`--accent`, never a hex. A game that wants to be green sets `--accent` on its
root element and the whole surface follows, with no fork of the palette.

**`packages/core` holds both kinds of rule, split by directory.** `time/*`,
`room/*`, `i18n/*`, `round/*` and `scoring/*` are the shell's — including
`pointsFor`, which reads a verdict of either shape. `blindtest/typed-answer.ts`
is the game's, and holds everything that knows an answer has a title and an
artist. A directory, not a package: a boundary with one consumer on each side
buys nothing.

**The package names are already right.** They used to be `@blindtest/*`, which
named the first game rather than the shelf it sits on, and this file said to fix
that exactly once and not twice. That rename happened the day the product got
its name, before the repository was ever published — the cheapest moment it
could have happened, and the second game inherits `@taverla/*` for free.

What is deliberately *not* renamed: the `blindtest.*` translation keys. Those
belong to the game, and a second game brings its own prefix.

## What not to build in advance

A plugin registry. A generic "game SDK". A `packages/games/*` per title. An
abstract `GameEngine` interface with one implementation.

Each of those is the anti-pattern in `.claude/rules/abstraction-boundaries.md`
wearing a different hat: an abstraction invented before the second case exists,
sized to the one case that does. **Two games is when the shape of the shared
part becomes knowable.** Until then the cheapest way to stay open is the one
this file describes — keep the seams visible, and keep the blind test from
growing into places it does not belong.

## Related

- `docs/architecture.md` — how the pieces fit today
- `docs/plans/` — the staged build of the blind test itself
- `.claude/rules/realtime-protocol.md` — the guarantees any second game inherits
