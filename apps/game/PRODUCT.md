# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

People in the same room, at the same time, each on a screen of their own. Two
audiences that must both be served, confirmed as equally important:

- **Adult friends at an evening party** — noise, drinks, half-attention, people
  standing up and shouting answers across the room.
- **Families with mixed ages** — children and grandparents in the same game,
  which is the stricter of the two constraints and the one that decides the
  tone.

Nobody installs anything. One person runs the game on a screen; everyone else
joins from whatever they have to hand — a phone by QR code, a laptop by typing
the four characters on the host screen. **A phone is the common case, never the
contract**, and nothing user-facing may name the device.

There are two distinct jobs:

- **The host** sets the game up, starts each round, and judges answers. They are
  standing, holding nothing, and looking up at the room as often as at the
  screen.
- **The players** wait, recognise a track, and hit a buzzer. They are looking at
  the big screen or at each other, not at their own phone, and they touch it
  with one thumb without looking down.

## Product Purpose

Turn a room full of phones into a party game with no setup, no install and no
accounts. Success is the moment nobody is looking at their phone as a phone —
they are looking at each other, and the phone is just a buzzer.

The blind test is the first game, not the product. The product is the room: a
code read aloud, a QR code scanned, seats that survive a locked screen, and a
scoreboard everyone can see.

## Positioning

The whole game runs on one origin with no install, no account and no app store.
A phone that scans the QR code is playing four seconds later, and a phone that
locks its screen comes back to the same seat with the same score.

The order of a buzz is decided by the server on frame arrival, never by a
timestamp the client sends. That is what makes the race honest, and it is the
mechanism the whole catalogue of future games inherits.

## Operating Context

- **The host screen is whatever is nearest** — a laptop on the coffee table, a
  TV or projector across the room, or even a second phone. Confirmed: all three
  must work. The reading distance therefore ranges from 40 cm to four metres,
  and the layout has to hold at every width from a phone to a television.
- **The room is often dark.** Living-room lighting, evening, sometimes only the
  screen itself.
- **The phone is held one-handed and looked at rarely.** Size and position of
  the buzzer matter more than anything drawn on it.
- **Party Wi-Fi is bad Wi-Fi.** Anything that blocks first paint costs a player
  the first round.
- **The cover art is the only real image in the product,** and it arrives from
  Deezer at 250 px. Design around that resolution rather than fighting it.

## Capabilities and Constraints

- One room, a four-character code from an alphabet with no confusable glyphs,
  up to 24 players.
- One game today: the blind test, judged by the host after a buzz. **It is
  planned to grow answer modes** — four multiple-choice answers, and a typed
  answer scored by the server — so the game's own name has to survive more than
  one way of answering.
- More games are planned beyond it; the room, the roster, the seats, the clock
  and the anti-cheat are the shared shell. See `docs/game-catalogue.md`.
- Audio only ever plays on the host screen. Twelve phones playing the same clip
  milliseconds apart is a mess, and this is deliberate and permanent.
- Rooms live in one server process and do not survive a restart. Accepted: the
  host would have to re-share the QR code anyway.
- Tracks come from Deezer, filtered by a popularity floor so the room can
  actually name what it hears. Thirty-second previews, signed with an expiry.
- Two locales, English and French, and two themes, dark and light.

## Brand Commitments

- **"Blind test" is the name of this game**, and it must keep working once the
  game has several answer modes.
- **The product that hosts the games is called `Taverla`.** From *taverne* /
  *tavern*, a word both languages already own, and the place people have always
  gathered to play. `taverla.com` and `taverla.fr` are both free as of
  2026-08-09 and should be registered before anything is published under the
  name. Known noise, judged not to be a conflict: a small Mexican candle maker
  ("Velas Taverla") and a surname.

  **`Blind test` remains the name of the game.** The product name lives where
  the shelf is addressed rather than where a game is played: the wordmark on the
  home page, the document title, and what a shared link unfurls into. No game
  screen carries it, and none should — a player who scanned a QR code is in a
  blind test, not in Taverla.

  Still owed before committing commercially: INPI and EUIPO. Everything below
  was a registry and web check, never a trademark clearance.

- Constraints the name had to satisfy, kept because the next one will need them:
  - **invented, by preference** — a coined word rather than an existing one;
  - two or three syllables;
  - easy to say and to take in for a French speaker *and* an English speaker.
    The spelling does not have to be identical in both languages; the ease does;
  - **nothing sound- or music-derived.** Not every game on this shelf will have
    audio, and a name that promises music would date on the second title;
  - not already taken;
  - **its `.com` must be free.** Added after `Kermo` turned out to be a singer
    and every shortlisted five-letter `.com` turned out to be registered.

  What that last rule costs, measured rather than assumed: of thirteen
  pronounceable coined `.com` domains checked against the registry, **one** was
  free. Alternative TLDs are the other way out and they are not free either —
  `.io` runs several times a `.com` per year and `.gg` five to eight times.

  Rejected as taken: *Kalido*, *Hopla*, *Kermo*, *Konvi*, *Panora*, *Kervo*,
  *Kerlo*, *Kalto*, *Marelo*, *Kelmo*, *Kesmo*, *Salko*, *Kovio*. Rejected on
  the music constraint: *Fanfare*, *Farandole*, *Ricochet*, *Charade*. Rejected
  on the domain rule: *Verko*, *Rondi*, *Kelvo*, *Odalo*, *Ferio* — all five
  clear the name search, none has a free `.com`.

  Rejected as an unprotectable common noun: *La Taverne* — hundreds of French
  bars carry it, its `.com` and `.fr` are both taken, and a descriptive phrase
  is close to impossible to defend or to rank for.
- The tone must work with a grandparent and a drunk friend in the same room, so
  it is warm and federating rather than laddish. No in-jokes, no swearing, no
  content that would need explaining to a child.

## Evidence on Hand

- A working game, deployed nowhere yet: lobby, QR join, round engine, buzzer,
  host judging, reveal with cover art, scoreboard, final board.
- Real catalogue data from Deezer, including cover art at 250 px.
- No users, no testimonials, no usage numbers, no press. None may be invented.

## Product Principles

1. **The phone is a buzzer, not a screen.** Anything that asks a player to read
   carefully is in the wrong place; it belongs on the big screen.
2. **The big screen is read by a group, from an unknown distance.** It must
   carry one idea at a time, at a size that survives four metres, and still be
   coherent on a laptop.
3. **The server decides anything that decides a winner.** Order, time and score
   are never the client's opinion.
4. **Nothing is installed and nothing is configured.** Every second between
   "let's play" and the first note is a second the product is failing.
5. **This game is the first, not the last.** Anything built only for the blind
   test stays in the blind test's own namespace.

## Accessibility & Inclusion

- Every interactive element comes from `react-aria-components`; state is styled
  from its `data-*` attributes so touch devices never inherit hover states.
- `prefers-reduced-motion` collapses every transition to zero. This is a party
  game full of motion, which makes it more important, not less.
- Both themes carry every colour as a semantic token, and contrast is checked at
  the size actually used — the light palette is where it usually fails.
- A grandparent and a child are both expected users, which sets the floor for
  type size and for how much reading any screen may demand.
