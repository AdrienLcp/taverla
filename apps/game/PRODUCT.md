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

Nobody installs anything and nobody has an account. One screen opens the room;
everyone else joins from whatever they have to hand — a phone by QR code, a
laptop by typing the four characters. **A phone is the common case, never the
contract**, and nothing user-facing may name the device.

Three roles, never three devices:

- **The host** opens the room, picks the game, starts each round and judges the
  modes that need a judge. They may also take a seat and play. They are on their
  feet as often as not, looking up at the room as often as at the screen.
- **The wall** is the room's own screen, paired by the host's device: it shows
  the game and plays the clip, and holds no answer, no control and no seat.
- **The players** wait, recognise, and answer. Their own screen is a second
  screen rather than a remote control for the console — they read it as much as
  they press it, standing, in glances, between a conversation and a drink.

## Product Purpose

Turn a room full of screens into a party game with no setup, no install and no
accounts. Success is the moment the room is playing rather than administering —
nobody is typing an address, nobody is asking what the score is, and nobody is
waiting on a screen they cannot see.

**The console cannot be assumed visible.** It is across the room, angled away,
or — when the host runs the room from a screen of their own, and more so when
that host has taken a seat — visible to one person and nobody else. A player's
own screen is the one they are sure to have, so it carries enough to follow the
game without looking up: the score, the round, the clock and what just
happened. It carries it the way a screen read in glances should, a few things
at a time and large enough to read in the dark, and never as a copy of the
console. The one thing it is never sent is the answer while that answer can
still be typed — anti-cheat, and permanent.

The product is the room, not any one game: a code read aloud, a QR code
scanned, seats that survive a locked screen, a scoreboard everyone can see, and
a shelf of games played in it one after the other on the same evening.

## Positioning

Two promises, held together on the front door (confirmed 2026-10-04): **the
room is playing in seconds** — no install, no account, no app store; a player
who scans the QR code is in four seconds later, and one whose screen locks
comes back to the same seat with the same score — **and there is a whole
evening on the shelf**, five games played in the same room without anyone
joining twice.

The order of a buzz is decided by the server on frame arrival, never by a
timestamp the client sends. That is what makes the race honest, and every game
on the shelf inherits it.

## Operating Context

- **The host screen is whatever is nearest** — a laptop on the coffee table, a
  TV or projector across the room, or a second phone. All three must work. The
  reading distance ranges from 40 cm to four metres, and the layout has to hold
  at every width and every aspect ratio, from a phone held sideways to an
  ultrawide.
- **The room is often dark.** Living-room lighting, evening, sometimes only the
  screen itself.
- **A player's screen is read as much as it is pressed, and read in glances.**
  What is drawn around the buzzer matters — a screen showing only a button sends
  its player looking up at a screen that may not be there — and *how much* of it
  there is matters exactly as much, because a screen showing everything is read
  by nobody.
- **A question and its four choices never scroll**, at any viewport, on a
  player's screen or a seated host's console. The viewport is the frame.
- **Party Wi-Fi is bad Wi-Fi.** Anything that blocks first paint costs a player
  the first round. Both type families are self-hosted.
- **Cover art is the only real image in the product**, it belongs to the blind
  test alone, and it arrives from Deezer at 250 px. Design around that
  resolution rather than fighting it.

## Capabilities and Constraints

- One room, a four-character code from an alphabet with no confusable glyphs,
  up to 24 players. Each room is a Cloudflare Durable Object and survives a
  deploy; the app is served from `taverla.adrienlcp.com`.
- **Five games**, each owning its name and its translation prefix:
  - **Blind test** — a 30-second Deezer preview on the room's speaker; players
    name title and artist, or the film for a score cue. Sources: genre charts,
    decades (international and French), 47 film composers, any Deezer playlist,
    a free search; a difficulty setting by popularity.
  - **Quiz** — a bundled bank of 11 453 questions (7 016 French, 4 437 English)
    over eight subjects: history, geography, science, arts, cinema, video games,
    sport, everyday. Sources and licences are on the credits page.
  - **Buzzer** — a bare race for the floor; the host brings the content.
  - **Reflex** — a race against a screen about to change colour; a false start
    costs the round.
  - **Slate** — a private numbered answer sheet on every screen, marked by the
    host item by item on the wall.
- **Answer modes**: `typed` (scored by the server, with a speed bonus), `choice`
  (four candidates, speed bonus), `buzzer` (one player, judged by the host).
  Blind test and quiz offer all three; buzzer and reflex only `buzzer`; slate
  is typed.
- Phases every role walks through: lobby, countdown, playing, buzzed, revealed,
  finished — plus connecting, reconnecting, host away, joined mid-round, removed
  by host, room closed.
- Audio only ever plays on the screen that is the room's speaker — the host's or
  the wall's. Twelve phones playing the same clip milliseconds apart is a mess,
  and this is deliberate and permanent.
- Two locales, English and French (French runs longer), and two themes, dark and
  light.

## Brand Commitments

- **Each game keeps its own name** — Blind test, Quiz, Buzzer, Reflex, Slate —
  across every answer mode it offers.
- **The product that hosts the games is called `Taverla`.** From *taverne* /
  *tavern*, a word both languages already own, and the place people have always
  gathered to play. `taverla.com` and `taverla.fr` were free as of 2026-08-09;
  nothing records them as registered since. Known noise, judged not to be a
  conflict: a small Mexican candle maker ("Velas Taverla") and a surname.

  The product name lives where the shelf is addressed rather than where a game
  is played: the wordmark on the home page, the document title, and what a
  shared link unfurls into. No game screen carries it, and none should — a game
  screen names the game.

  Still owed before committing commercially: INPI and EUIPO. Everything below
  was a registry and web check, never a trademark clearance.

- Constraints the name had to satisfy, kept because the next one will need them:
  - **invented, by preference** — a coined word rather than an existing one;
  - two or three syllables;
  - easy to say and to take in for a French speaker *and* an English speaker.
    The spelling does not have to be identical in both languages; the ease does;
  - **nothing sound- or music-derived.** Not every game on this shelf has audio,
    and a name that promises music would date on the second title;
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
- **Two looks are ruled out** (confirmed 2026-10-04): the party-game app — a
  near-black ground, one neon accent, glowing edges — and a period costume, any
  pastiche of an era worn as a disguise rather than a world of its own.

## Evidence on Hand

- A working, deployed product: five games, three answer modes, wall pairing,
  held seats, host takeover, an invite poster (`/invite/:code`) and a credits
  page.
- Real content: the question bank, and Deezer catalogue data with 250 px cover
  art.
- Two playtests by people who had not built it (14 and 16 August 2026, on an
  iPhone, a laptop and Android) and a family room that asked for a difficulty
  control.
- No testimonials, no usage numbers, no press. None may be invented.

## Product Principles

1. **A player's screen is enough on its own, and stays quiet doing it.** A
   player who never sees the console still knows the score, the round, the clock
   and what just happened — a floor, because that screen is often somebody
   else's. It is not a licence to draw the console at 414 px: a player's screen
   is read at 40 cm by one person in glances, so anything added to it has to
   earn its place against the one thing the player is there to do. The only
   thing it is never sent is the answer while that answer can still be typed —
   which is anti-cheat, and permanent.
2. **The console is read by a group, from an unknown distance.** It must carry
   one idea at a time, at a size that survives four metres, and still be
   coherent on a laptop.
3. **The server decides anything that decides a winner.** Order, time and score
   are never the client's opinion.
4. **Nothing is installed and nothing is configured.** Every second between
   "let's play" and the first note is a second the product is failing.
5. **No game is the product.** Anything built only for one game stays in that
   game's own namespace; the room, the roster, the seats, the clock and the
   anti-cheat are the shared shell.

## Accessibility & Inclusion

- Every interactive element comes from `react-aria-components`; state is styled
  from its `data-*` attributes so touch devices never inherit hover states.
- `prefers-reduced-motion` collapses every transition to zero. This is a party
  game full of motion, which makes it more important, not less.
- Both themes carry every colour as a semantic token, and contrast is checked at
  the size actually used — the light palette is where it usually fails.
- A grandparent and a child are both expected users, which sets the floor for
  type size and for how much reading any screen may demand.
