# The catalogue beyond the blind test

The blind test is the first game, not the product. The product is a room full
of phones pointed at one screen, and the blind test is what that room does
first. This file exists so the decisions taken while finishing it do not have to
be undone when the second game arrives.

Nothing here is scheduled. The blind test ships first, whole. What follows is a
map of where the seams are, so that finishing it does not weld them shut.

## What the shell already is

Ignore the word "blindtest" in the package names for a moment and the bootstrap
reads as a generic party-game platform:

| Piece | What it is, generically |
|---|---|
| Room + 4-character code | A joinable session with a code humans can read aloud |
| Host / player socket roles | One big screen, N phones |
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

**1. Buzz-first.** A stimulus on the big screen, the first thumb wins, the host
judges. *This is the shape the current engine already implements.* A second game
of this shape is close to free.

**2. Submit-then-vote.** Every phone types something, the screen reveals the
answers, everyone votes. Needs a collection phase with a deadline, a reveal that
does not leak authorship, and a vote tally. **This is the biggest reusable thing
missing** — six of the games below want it.

**3. Hidden role.** Each player gets a private payload, then discussion, then a
vote. Needs per-player private state (the role-scoped views are half of it) and
a phase machine with day/night.

**4. Continuous stream.** A phone streams strokes or motion to the screen at
30–60 Hz. **The only shape that breaks "state travels as a whole snapshot"** —
see the warning below.

**5. Team relay.** Two teams, a turn timer, one device passed around. Needs a
team on the player model and a turn owner.

## The catalogue

| Game | Shape | What it needs that does not exist | Appetite |
|---|---|---|---|
| **Blind test** | Buzz-first | — | shipping |
| **Quiz / trivia** | Buzz-first | A question bank instead of a track pool — [costed below](#the-quiz-costed-and-it-needs-no-database) | an evening to a session |
| **Lyrics blackout** — the line is missing, sing it | Buzz-first | Same as the blind test, different reveal | a session |
| **Reflex race** — first to tap when the screen flips | Buzz-first | Almost nothing; it *is* the buzz | an evening |
| **Le Fake** (Fibbage) — write a fake answer, fool the others | Submit-then-vote | Phase 2 in full | two sessions |
| **Petit Bac** — a letter, six categories, type fast | Submit-then-vote | Phase 2, plus scoring by uniqueness | two sessions |
| **Just One** — everyone writes one clue, duplicates cancel | Submit-then-vote | Phase 2, plus a clue-collision pass | a session after Fibbage |
| **Qui a écrit ça ?** — answer a prompt, then guess the author | Submit-then-vote | Phase 2, plus authorship hiding | a session after Fibbage |
| **Le curseur** (Wavelength) — a spectrum, a secret target, one clue | Submit-then-vote | A shared slider; the target is hidden from all but one | two sessions |
| **Undercover** — same secret word for everyone but one | Hidden role | Per-player payloads, a talk phase, a vote | two sessions |
| **Loup-garou** — the full night/day machine | Hidden role | Phase machine, timers, a narrator screen | the biggest on this list |
| **Deux vérités, un mensonge** | Hidden role | Light: submit three, everyone votes | a session |
| **Qui est le plus susceptible de…** | Submit-then-vote | Voting for a *player* rather than an answer | an evening |
| **Dessine** (Skribbl) — one draws, the others guess | Continuous stream | A stroke channel, a canvas, a word list | two sessions, and read the warning |
| **Time's Up** — three rounds, same cards, less and less speech | Team relay | Teams, turn owner, per-turn timer | two sessions |
| **Bingo de soirée** — a grid of things that will happen tonight | Submit-then-vote | Almost nothing; grids and taps | an evening |

If only one is built next, **Le Fake**. It pays for the submit-then-vote engine,
and five other games then cost a weekend each.

That is the answer to "which unlocks the most". It is not the answer to "which
is cheapest", and the quiz is cheap enough to be worth stating separately.

## The quiz, costed — and it needs no database

The instinct is that a quiz needs a question bank, a bank needs storage, and
storage means a database. The first two are true and the third is not: a few
hundred questions are a **file in git**, reviewed in a merge request, loaded
into memory at boot. `room-store.ts` already argues the same thing about rooms.

A database only becomes the answer when questions are **written from inside the
app** — a host composing their own pack on their phone. That is a feature, not
a prerequisite, and it is the one that should be allowed to force the decision.

### Where a question would slot in

The blind test's source picker is the template, and it is more reusable than it
looks. `TrackSource` is `chart | playlist | search` — three ways to fill one
pool, chosen in the lobby, committed by the launch. A quiz is the same picker
with different arms, and the shape underneath is already built: the countdown,
the buzz order, the lockout, the verdict, the reveal, the scoreboard.

So `QuestionSource: hosted | bank | api`, and each arm is a separate size:

**1. `hosted` — the host asks out loud. An evening.** The server serves a round
with *no content at all*: a countdown, the buzzers open, the host reads a
question from a book, a website or their own head, the first thumb wins and the
host judges it. This is the existing buzzer round minus the track, and it is
mostly deletions — an optional round content, a host panel that says who buzzed
instead of what the track was, and a verdict that is one right/wrong rather than
title-and-artist.

Worth building **first**, and not only because it is nearly free: it is the only
arm with no content pipeline and no licensing question at all, and it turns the
product into a buzzer system for any quiz anyone already has. A family quiz on
paper, a pub quiz, a teacher's revision game. The room, the QR code, the
unforgeable buzz order and the scoreboard are the whole value, and they exist.

**2. `bank` — a curated file, shipped with the server. A session.** A few
hundred French questions in one JSON asset, drawn without repeats exactly as the
track pool is, with categories where the genres are. Honest limits, both fine:
the pool is finite so a heavy evening will repeat, and adding questions means a
deploy. It is the arm that makes the quiz a *game* rather than a buzzer.

**3. `api` — a public trivia service. A session, and the least appealing.** The
same shape as `deezer-client.ts`: one adapter, one boundary module, everything
above it speaking the domain. The reason it ranks last is not technical. Deezer
works because music is language-neutral; trivia is not, the free banks are thin
and often ambiguous in French, and a blind test nobody can answer is a broken
game — the same rule that set the popularity floor applies here and is harder to
satisfy.

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
tapping one of four covers is still a blind test.

What they do change is an assumption everything shipped so far rests on:
**exactly one player acts at a time**. That is the expensive part, not the UI.

## The seams, and what it costs to keep them open

**Room state and game state are fused today.** `RoomPhase` is
`lobby → countdown → playing → buzzed → revealed → finished`, which is the blind
test's life cycle wearing the room's name. The fix, when it comes, is a `game`
field on the room carrying a discriminated union on `kind`, with `lobby` and
`finished` staying on the room where they belong. *Do not do this now* — a union
of one is noise, and the compiler will walk through the change in an hour when
there are two.

**Message names are blind-test verbs.** `player.buzz`, `host.judge`,
`host.reveal`. When a second game lands, its messages take its own namespace
(`fake.submit`, `fake.vote`) and the shell keeps `host.startRound` /
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
URL. Keep it that way; the lobby becomes a game picker.

**i18n is already namespaced.** `blindtest.*` is the only game-owned prefix;
`join.*`, `host.*`, `player.*`, `error.*`, `connection.*` and `preferences.*`
are shell. A new game adds its own prefix and touches nothing else.

The partition is by **who would reuse the string**, not by which screen renders
it — `host.*` names a screen, and the host console shows both kinds. The source
picker, the genres, the clip length and the title/artist verdict moved to
`blindtest.*` for exactly that reason, while "Start the game" and "Volume"
stayed. Inside `blindtest.*`, one answer mode's strings take the mode as their
next segment (`blindtest.buzz.*`), which is what keeps stage 09's two new modes
from colliding with the buzzer's. The full test is in
`.claude/rules/i18n-and-theme.md`.

**Themes are semantic, so a game can own a colour.** Every component reads
`--accent`, never a hex. A game that wants to be green sets `--accent` on its
root element and the whole surface follows, with no fork of the palette.

**`packages/core` holds both kinds of rule.** `time/clock-sync`, `room/room-code`
and `i18n/locale` are cross-game; `round/buzz-eligibility` and `scoring/*` are
the blind test's. When the second game lands, split them **by directory**, not
by package — a package boundary with one consumer on each side buys nothing.

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
