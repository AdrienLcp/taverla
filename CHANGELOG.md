# Changelog

Categories, in order: Breaking Changes, Features, Improvements, Fixes,
Internal. Tag an entry `[Server]`, `[Game]` or `[Shared]` when it is specific to
one part.

## Unreleased

### Breaking Changes

- `[Shared]` A blind test can be filled from **film composers**, and
  `PROTOCOL_VERSION` goes to 13. `TrackSource` gains `{ kind: 'film' }` and
  `TrackIdentity` gains `film`, which is `null` on every other arm and is what
  the round asks for wherever it is set — a score cue is called
  `Cornfield Chase`, and what a room shouts is *Interstellar*. The source is
  drawn from a table of **49 composers resolved to Deezer ids by hand**, never
  from the soundtrack charts: those are a chart of *songs used in films*, whose
  top twenty is *Shallow* and *Eye of the Tiger*, and every one of them is
  already playable under `chart` and `decade`. A track enters the pool only when
  a composer on the table is credited and the release names a film, so the
  category cannot be caught out on its second round. It is also the first arm to
  overrule a room setting: it pins its own popularity floor at 200 000, and the
  difficulty strip is ruled and says why. See
  [`docs/game-catalogue.md`](docs/game-catalogue.md)

- `[Shared]` A blind test can be filled **by decade**, and `PROTOCOL_VERSION`
  goes to 12 — so a tab left open across the deploy reloads rather than meeting
  a source it cannot read. `TrackSource` gains
  `{ kind: 'decade', decades }`, and an empty list means every decade the way an
  empty `genreIds` already means every genre. It is an arm rather than a preset
  wearing the `playlist` one because a decade is six words the room already
  says: *which* playlists each costs is a Deezer fact, and Deezer facts live in
  `deezer-client.ts`. See [`docs/game-catalogue.md`](docs/game-catalogue.md)

### Features

- `[Game]` **A shelf card opens the table.** Pressing a game on the front door
  led to that game's own page, whose only content was a second press: nothing on
  it feeds the request, which carries the game the card names and the locale the
  URL holds. The card is a button now — it acts rather than going anywhere — and
  it carries the two states a link had no room for. The pressed painting stays
  for as long as the room is opening, with a spinner beside the name rather than
  over it, and a refusal is stamped under the card that earned it rather than at
  the end of a list a phone reads five cards of. `useCreateRoom` became one
  state instead of a boolean beside an error, because six doors now share it and
  only the pressed one may spin — which is also what closes the second press,
  with no card disabled to say so. The game's own page is untouched: it is one
  of the fourteen prerendered documents, and the arrival a search result or a
  shared link makes

- `[Server]` **`/sitemap.xml`**, built from the prerender manifest the routes are
  already registered from. The home page was the only thing linking to the five
  game pages and its cards stopped linking anywhere, so ten of the fourteen
  documents would have been reachable by URL alone. `robots.txt` keeps its own
  prose and gains the one line that needs an absolute URL; both read the origin
  off the request and honour `x-forwarded-proto`, because Render terminates TLS
  in front of the process and a sitemap listing `http://` lists URLs that
  redirect

- `[Shared]` **The reveal says how long it has.** The hold before the next round
  opens itself was a server-side `setTimeout` that reached no screen, so a room
  reading a question's note had no idea whether it had two seconds or twenty. At
  eight seconds that went unnoticed; at twenty-five — a value the host can pick
  now — it is a table wondering whether the screen is stuck. `RoundView` gains
  `advancesAt`, a server deadline rather than a remaining duration, and the bar
  the round already drains counts it: on the phone in the slot the round's own
  clock uses, on the console across the full width of the reveal stage.

  It is **absent whenever nothing is counting** — a host who advances by hand,
  or a host whose screen has gone and the round is frozen — because a bar that
  never empties is worse than none, which is the rule the round's clock already
  followed. The deadline is stamped where the hold *starts* rather than beside
  the timer that serves it: every path to a reveal broadcasts before arming, so
  a number computed next to the `setTimeout` would have reached the room one
  frame late. `armAutoAdvance` reads the stamp instead of the setting, which is
  also what stops a settings change mid-reveal quietly handing the room a fresh
  full wait. Changing the hold itself does restart it, from the change — the
  number just picked is the wait the host expects to watch. `PROTOCOL_VERSION`
  is unmoved: an older client ignores the field.

- `[Game]` **The way into a room is on every screen now, not only on the one
  running it.** The QR code was the console's and nobody else's, and a console
  is allowed to be a phone — so the invitation could end up in one hand and no
  other, which is the evening where nobody else can read the code. It moves to
  the shell: the **player's lobby carries it in full**, code, square and address,
  between the pitch and the roster; the **menu carries it everywhere else**, on
  every screen at every phase, behind the popover no thumb aiming at the game
  can hit; the player's header line becomes **selectable**, the way the
  console's own code already was; and `finished` gets its badge back, because
  the final board is precisely when somebody says *on en refait une, j'appelle
  Marc*. The badge also stops moving: it holds the end of its line whether or
  not a round index is there to push it, where `space-between` had been handing
  a lone child the start.

- `[Game]` **`/invite/:roomCode` is the invitation on a screen with nothing else
  on it**, for the machine wired to the projector — which is rarely the machine
  hosting. It opens **no socket and holds no seat**: the code comes from the
  address bar and the address from this origin, so it draws before anything is
  asked of the server, and the existence check that follows only ever takes the
  invitation *down* — an unreachable server says nothing about a code, and
  blanking a wall on a dropped request is the same fault wearing a different
  hat. Three doors reach it, and the difference between them is what makes the
  third safe: the URL alone, the console's menu (**a new tab**, because a plain
  navigation off that screen closes the host socket and the server cannot tell
  that from a closed tab), and a folded code field on the home. That field
  **grants nothing** — no seat, no console, no token, no frame — which is the
  whole difference between it and the one this repository refuses on the same
  page. It is folded and last rather than a third field beside the two real
  doors: a fork every visitor reads past, for a job almost none of them have.


- `[Game]` **Every page a crawler reaches now has a URL per language.** The
  seven indexable pages live under `/fr` and `/en`; the rooms deliberately do not,
  because nobody indexes an evening and a locale segment would lengthen the two
  things a room travels by — what the QR code encodes and what somebody reads
  out across the table. `/` and every path from before this stage negotiate and
  redirect, so a link already shared still resolves and `hreflang="x-default"`
  has something to point at. The locale a URL names wins over what the device
  remembers and over what its browser asks for, and is remembered — a room
  reached from a link shared in the other language would otherwise come back in
  the reader's own on the first reload, since a room's URL names none.
  Switching language in the menu navigates on a page that names one and stays
  put in a room, where leaving the path would drop the socket and hand the seat
  back. This is half of [stage 19](docs/plans/19-locale-urls.md); the served
  documents, their heads and the prerender are the other half

- `[Game]` **The page now paints before the JavaScript runs, in the language its
  URL names.** The build renders the seven indexable pages in both languages and
  writes **fourteen documents**, each carrying its own `lang`, `title`,
  `description`, self-referencing `canonical`, reciprocal `hreflang` with an
  `x-default` on `/`, and a full `og:` set down to a localized `og:image:alt`.
  Until now every one of those URLs was answered by one English `index.html`
  with an empty `#root`: an unfurl bot, which runs no JavaScript at all, read
  the English head whatever the link said, and a phone on a party's Wi-Fi looked
  at an empty field for as long as the bundle took — **83% of the largest paint
  was render delay**, not network. The tab after an in-app navigation follows
  too, and follows a language change with it.

  Three things are worth knowing about the shape. The document list is read off
  `shelvedGames` and `LOCALES`, never written down — this stage's own plan said
  six pages and twelve documents and was already wrong by two, because `reflex`
  had reached the shelf since. The server registers **one route per URL** from a
  manifest the build writes, rather than leaning on a directory index, and says
  so out loud when the manifest is missing, because falling through in silence
  is exactly the bug being fixed here. And the head copy lives in
  `presentation/head/document-head.ts` rather than the dictionary — the
  exception `.claude/rules/i18n.md` already carved for the document head, kept
  rather than widened: the home screen says *Taverla* and *The tavern is open.*,
  and neither is a search result. See
  [stage 19](docs/plans/19-locale-urls.md)

- `[Game]` **A phone waiting on the room is told what it is waiting on.** Four
  facts the server was already sending reached no screen a player holds: who
  else is at the table and whose screen has gone, how long the floor lasts when
  somebody else took it, how much of a reflex heat is still out there, and that
  the innkeeper has stepped away while the room is still in the lobby. The lobby
  draws the roster unranked — nobody has scored, so there is no rank and no
  score column to draw — the buzz window is the same `FloorClock` the player
  holding the floor already saw, counting down where the host set a limit and up
  where they judge it themselves, and the heat's tally is drawn on the one of
  that game's three screens belonging to a thumb already down. Nothing moved on
  the wire. **The running scoreboard mid-round was deliberately dropped**: a
  player mid-round is racing a clock, the standings are what they read after it,
  and the persistent strip already says *2nd of 6* at every phase. See
  [`docs/plans/backlog/everything-the-phone-is-already-sent.md`](docs/plans/backlog/everything-the-phone-is-already-sent.md)

- `[Game]` **A phone now knows what the round did to the room, not only to
  itself.** The big screen is often somebody else's — across the room, angled
  away, or in the hand of a host who has taken a seat — and a player who could
  not see it finished a round knowing whether *they* scored and nothing more.
  The reveal carries the room's round as **one list**: one row per player,
  ranked by where the round left them, with what they said under their own name
  and what it paid beside it, your own row stamped. The room's screen draws
  those as two blocks side by side because it is read across four metres;
  folding them into one list is what the same two facts cost on a screen read at
  forty centimetres, and it is why this is not the console at 414px. The cover
  art lands with it, at the one moment in the loop when nobody is racing. The
  round number and the round count join the chrome beside the room code, on
  every phase. Nothing moved on the wire: every field was already in
  `PlayerRoomView` and arriving on every snapshot, so there is no protocol
  change and no version bump. Three things went the other way to pay for it —
  the payout is a step smaller now that the row under it says the same number,
  the line naming the player above is gone because the board says it by name for
  everybody, and a board with nothing to say draws nothing at all

- **The screen stays awake for as long as the game does.** A phone here is read
  far more often than it is pressed — and a screen lock counts presses rather
  than attention, so the screen a player was reading went dark while they read
  it. The lock is taken when a seat is, not
  when a round starts: a screen that sleeps through the lobby is one that misses
  the countdown. It is taken again every time the tab comes back, because a
  browser drops it on the way out and never returns it on its own. Refused or
  revoked — an old iOS, a LAN address over plain HTTP, a phone low on battery —
  is an ordinary outcome and says nothing on screen
- `[Game]` The console holds one too, for a reason of its own: it is the room's
  only speaker, and a laptop that sleeps takes the music with it. **Playing
  audio protects nothing** — the browser's media wake lock is built from a
  video track, so the clip a console is playing never kept its own screen lit

- **Pick the years instead of the genre.** *Années 70* through *Années 2020*,
  one press each and as many as the table wants — the 80s and the 90s together
  is one strip, not a choice between them. Picking none is every decade, which
  is a whole evening of hits with nothing to decide. Each decade is two Deezer
  editorial playlists merged, one international and one French, because a table
  here sings along to both: measured at 90 to 130 tracks a room will actually
  recognise per decade, against a room that never plays the same track twice
- `[Game]` A decade **shows what it holds the moment it is pressed** — the count
  and the first five titles, without asking. It is the one source that names
  itself and says nothing about what is inside it, where a playlist id or a
  search has to wait for the typing to stop. That is also what makes a withdrawn
  playlist a thing the host sees in the lobby rather than a round that comes up
  empty with the room watching

- **A name you give once.** A screen that has played before lands straight at the
  table: no form, no press, nothing between scanning the code and being in the
  room. What that step used to show, the menu now carries — the name is on every
  screen at every phase, readable without opening anything, and changed from the
  same row. The two halves ship together on purpose, because skipping the form
  means never seeing the name you arrived under
- `[Shared]` `player.rename` changes the name a seat is held under **without
  reopening the socket**. Renaming used to mean saying hello again, which is a
  screen dropping the round it is in the middle of to edit a label. It is named
  for the seat rather than the role, the way `player.leave` is: the console that
  took a seat renames itself with the same frame
- `[Game]` The device remembers the name the room **accepted**, never the one
  that was typed. A name refused at the door used to be what the next room filled
  its form in with

- **The reflex race is the fifth game on the shelf.** No question, no content and
  nothing to know: the screen holds still, then it changes, and the first thumb
  down takes the round. Everybody who moved gets their own time back at the
  reveal, ordered the way the room saw it happen, and going before the screen
  changes costs the round
- `[Shared]` The moment the screen changes travels **ahead of itself**, so every
  screen in the room flips on its own clock rather than when a frame lands —
  otherwise the race is won by the best Wi-Fi in the room rather than the
  quickest thumb. Handing that moment out early is safe because a tap arriving
  less than 100 ms after it is refused as a false start: no human reaction is
  that fast, so an honest thumb never meets the floor and a scheduled one always
  does
- `[Game]` The flip is the field and its ink trading places — the largest change
  either palette can make, so it lands in peripheral vision from across a room —
  and the screen before it is the only one in the product that is completely
  still. Anything that ticked or drained during the wait would hand the table a
  way to count the flip out loud
- **A room has an owner now.** Opening one mints a **recovery code** and hands it
  to that screen alone. Anyone reading the room code off a screen could take a
  room over the moment its console blinked, and the host came back to a flat
  refusal with no way in — the takeover was never the problem, its being final
  was. The recovery code always wins a claim, so the screen holding it takes the
  room back from whatever is running it
- `[Shared]` A second console arriving in the minute after a room lost its own is
  told the room is waiting for its screen, rather than handed the game: a lid
  closing, a reload and a Wi-Fi handover all land inside that minute. Past it the
  room can still be picked up with the code alone, because a room nobody can take
  over is an evening ended by a flat battery
- `[Game]` The recovery code is read out of the host's own menu, behind a press
  because the console is often a television the whole room is looking at, and
  typed into the screen a second console is refused on. That is *the laptop died,
  we host from the TV*, without the room ever seeing it
- **Le Fake is the fourth game on the shelf.** A question with a surprising
  answer, everyone writes a convincing lie, the screen puts them all up beside
  the truth, and the room votes. Two points for finding the real answer, and one
  more for every player who falls for yours — the first game here where a wrong
  answer is worth something, which is what keeps a table that does not know the
  answer in the game
- `[Shared]` It runs on the question bank the quiz already ships, so there is no
  second download and nothing new to keep online. Two shapes of question are
  filtered out because they cannot carry a round: one that names candidates the
  room cannot see (*"which of these was cut from Melee?"*) and one whose answer
  is a bare number, where every lie is another year and the vote goes back to
  being trivia. That leaves 5 247 usable prompts across the two languages
- `[Shared]` Two players who write the same lie become **one line credited to
  both**, rather than the second being told to think of another. A lie that *is*
  the answer is refused, and the player writes another — accepting it would put
  the truth on the board twice and leave the vote with nothing to find
- `[Shared]` A short table gets a full board: the question's own authored decoys
  top it up to five lines, which beats demanding a fourth player
- `[Shared]` **Leaving a room is something a player says.** The menu's way out
  reads *Quitter le salon* on a screen holding a seat, gives it up on the
  server, and the roster on the big screen loses the name at once rather than
  keeping it greyed out. A closed socket could never carry that: a phone that
  locks its screen closes one too, and that seat has to come back
- `[Shared]` **A host who took a seat can give it back**, without ending the game
  or closing the room. The menu carries the three scopes as one ladder — a seat,
  a game, a room — and the console offered the last two only, so the phone in the
  middle of the table stayed a player for the rest of the evening. The answer
  comes back to that screen the moment the seat does, so the next buzz is judged
  by somebody who can read it
- `[Shared]` A seat nobody has been behind for ten minutes is released on its
  own — the same patience the server already gives a room with nobody connected
  at all. A room outlives a game and chains several, so a phone that closed its
  browser during the first would otherwise sit on the scoreboard through every
  game after it. The host can drop a name from the roster on the spot when they
  know somebody has gone
- `[Shared]` **Fixed: a network blink could end a round on everybody else.** The
  room closes a phase the moment everyone has acted, and a player whose socket
  dropped stopped being counted instantly — so a stutter in the second their
  table-mate answered closed the round on the players who remained, and they
  came back to something they were never able to answer. A dropped phone now
  holds its place for fifteen seconds
- `[Game]` The volume only appears under a game that plays something. It is the
  blind test's alone today — nothing else carries an `audioUrl` — so on the
  buzzer, the quiz and Le Fake the slider commanded nothing at all. Chaining
  rounds stays under every game, because that one is the room's setting rather
  than a game's
- `[Shared]` Both of Le Fake's clocks can be turned off. **Tu décides** joins the
  writing and the voting ladders, and the phase then stays open until the host
  gives the answer — the same control that put the board up. Neither clock was
  ever what ended a phase in the ordinary case: both close the moment everybody
  has acted, and the deadline is only there for the table that is one player
  short. The vote's choices are 20 / 30 / 60 seconds now rather than 20 / 30 / 45,
  and the host gains an action during the vote, where the screen previously
  offered none
- `[Game]` The board splits the screen rather than stacking under the question:
  the question and the count of who has voted take a column, the candidates take
  a wider one. That is what turns six visible lines into ten on a 1080p screen,
  because the board now runs against the whole height of the field instead of
  what was left under the question. Its type is sized from the box it is given,
  so a table of five still reads at full size and only a room that wrote ten
  reads them smaller
- `[Game]` A candidate too long for one line wraps on the phone instead of
  running off the side of it. The list was pushing the whole page sideways —
  a flex item's minimum is its content, so `Le Grand Chasseral` fitted and
  `A suspension bridge over the Rhone` did not. The rows grew with it, and the
  labels stepped down a size now that ten of them are read in a column
- `[Shared]` A long one gets a readable board. Past ten lines a vote stops being
  a vote — by the tenth the third is gone — so a bigger room's surplus lies are
  cut, the ones a single player wrote before the ones two arrived at
  independently, since one such line keeps two players in the round. Nine
  writers and the truth still fit whole, so an ordinary table never loses a line;
  and being cut costs only the points a lie earns, never the vote or the two for
  finding the truth
- `[Game]` The host screen is told nothing the room cannot already see. Everyone
  is looking at it while they write, so the answer reaches it the way it reaches
  a phone — unlabelled on the board, then marked at the tally

- **The quiz plays in English too**, on 4 506 questions from Open Trivia DB —
  human-verified, under the same CC BY-SA 4.0 as the French bank and bundled the
  same way, so neither language depends on anybody's uptime. The host picks the
  language in the quiz's settings, and it opens on whatever language *they* are
  reading the interface in
- `[Shared]` The language belongs to the room and never to the reader. Two
  players in the same room can hold different interface languages, so drawing
  from theirs would deal each phone its own question — a player may switch their
  app between English and French mid-game and it changes their chrome and nothing
  else. Only the host moves the questions
- `[Game]` The menu credits both banks. They are written in each language rather
  than translated from one into the other, and the two halves have different
  authors, so both are named whatever a room happens to be playing

- **The room comes first and the game second.** The front page creates a room —
  the code goes up, the phones arrive, and the table picks the game on the
  console while they do, beside the QR code everyone is already looking at. A
  game's own page keeps its button and becomes a shortcut for a host who knows
  what they came to play; it stays a page rather than a link that opens a room,
  because a GET that mutates is a link preview in a group chat opening rooms
- `[Game]` A phone in a lobby says which of two things is happening: "the host
  is choosing a game", or "you are about to play *X*" with what the evening
  pays. That last sentence used to sit on a "waiting for the host" screen
  reached between rounds — the lobby is where the waiting actually is, and the
  only moment nobody is against a clock

- **The quiz is the third game on the shelf**, playable in all three modes on
  1 800 French questions bundled with the server — ninety-two of them adult and
  drawn only for a room whose host asked. Everything a round needs is in the
  repository: the bank is a 780 KB asset rather than a network call, so a game
  whose data weighs less than a photograph cannot go down because somebody
  else's web server did, in the middle of a party

- `[Game]` The question is the stimulus, so it is what the screens show. It
  stands where the clip's "listening…" stood on the host console and above the
  answer on every phone, with its subject in small caps underneath and the same
  drain bar running out below — a quiz round has a duration too, which is why
  that bar is no longer the blind test's. The reveal carries the answer and its
  note, the anecdote that travels *with* the answer because it gives it away

- `[Game]` The menu credits whoever wrote the questions. CC BY-SA asks that the
  credit travel with the work, and the questions ship bundled rather than being
  fetched from anyone, so nothing else in the product would ever name them. It
  sits in the small print of the one piece of chrome on every screen rather than
  on the reveal, where it would take the loudest moment of the round, ten times
  a game, to say the same thing
- `[Shared]` A host may turn on the bank's adult themes, and they are off until
  they do. Its own field rather than a seventh category, because the six are
  *subjects* and this is a rating — a question about a porn actress's first
  album is a celebrities question that happens to be adult, and putting two axes
  in one row is what makes such a control read as a mistake. The host is the
  only one who can make the call: the room code is read aloud and anyone present
  can scan the QR

- `[Game]` `TextLink` is a link inside a sentence, and it is deliberately not a
  fourth `Link` variant. Every variant there answers "which material is this
  control made of", and this one would have had to answer "it is not one" — the
  tell was a stylesheet that spent itself undoing the mixin above it, resetting
  the box, the case, the tracking and the press. Keeping it separate is what
  makes `size` and `variant` unavailable on it, which is the type saying the
  true thing.

  It replaced the product's only hand-written `<a>`, which had the browser's
  blue and its visited purple on a saturated field. A sweep for the rest turned
  up none: every other interactive element already comes from react-aria, and
  the only hand-written `role` attributes are live regions on paragraphs.

- `[Game]` **A host's setup survives the room it was made in.** Every setting the
  console can change is kept on that machine, so the next party opens on last
  week's evening instead of on the defaults — the countdown, chaining rounds, how
  many rounds, the answer mode, the clip length, the difficulty, the question
  language and the categories. Nothing travels: it is stored per browser, like
  the volume, and a room a host opens is set up from their own screen
- `[Shared]` **A game answers three of them, so those are remembered per game.**
  Which game, how it is answered and how many rounds are the game's to say — five
  rounds of Le Fake is an evening where five of the quiz is a warm-up — so
  choosing Le Fake restores what Le Fake was left on and choosing the quiz
  restores the quiz's. Everything no game answers is remembered once and survives
  every switch: a countdown you lengthened is not undone by changing your mind
  about what to play. A game never played still opens on its own defaults, with
  the host's countdown over the top
- `[Game]` It only ever applies to a room in its **lobby**, and only to the first
  screen the console draws. A console that reloads in the middle of a game
  re-applies nothing — the server refuses the three settings a round is built on,
  and the rest would be somebody's evening quietly rearranged between two rounds

### Improvements

- `[Game]` **The projector page is a wall, not a screen somebody is standing
  at.** `/invite/:code` exists to be thrown on a screen and left there, and both
  of the things that made it read as a page came off the same fact: it is the
  only surface in the product nobody is at. `RoomInvitation` takes
  `isUnattended`, and the invitation page is the one stage that passes it — the
  copy button is a target four metres from the nearest hand, and it was the only
  thing on the screen that was not the invitation. The other four stages keep
  it, because on a screen somebody is holding the code is copied to be sent.

  The corner menu **fades instead of going**. Hiding it outright was the tidier
  answer and the wrong one: the machine wired to the projector is often not the
  one running the room, so the tab arrives as often by somebody typing the URL
  on an event PC — with its own `taverla:theme` — as by being dragged across
  from the host's browser, and a light field in a dark room would then have no
  way to be said. `useIdleChrome` stamps `data-idle` on the root four seconds
  after the last pointer, key or focus, the same seam `usePhaseField` uses to
  let a page decide the colour of the field; `:focus-within` and the trigger's
  own `aria-expanded` keep it up while somebody is in it. The room that resolves
  to nothing keeps every bit of its chrome, because that screen *is* read at a
  keyboard and its way home is the only thing on it. See
  [`docs/plans/backlog/the-invitation-is-a-wall.md`](docs/plans/backlog/the-invitation-is-a-wall.md)

- `[Game]` **`RoomInvitation` and `CopyButton` are the shell's**, in
  `presentation/components/` with a stylesheet of their own — three consumers is
  what makes a component shared, and every rule for it had been nested under the
  host stage, so rendered anywhere else it was unstyled. The split is the seam
  `DESIGN.md` already names: **a component says what it costs, a stage says how
  much there is.** The component owns the stack, the square and the address and
  declares its own container; `--invitation-code-size` and
  `--invitation-qr-max-width` are what each stage answers — the console keeps
  `min(clamp(4.5rem, 21vmin, 20rem), 21cqi)`, the phone gets a register a phone
  can hold, the popover a flat `rem` and a 180px square scanned at arm's length,
  and the poster `vmin` with no ceiling of its own. Their strings leave `host.*`
  for `invite.*`, because a prefix that names a *screen* stops being true the
  moment two roles read the same words.


- `[Shared]` **A game opens on the mode it is played in.** `DEFAULT_ANSWER_MODE`
  is a per-game record beside `DEFAULT_ROUND_COUNT`, so the quiz opens on
  **`choice`** where a single room-wide `typed` used to answer for everything.
  A quiz question is a sentence with one fact missing and a table reads four
  candidates faster than it types an answer; it is also the shape most of the
  bank was written in, so the 680 rows that are only a question beside their own
  decoys are dealt by default rather than filtered out. The blind test stays on
  `typed` and that is not deference: its question is a clip, the title and the
  artist are two answers worth a point each, retries are free, and its
  candidates come from the room's own pool rather than authored beside the
  answer. `modeOfferedBy` still narrows, so the record cannot serve a game a
  mode it refuses. A host who has already played a game keeps what they last
  left it set to — `HostPreferences` wins over the opening default, by design

- `[Game]` **How long an answer stays up is a duration, not a switch.**
  `host.autoAdvance` was a boolean writing one hard-coded `8_000`, and the
  2–30 s the protocol has always accepted were unreachable from any screen. It
  is the panel's own `NumberChoice` now — 8 s, 15 s, 25 s, *you decide* — with
  `null` still the default, and *Time before the next round* as the label
  because that is what the value is. Eight seconds pays for a quiz note and
  nothing else: four French rounds in five carry one, and the median is twenty
  words. `NO_LIMIT`, `NumberChoice` and the two duration labels moved out of
  `settings-panel.tsx` into `number-choice.tsx`, which is what lets a second
  strip exist at all

- `[Game]` **Three screens that showed a control and never said what it costs.**
  The reflex race's phone drew one live button reading *Buzz* and nothing else,
  so the game's whole trap — a thumb that goes early loses the round — was
  reachable by the thumb resting on it and named on the host's screen alone. It
  carries the cost now, centred under the buzzer like every other line under
  that object, and it is the cost rather than *watch the screen* so it stays
  true on both sides of the flip and never moves under a wait that must not
  move. The four-candidate grid said nothing where the typed field has said *as
  many goes as you like* since it existed, and it is the harder of the two to
  guess — four buttons look like something you can try; it says *one pick only,
  and the sooner pays the more*, above the grid because it changes which button
  a thumb commits to. And the host lobby prints the scoring line under the
  pitch: every phone in the room was told what the round pays and the one screen
  that never was is the one whose job is to explain the game out loud — the
  sentence was in the setup fold, which is collapsed at every width

- `[Game]` **The palette is `oklch()`, and each pair is one `light-dark()`.**
  All twenty-nine colours were hex in two blocks a mixin applied to the two
  places a theme can be decided from; they are now one list of `light-dark()`
  pairs, and those two rules set `color-scheme` and nothing else. Every value is
  an exact conversion — all twenty-nine round-trip to the same 8-bit sRGB
  colour, verified by reading pixels back off the built app in both palettes
  across three phases — so the six fields are the same six colours.

  The one thing a room sees differently is better: `--ink-muted` and `--rule`
  mix `in oklab` rather than `in srgb`, which is where gamma-encoded
  interpolation goes muddy at the midpoint, and the worst `--ink-muted` pair
  went from 4.61:1 to 4.81:1 on the same 85%. `light-dark()` costs nothing at
  the far end: LightningCSS lowers it for Vite's default target into a pair of
  toggled custom properties attached to those same two rules, so what ships
  works anywhere `var()` does.

  `DESIGN.md` carries the values as lightness, chroma and hue now, which made
  two things checkable that had been assertions: the closest two consecutive
  phases are 57 degrees apart, and the two palettes drift up to 8 degrees off
  each other rather than being one hue at two lightnesses. Its worst measured
  pair was also recorded as 5.56:1 and is 5.65:1 over all twelve.

- `[Server]` **The built app is compressed and cached.** `serveStatic` was
  sending 370 KiB of uncompressed text and no `Cache-Control` at all, so every
  phone joining a room downloaded the whole bundle again over whichever flat's
  network the party was in. `compress()` sits ahead of the files — not the whole
  app, so the socket upgrade and the API keep the frames they already send — and
  a hashed name under `/assets/` is served `immutable` for a year while
  everything else is revalidated. `index.html` is the file that must never be
  stale: it is what names the bundle, so a cached copy pins a phone to the
  previous deployment's JavaScript. It moved first contentful paint from 4.0 s
  to 2.1 s under Lighthouse's mobile throttling, and the performance score from
  0.73 to 0.95.

- `[Game]` **`llms.txt` says what the product is**, in the shape a model reads:
  what a room is, the five games, and which paths are content. `robots.txt`
  stops naming games in its `Allow` lines — they bought nothing without a
  blanket `Disallow`, and the list had been stale since the second game shipped.

- `[Game]` **A console that cannot make a sound now names the setting, not the
  gesture.** *The browser turned it down. Try again.* was the one instruction
  that cannot work against the thing most likely to be saying no: a per-origin
  sound permission answers every press identically for the rest of the evening.
  The press behind it is always a real gesture — both call sites are synchronous
  inside `onPress` — so a refusal there is a setting. All three refusals now end
  on the same way out, because a screen that cannot be fixed where it stands
  should be told once what to do instead of three times what went wrong
- `[Server]` A seat that comes back keeps the name it already holds, whatever its
  `hello` carries. The reconnect was the old way to rename, so leaving it there
  would have let a Wi-Fi blink quietly undo a rename nobody asked to undo
- `[Game]` The host's seat form fills itself in with the device's name, the way a
  phone's join form always did. It was the one form in the product that started
  empty every time
- `[Game]` **A console that reloads mid-round no longer plays the rest of the
  game in silence.** Permission to make a sound is granted to an audio element
  by a press, and the press that mints one is the press that opens a round — so
  a screen that reloaded, restored a tab or had the address pasted into it never
  asked the browser anything, and nothing said so: *À l'écoute…* renders either
  way, the progress bar comes from the server, buzzes work and the reveal lands.
  A silent round was **visually identical** to one that plays. The screen says
  *Le son ne sort pas d'ici.* now and offers the one press that fixes it, which
  picks the clip up where the room is
- `[Game]` **A refused first press stopped being permanent.** The element was
  kept whether or not the browser let it play, so every later press was a silent
  no-op and the tab was mute for the evening
- `[Game]` **The winner gets a moment.** The final board named who won and then
  listed everybody in rows that differed only by a small grey numeral. The name
  is struck now, a rule draws out under it, and the board settles a row at a
  time — while the podium is made of the numerals themselves, stepping down from
  first through third. No particles: a burst of them would be a costume on a
  product drawn in hard edges and ink. All of it collapses to nothing for anyone
  who asked for no motion, and it only ever plays on the one phase with no clock
- `[Le Fake]` **The reveal names people instead of counting them.** *1 l'a
  trouvée* told a room of four something all four already knew; *Trouvée par
  Zoe* is the thing they did not. Up to three names, and a count past that,
  where the line would be a wall nobody finishes. Who fell for a lie is named
  the same way and on purpose — the room watched the vote, the board already
  says who wrote each line, and the score pays the author per person caught
- `[Quiz]` `Tout le monde choisit parmi quatre, contre la montre` — parmi four
  *what*. The four scoring lines open on the shape of the round now
- `[Game]` **The countdown stopped wiping out the round it interrupts.** Between
  two rounds the big screen replaced the answer everybody was still arguing about
  with a number on an empty field, three times a minute. The round just played
  stays up now and the count sits over it, on the countdown's own colour — the
  colour says a new round is coming, the content says what the last one was
- `[Game]` **The reveal shows the standings**, which is the one moment the room
  asks for them. They were already on that screen during the clip, where nobody
  is looking. Not on the phones: a room reading a ranking off twelve small
  screens is the thing this product exists not to be
- `[Game]` A track title and an artist come from a catalogue, so their length is
  nobody's decision — at reveal size one long word was wider than the screen. And
  a nickname in the who-said-what list no longer pushes the number at the end of
  its row off the edge
- **Speed is paid by the clock rather than by rank.** The first player to score
  took +2 and the second +1, whatever the gap between them — so answering at one
  second and answering at twenty-nine were worth a point apart. The bonus now
  falls linearly from **+3** at nought to nothing when the round runs out, on the
  quiz and the blind test, in both answer modes. Two consequences worth
  expecting: two players landing in the same second score the same, where the
  table always separated them by arrival; and the bonus is no longer scarce —
  everyone who answers inside five-sixths of the round takes something, where
  before it was two players or nobody
- `[Server]` It is measured on the **round's** clock, not the wall's. That clock
  stops while the host is away, so a room whose console blinked no longer pays
  for the pause — a player who answered eight seconds in is eight seconds in
  however long the screen took to come back
- `[Game]` **A phone is told what the clock paid it.** A rank was something the
  room watched happen and could count; a curve is not, so `+3` now carries *dont
  2 pour la vitesse* under it. The big screen still shows the total alone
- `[Buzzer]` **Unchanged, and not by oversight.** It has no round clock at all —
  the host brings the content, and eight seconds into a charade acted out over
  forty is not eight seconds into a riddle said in five. Le Fake is unchanged
  too: voting fast is voting without reading the board
- `[Game]` **The app stopped describing its own plumbing.** Every user-visible
  string was written from the inside out: the front door promised *des jeux de
  soirée pour un écran et les téléphones de tout le monde*, three of the four
  game pitches opened on *un écran*, two shared *répond sur ce qu'il a dans la
  main* word for word, and the errors offered *côté serveur*, *ce message* and
  *la console* to people who had sent no message and opened no console. Worse,
  it was false as well as cold — the screen running the room can be a phone and
  a player can be on a laptop, which is the one thing nothing user-facing is
  allowed to assume
- `[Game]` **The room is a tavern now, and says so.** `Taverla` was a coined word
  the product never explained, so the front door is *La taverne est ouverte* /
  *The tavern is open* and the vocabulary follows it all the way down: a room is
  **une table**, the host is **l'aubergiste**, a round is **une tournée**, the
  roster is **la tablée**, joining is **prendre place**, and launching is **À
  table !**. English reaches the same register with its own words — *innkeeper*,
  *the table*, *pull up a chair*, *Gather round* — because `round` is already the
  pun there and a calque would have been worse English for the same idea. The
  document title and the share card stay explanatory on purpose: a tab, a search
  result and a link unfurled in a group chat have nobody standing in the room to
  explain the joke
- `[Game]` A game's pitch sells the evening and leaves the arithmetic to
  `scoring` beside it, which was already saying it better. Music vocabulary stays
  inside `blindtest.*` — *trois notes* is the blind test's alone, where *la
  tablée* and *la tournée* belong to the shell every game reuses
- `[Game]` **A phone is told where it finished.** The final screen showed the
  standings and left the player to find their own row in it, while the big
  screen named the winner alone — so everyone who was not first learned nothing
  about their evening. *Tu finis* now opens the line and the ordinal lands under
  it at monument size, formatted by the locale: 1st / 2nd / 3rd in English,
  1er / 2e in French, correct through the 11th–13th trap and up to the room's
  twenty-fourth seat. Tied players share a place, the way the board already
  ranks them
- `[Game]` **A board only ranks when there is something to rank.** The lobby
  roster printed `1` and `0` beside every name — everybody first, on nothing —
  and spent 62 px of a phone's width saying it, which is what pushed a
  seventeen-character nickname into an ellipsis. Until somebody scores, the rank
  and score columns are gone: the nickname takes the room back, and the
  truncation ceiling moves from about fifteen characters to nineteen. The
  columns return at the first point
- `[Shared]` **The round's clock is on the phones too.** The bar draining down
  the big screen was the host's alone, so a player holding a buzzer had no idea
  whether the clip had five seconds left or twenty-five — the one thing the phase
  colour cannot say. It now sits under the scoreline on every screen, in every
  game with a clock. It is absent while the host is away, where the round is
  frozen and a bar draining would be timing nobody
- `[Game]` A screen arriving in the middle of a round joins the bar **where the
  room is** rather than at a full one — a phone back from a locked screen, a
  console that reloaded. The correction is also what removed a jump the host's
  own bar had: a running animation cannot be re-aimed, so each snapshot restarts
  it from the server's count instead of stretching what it has already played
- `[Game]` **A phone that scans the QR code no longer looks at an empty screen
  while the app downloads.** A cold load now shows a named wait — the one place
  in the product with genuinely nothing else to draw, since the route has not
  resolved and no room is known yet. It holds off for 250 ms first, so a good
  connection still shows nothing at all rather than a flash
- `[Game]` **The host console puts the room code up before the socket answers.**
  The code, the QR square and the join address are drawn from the address bar
  and this origin, so the room can start reading the code aloud immediately
  instead of watching a blank field. It lands in the column it keeps, and
  nothing moves when the first snapshot arrives — where a spinner would have
  replaced something useful with something that only says *wait*
- `[Game]` **The question banks are credited on a page of their own**, reachable
  from the menu, instead of two paragraphs of small print inside the popover you
  open to switch language mid-game. CC BY-SA 4.0 names a link to a resource
  holding the required information as a reasonable way to satisfy attribution,
  and the page is the only place with room for the parts that were missing: what
  the ingestion changed about each bank — which the licence asks for
  unconditionally — and the licence the assembled bank is itself shared under
- `[Server]` **Ticking no subject now mixes them.** It always meant "every
  subject" and always behaved as "every question", which are the same sentence
  only when a bank is flat — and neither is: a room got a video-game question
  every five rounds in English and a history question every twenty in French.
  The category is drawn first and the question inside it, so the six subjects
  come up evenly whatever the bank looks like. It applies with subjects ticked
  too: history and sport together is a mix, not three parts history
- `[Game]` The adult switch is not shown where the bank has nothing to rate.
  English questions carry no rating at all, so the control kept its promise and
  changed nothing — the same reason the answer-mode strip is hidden when a game
  offers one mode. Its value survives: a host who turned it on in French still
  has it on when they come back

- `[Game]` **A wide screen stops being a phone's screen blown up.** The two front
  doors were a 620px column whatever the display, while the type is sized in
  `vmin` — so a 72px headline wrapped the tagline onto eight lines. The column
  widens to 900px past that width, which is already the product's own number: it
  is where the console splits its lobby in two and where the player's screen
  widens for the buzzer. The shelf of games goes two across in the room that
  frees up
- `[Game]` **And past 1 200px it becomes a poster**: the name and the promise
  down one side, everything you can act on down the other, on the same ratio the
  lobby already splits its own two audiences by. The second breakpoint is where
  a headline at full size still falls in three or four lines once the field is
  halved — below it, two columns are worse than one
- `[Game]` The host's console no longer sprawls. It had no maximum at all, so on
  a 21:9 display it ran the full 3 440px with the QR code pinned to one edge, the
  roster to the other, a thousand pixels of field between them and a game
  description set on a single 200-character line. It is bounded to the width a
  1920 screen already gave it — past that, `vmin` has stopped the type growing
  and the extra width is only void

### Fixes

- `[Game]` **A room code was breaking in half on the wall, and could on the
  console.** `--invitation-code-size` asked the projector page for `28cqi` and
  the console for `21cqi`, both on the estimate that four characters need every
  bit of their column. Measured instead: four `W` — the widest glyph
  `ROOM_CODE_ALPHABET` holds — set in `monument` come to **4.78 times their own
  font size**, so a code holds one line up to `100 / 4.78 = 20.9cqi` and no
  further. At `28cqi` every code overflowed its column by forty pixels at 1920
  and `word-break` split it, which put two objects on the one screen allowed to
  carry a single idea; at `21cqi` the console breaks `WWWW` alone, one code in
  six hundred thousand. Both are `20cqi` now, and the comments carry the
  measurement rather than the estimate.

- `[Server]` **A round with no console is frozen on the server too.** A host
  closing their tab stops every timer, and until now that was the whole freeze:
  the floor could still answer its way to the end of a round nobody was there to
  hear, which closed it, revealed it and armed the next clip for a screen that
  had gone. `FLOOR_MESSAGE_TYPES` partitions the four frames that move a round
  along from the floor, and the gate sits beside the host-only one it mirrors,
  refusing them with `host_away`. The seat frames stay out of it: leaving a room
  nobody is running is exactly what a phone should still be allowed to do

- `[Game]` **The reveal hold is remembered per game, not per host.**
  `autoAdvanceMs` fell outside `GameSetup`, so it sat in the arm of
  `HostPreferences` that survives every switch: a host who held the reveal
  twenty-five seconds because a quiz question carries a note got twenty-five
  seconds on the reflex race, whose reveal is a reaction time and a name. It
  joins `game`, `mode` and `roundCount` on the game's side of the seam
  `movedToGame` turns on, so a switch takes the incoming game's answer and a
  switch back finds the one that was left there.

  It is the only one of the four that no game opens on a number of its own —
  every game takes the shell's `null`, which waits for the host and so cannot be
  too short. Being on that side of the line buys the *memory*, not a default. A
  console whose stored setup predates this reads a `games` arm missing the field
  and falls back to the defaults, which is what `readStoredHostPreferences`
  already does with any blob this build cannot read.

- `[Server]` **The whole question bank was read end to end, and 191 rows carry a
  repair.** It started with three questions a room could not answer and ended as
  an audit with eight lenses over all 6 286 rows. What it found: 29 answers that
  are simply wrong — *how many chromosomes are in your body cells* answered 23,
  *the area of a sphere* answered with its volume, `H20` written with a digit
  zero — and **ten of them had the right answer sitting among their own three
  decoys**, so a repair can swap the pair now and keep four candidates. 35 rows
  of garbled text (*Polanreff*, *chanteuseest*, *les debts d'un timbre-poste*, a
  decoy reading `Neptune>/I>`). 36 rows where a decoy answers the prompt as well
  as the answer does, dropped the way `isWinnableTyped` already drops the ones
  the *matcher* grades right. 40 rows whose answer has a shelf life, dropped
  except the eleven where only the anecdote had aged — those keep the question
  and lose the note, because it is read out to the room and *Barack Obama est
  l'actuel président* under a correct answer is the screen being wrong out loud.
  One systematic fault turned into a rule rather than data: upstream stores its
  anecdote in a 255-character column and ten of them end mid-word, so `noteIn`
  cuts an unterminated one back to its last full stop. The bank stands at **6 209
  rows**, 77 fewer and 122 repaired. See
  [`docs/plans/backlog/the-bank-read-end-to-end.md`](docs/plans/backlog/the-bank-read-end-to-end.md)

- `[Server]` **A question the room cannot answer with a text field is no longer
  dealt to one.** *Which country drives on the left side of the road?* answers
  Japan, and India, and seventy others: the row is only a question because three
  of its four buttons say otherwise. `choiceOnly` is a column on the banked row
  now, stamped from a committed census of **680 rows** — 14.7 % of the English
  half — and `drawQuestion` deals one only where its own decoys will be on
  screen, which is a quiz in `choice` mode and nothing else. It replaces a regex
  that was Le Fake's alone and wrong in both directions: **75 % recall**, and 154
  rows excluded that a room can answer perfectly well. Le Fake gains those 154
  and loses 136 the regex was letting through. `isUsable` is required now, so the
  next game to draw from the bank cannot forget to say what shape it can ask —
  which is exactly what the quiz had done. `prompt-eligibility.ts` is
  `answer-eligibility.ts`, down to the one rule that is genuinely Le Fake's:
  nobody is believed over a bare number

- `[Server]` **Sixty questions asked the room about nobody.** OpenQuizzDB writes
  packs of four meant to be read in order with the theme on screen, so its second
  row says *elle* and means whoever the first named — and this game deals one
  question, alone, with the theme nowhere. *Dans quelle comédie est-elle DRH dans
  une compagnie maritime ?* is a question about nobody, and *De combien d'essais
  dispose-t-on pour chaque mouvement ?* is about no sport. All 6 286 rows were
  read, French by pack so the referent was visible; the fault is 44 French rows,
  plus **16 English ones for a different reason** — Open Trivia DB rows written as
  statements (*This composer worked on the 2003 TV series…*), which are a clue
  with four buttons under them and ask a typing room nothing. Sixty prompts are
  repaired and one row is gone: it names an artist the world does not have. The
  repairs live in `apps/server/scripts/question-repairs.json`, keyed by row id and
  each carrying the `why` it was made, so a rebuild reapplies them and warns for
  one whose row upstream has renumbered away. No repaired prompt contains its own
  answer, which is checked rather than trusted

- `[Game]` **A player's reveal on a laptop cut every nickname over about seven
  characters** — `Adrien 2` was drawn as `Adr…`. The board sat in a column that
  never grew: the split reveal declares `1fr minmax(15rem, 0.8fr)`, and `1fr`
  is `minmax(auto, 1fr)`, so the answer's own min-content — one unbreakable word
  at ninety-six pixels — claimed the whole row and left the board on its 15rem
  floor at *every* desktop width. A phone's width, carrying a laptop's type,
  because the name was sized in `vmin` against the screen behind the column. The
  track is `minmax(0, 1fr)` now, and the row is sized against its own container:
  `clamp(1.25rem, min(3vmin, 6cqi), 1.75rem)`, which is the size a phone and a
  narrow window already read and a cap the split had no ruler for. Fourteen
  characters fit where seven did, on every game — the board is the shell's.

- `[Game]` **The revealed answer is sized by the column it is in, not by the
  screen behind it.** The room's own panel has divided by `--answer-length`
  since it was written; the phone's never did, and once that screen splits in
  two the same 83-character answers land in 431 pixels. It publishes two
  measurements now, because two things decide whether a display-size string
  fits: how much there is of it, and how long its longest *unbreakable* run is —
  `Maison-Blanche` is seven characters wide, not fourteen. `overflow-wrap:
  anywhere` is the guard behind both, and a guard that fires reads
  `Maiso / n- / Blanch / e`.

- `[Game]` **A room's tab said `Taverla — party games for one screen and the
  whole room` in a French app.** `/host/:code`, `/play/:code` and the
  not-found page are served by the SPA fallback rather than by one of the
  fourteen prerendered documents, and none of the three set a title of its own —
  so all three inherited the English home page's, whatever language the app was
  in. All three say what the front doors say now: `Blind test — Taverla`, and
  `Taverla` alone while the lobby has no game yet. A tab is chrome rather than a
  game screen, so it is one of the three places the product is named; the room
  code is not in it, being already the largest thing on the console and the line
  above the player's own name. `useDocumentTitle` is the string, and
  `useIndexedPageTitle` the page it used to be.

- `[Game]` **Three lines of secondary text were dimmed below the contrast the
  token they should have used already guarantees.** `opacity` on text
  multiplies the field back into the ink, and nothing says by how much: the two
  `.subtitle` captions on the player's answer forms sat at 3.91:1 against the
  worst field, and `revealed-lie-board`'s `.fooled` stacked `opacity: 0.75` on
  top of `--ink-muted` — which is *already* 85% ink, calibrated to the point
  where the worst pair still clears 4.5:1 — for 63.7% effective ink and 3.18:1.
  All three now read `color: var(--ink-muted)` and clear 4.5:1 by the same
  measurement that set the 85%.

  Lighthouse scored accessibility 1.0 with all three shipped, on all three
  audited URLs, because they live on screens a room reaches mid-round and an
  audit of the front door never loads. The two remaining `opacity` values under
  0.5 are a pulse keyframe and a reduced-motion progress bar, neither of them
  text.

- `[Game]` **A French room is no longer offered a translation of itself.**
  `index.html` ships `lang="en"` — deliberately, because a crawler and a link
  unfurled in a group chat read the served document and that copy is English —
  and the negotiated locale was written onto `<html>` from an effect in the
  i18n provider, which runs *after* the first paint. So every French load spent
  a frame as French text under `lang="en"`, which is exactly what a browser's
  translate heuristic looks for; an Xbox offered to translate the page.
  `applyInitialLocale` decides and stamps in one call — one call is what keeps
  the order from being got wrong — `main.tsx` makes it before `root.render`,
  and the provider is seeded with what it decided rather than deciding again. Nothing about *which* locale is chosen changed: a browser
  asking for French has always got French, `DEFAULT_LOCALE` being the fallback
  for a browser that asks for neither.

- `[Game]` **The QR code is no longer an unnamed graphic.** `qrcode.react`
  stamps `role="img"` on the square whether or not it was handed a `title`, so
  both of them — the lobby's invitation and the round's reminder in the corner —
  were graphics with no alternative. It is the one accessibility failure
  Lighthouse could not have caught here: it audits the pages a crawler can
  reach, and a room's own screens need a live room. They are `aria-hidden` now
  rather than named, because the alternative is already on the screen and is
  better than a name would be: the line under the big one says what to do with
  the square, the address below that is what the square encodes, and the small
  one carries the room code. A screen reader cannot point a camera at anything,
  so naming it would announce a shortcut its listener has no way to take, ahead
  of the way in that they do.

- `[Game]` **`underlined` stops carrying a box it never draws.** The variant has
  no ground and no edge, and it was still taking the 52px height, the 20px of
  inline padding and the transparent border that reserves room for an edge — so
  a tertiary action sat indented from the column every line beside it starts at,
  in a block twice the height of its own label. The box is a mixin the two
  materials that have one opt into now, rather than a rule the root applies to
  all three: written as an exclusion it would have been a `min-height: unset`
  undoing three rules above it, and the next size added would have had to be
  undone there too. The block padding is the one thing that stays and does not
  scale, because it is not the box coming back — a `title` line is 1.05em and
  the pending spinner is 1.1em, so with none at all the target would fall under
  the 24px it owes. Measured at 29px, flush with its column.

- `[Game]` **A choice strip that wraps is ruled between its rows.** The rules
  were a `border-right` on each segment and a `:last-child` that dropped the
  last one, which can only rule the axis it was written for: the five games fit
  a laptop on one row and wrap on a phone, and the boundary between those two
  rows was simply absent — as it was on every wrapped strip in the settings
  panel, up to six rows deep on the quiz's subjects. The rules are gaps with the
  strip's own ground showing through now, so they run both ways and no
  `:last-child` has to name the end of a row it cannot see. The genre grid keeps
  its own column counts and drops the three overrides it needed to say this
  locally; they are twelve's divisors now rather than `auto-fit`, which landed
  on five columns at laptop width and left three cells of bare ground where a
  genre should be.

- `[Game]` **A console refused a seat is told why.** The seat is withheld
  wherever the round ends in a verdict this screen has to grant, which is the
  rule — but the control simply vanished, and a quiz or a blind test left on
  *first to buzz* is a room that could have had one. The host's setup is
  remembered **per game**, so a room arrives in that state without anybody
  choosing it this evening: pick the quiz, and the mode it was last left on
  comes back with it. The fold now says so where the control was, and names the
  way out rather than the rule, because the strip that undoes it is four lines
  up. `isSeatWithheldByMode` is the rule, and it is narrower than
  `isJudgedByHost` on purpose — the bare buzzer offers no other mode and a room
  that has picked no game is waiting on the lobby, so neither has anything to
  explain.

- `[Game]` **A seat whose screen has gone is named, not dimmed.** Every board in
  the product said it with `opacity: 0.45` and nothing else, which takes the
  whole row under 4.5:1 on all six fields and says nothing at all to a reader
  who cannot tell two inks apart. The row carries the word beside the name now,
  and the ink only seconds it — on the console's roster, on both final boards
  and on the lobby roster the phone just gained.

- `[Game]` **The buzz floor's clock is centred under the buzzer it belongs to**,
  and follows the lines naming whose window it is rather than preceding them. It
  had sat flush left for as long as it was one player's own clock on a screen
  nobody else read.

- `[Game]` **The page stops laying itself out under the notch.**
  `viewport-fit=cover` was declared and nothing read `env(safe-area-inset-*)`, so
  a phone drew the page to the full screen and paid nothing for it: on a Dynamic
  Island the fixed menu — the only way to reach the three exits mid-round — sat
  43px inside the status bar, in landscape a 59px column of content went under
  the housing whichever way the phone was turned, and the bottom of the player's
  screen rested on the home indicator, which eats the swipe rather than merely
  overlapping it. `--layout-padding` has a per-side form now, each the `max()` of
  the padding and that edge's inset, and the two page mixins and the menu are all
  that read them. Nothing changes where the insets are nought, which is every
  desktop and every phone without a cutout

- `[Server]` **Changing the genre mid-game now changes the music.** Two chart
  sources compared equal whatever genres they held, so a host who moved a
  running room from rock to jazz kept getting rock until the pool ran dry — and
  what they had asked for only arrived once it did. The comparison is over the
  selection itself now, on both list-shaped sources, and ignores the order the
  strip hands it back in. `track-pool.test.ts` is new and holds it
- `[Game]` **A refused join can be corrected again.** The field kept its invalid
  state after the refusal, which leaves the input's *native* validity false — so
  the button looked alive, Enter did nothing, and nothing was logged anywhere. It
  was reachable before; trying a stored name on arrival puts it on the main path,
  which is how it was found
- **A screen that plays the room it runs keeps its seat.** The name it was
  playing under lived nowhere but the page, so a tab dropped on a screen lock —
  routine on Android, and a reload rather than a blink — came back running the
  room and playing in nothing: no answer field, a greyed-out name on the board,
  and the only way to sit back down was to end the game. The name is kept with
  the room now, so the screen comes back to the same seat and the same score
- `[Game]` **The seat can be taken back mid-game.** It was offered in the lobby
  and nowhere else, which turned an evening's worth of playing into a lost one
  the moment a seat went for any reason. It is on every screen between rounds
  now, and held back only while a round is running — taking it there would
  interrupt the clip the room is listening to
- `[Shared]` **Choosing a game the screen has to judge takes its seat back.** The
  picker sits beside the QR code, where that screen may already be playing, and
  nothing took the seat away when the room moved to a game whose answers it has
  to grant: it stayed on the board, unable to score, as the only screen that
  could judge the round. The room decides now, on both sides of the wire and on
  the frame that changes it
- `[Game]` **A name too long for the room to accept can no longer be typed into
  the seat.** The field had no limit where the join form has always had one, and
  a name past twenty characters is a message the room cannot read at all — so it
  failed with nothing on screen to say why
- `[Game]` **A round that paid you nothing says so, and every screen says where
  its owner stands.** A phone showed the answer and then a `+N` only if that
  player had gained: everybody else got the answer and silence, with no way to
  tell a round they lost from a round that was never scored. The reveal now
  carries a line either way, and the strip at the top of the screen spends the
  line it was giving the room's size on a place in it instead — *2nd of 6*,
  which says both. The room's full board stays where the room can read it
  together, and the one row worth carrying onto a phone comes with it: how far
  behind the player above, by name, because that is what makes somebody look up
  from their screen rather than down at it
- `[Game]` **The screen running the reflex race can race on it.** The seat was
  withheld from every round answered by a buzz, because such a round needs
  somebody reading the answer to grant it — and the reflex race has no answer and
  no judge, so it was caught by the mode it happens to share rather than by
  anything true about it. It offers the seat now, and the console plays on the
  same screen the room is watching: the field it is staring at takes the press,
  so nothing is added for the table to look at and nothing ticks that could be
  counted. A false start on that screen is named there, and the thumb's own time
  lands on the board with everyone else's. The bare buzzer still refuses the
  seat, and now says so for the right reason
- `[Server]` **A console that gives up its own seat is told the answer again.**
  The ✕ in the roster sits beside the host's own row, and pressing it took the
  player off the roster without taking the seat off the connection: the room no
  longer had that player, and the console went on being served the round with
  the answer withheld — a judge with nothing left to judge with, for the rest of
  the game. The seat is dropped wherever the roster loses it now, by any of the
  three exits rather than only the one that screen chose
- `[Game]` **And that screen stops thinking it is still playing.** Whether it
  holds a seat is read off the room rather than off what it once asked for, so
  the seat control, the menu's exits and its own answer form all follow the
  roster. Removing yourself goes out as *leaving*, which is what it is: aimed at
  your own row, an eviction left the nickname on the socket and the next
  reconnect quietly sat you back down
- `[Game]` **A long candidate no longer runs out of its own button.** Every
  control in the product refuses a line break, because a label is two or three
  words somebody chose — and none of a round's four candidates was chosen: a
  track title is as long as it is. They wrap and the box grows now, including a
  title with no spaces in it at all. Wrapping rather than ellipsising, unlike the
  scoreboard one screen away: those four are being *told apart*, and the tail is
  often what does it
- `[Game]` **Your own row is stamped rather than signposted.** The `←` beside
  your nickname was generated content — read aloud by some screen readers and by
  none of the others, so the row was either mislabelled or unlabelled depending
  on the reader. It is the ink block a banked half already wears, which survives
  all six phase colours by being the ink rather than a shade of it, with the word
  itself travelling hidden in the markup
- `[Game]` **A hover is painted only where a pointer can hover.** iOS fires a
  second `pointerenter` as a mouse and react-aria's guard against it misses on a
  busy main thread, which is how one of four choice buttons stood filled for a
  whole round. The press still paints everywhere — it is the whole of a thumb's
  feedback
- `[Game]` **The phone's final board printed every nickname as one letter.** The
  end-of-game screen centres its contents, which shrink-wraps a list to its
  min-content — and a nickname's min-content is zero, because `overflow: hidden`
  is what buys it its ellipsis. The board takes the column now
- `[Core]` **A typed answer stopped being paid for the wrong one.** *5 minutes*
  is eight characters, so the matcher forgave one correction — and the question
  offering it offered *7 minutes* beside it. Ninety-three questions in the bank
  had that shape, and two hundred spelling quizzes had it worse: asked whether
  it is *Accueil* or *Acueil*, the matcher answered for the room. A row's three
  decoys are the bank saying out loud what a different answer is, so forgiveness
  now stops one edit short of the nearest — an answer nothing crowds keeps all
  of it, and *kate winslett* is still Kate Winslet
- `[Core]` **The music catalogue's rules stopped following the quiz around.**
  Folding `(Radio Edit)` and `- Remastered 2011` away is what makes a track
  title typable; applied to a question it turned *River Horse (Greek)* into its
  own decoy *River Horse (Latin)*, and *1915 - 1916* into *1915 - 1918*. It
  belongs to the blind test's matcher and to nothing else now. A leading article
  went the other way: a room says *Cervin* where the bank holds *Le Cervin*, and
  312 rows were refusing it
- `[Server]` **Twenty questions no room could win are out of the bank**, and the
  builder that assembles it applies the same rule rather than handing them back
  on the next rebuild: eight French rows whose decoy differs from the answer by
  an accent alone, and twelve English ones whose answer is punctuation — `-`
  among Ed Sheeran's albums, `C++` beside `C#`. One real misspelling was
  corrected, *Alvatraz* to Alcatraz, which its own anecdote had been spelling
  right underneath. The credits name both, as the licence asks
- `[Server]` The builder was writing to `infrastructure/quiz/`, a directory the
  bank left some time ago, so a rebuild would have produced a second file and
  changed nothing that ships
- `[Game]` Two gaps set in `--space-3xs` were collapsing to nothing, in the
  credits and in Le Fake's board of lies — the token does not exist. They are
  `--space-2xs` now rather than a new step: 4px is the scale's floor on purpose
- **A player the host removes is told so.** They were removed from the roster and
  left holding an open socket: the phone kept receiving the room with a `youId`
  nobody had any more, fell back to *You* and `0`, and simply stopped counting.
  It lands on the same screen a closed room does now, with its own line, and the
  seat it held is forgotten — the room still answers, so a reload holding the old
  claim would have walked straight back in
- `[Server]` **A screen that was running the game and playing in it gives up both
  when its tab closes.** The seat used to survive for good: nothing marked it
  away, so that name stayed lit on every screen for the rest of the evening, and
  the sweeper never came for it either because the stamp it reads was never
  written
- `[Game]` **The credits page has a way back**, and is no longer offered from
  inside a room. Following it out closed the room's socket, which the server
  cannot tell from a screen that dropped off — a host who went to read a licence
  froze the round on every phone, with their own screen saying nothing about it.
  The address still resolves, so a shared link and a reload both work
- `[Game]` `Afficher le code de reprise` no longer runs past the edge of its own
  button in French. The menu is a fixed 320px box while the controls in it are
  sized against the viewport, and a label there is now allowed the line break
  every other control in the product refuses
- `[Server]` **A phone that comes back no longer plays out the game greyed
  out.** An app switch or a Wi-Fi handover leaves the old socket half-open, so
  the server welcomes the replacement first and hears the original die
  afterwards — and that death marked the seat away for good, on a player who was
  sitting right there. Her name stayed grey to the whole room for the rest of
  the game, and a buzz she had just taken was handed back. Worse than either: the
  stamp it left made her seat look abandoned, so ten minutes on, the sweeper
  would have taken her seat and her score mid-game. A seat another live socket
  still holds is no longer given up
- `[Game]` **A phone that reloads mid-round comes back having answered.** The
  four choice buttons remembered the pick in local state and nothing else, so a
  reload — or an iOS tab the system had discarded — brought them back live over
  an answer the server already held. The second tap was refused, and that refusal
  was displayed nowhere: the round simply stopped responding. The buttons now
  read the round's own answers, which survive the reload the way the score does
- `[Game]` **A control that was hovered when it went dead no longer stays
  painted.** Any variant's hover outranked the disabled rule, so a state left on
  the element at the moment it was disabled kept its colours — a choice button
  stood white on a dark screen for a whole round on the phone that found it.
  Every variant's hover and press now stand down when the control is disabled
- `[Server]` **A second console tab closing no longer freezes the room.** Any
  non-player socket dropping put the round on hold — all four timers cancelled,
  the clock stopped — without ever asking whether another console was still
  open. The surviving screen went on broadcasting `isHostConnected: true`, so no
  phone showed the host-away screen either: the game simply stopped, and nothing
  on any screen said why. Only a reload brought it back. The hold now waits
  until the room has no console left at all
- `[Server]` **A second console tab opening no longer rewinds the round.** Every
  host `hello` resumed the round, and resuming one that was never held restamps
  its clock from that instant — so a tab duplicated forty seconds into a clip
  handed every phone its progress bar back at full and pushed the deadline out
  by forty seconds. A countdown fared worse and restarted whole, which is the
  one thing it exists never to do. A console arriving where one is already
  connected is a second screen, not a host coming back, and now leaves the round
  where it found it
- `[Game]` **A browser turned away at a room's door no longer keeps a seat
  there.** The claim is written before the `hello` that carries it, so a screen
  refused with `host_already_connected` — or one asking for a room that has
  stopped resolving — held a seat it was never given, at the head of a store
  bounded at eight, where it evicted a real one rather than ageing out. The two
  refusals that mean the seat was never granted now drop it; a version mismatch
  and a malformed frame deliberately do not, since they refuse the frame rather
  than the claim and a deploy mid-party would cost every device its place
- `[Server]` **A phone that arrives mid-round no longer holds the round up.**
  Every predicate deciding whether a phase could close read the live roster, so
  someone joining during a clip made "everybody has answered" false and a round
  that would have ended on its last answer ran to its full deadline instead —
  the table sat there. A round now stamps who it opened on when its clip starts,
  and waits for those players and nobody else. The seat is kept and the next
  round is played like anybody else's: joining late costs a round, not a game
- `[Server]` A latecomer can no longer act in the round they walked in on. A
  buzz, an answer, a lie and a vote were each guarded on phase, round and mode
  but never on having been there, so somebody arriving during Le Fake's vote
  could score two points for finding the truth among lies they never saw. All
  four are refused with `joined_mid_round`
- `[Server]` A buzzer round every seated player has missed reveals itself again.
  A phone that joined after the lockouts counted as somebody who could still
  answer, so the round waited on the one person in the room who could not
- `[Game]` **A phone that walks in on a round is told so**, on a screen of its
  own: *Au prochain tour*, and its seat is safe. It used to be handed the round
  in play — a field, four choices or a board of lies — every one of which the
  server was already refusing. The screen carries one idea and nothing else,
  because the scoreline above it already names the room and the round's own bar
  is already draining beside it
- `[Game]` The blind test's source preview could hold a refusal from the
  previous query underneath a fresh set of results: a title list, an error and a
  progress flag standing beside each other carried eight combinations for four
  real states. They are one value now, and the impossible ones cannot be written
- `[Game]` A refusal no longer outlives the moment it was about. The socket kept
  its last error until it reconnected, so a message about something the room had
  stopped doing stayed on screen — visible for the first time in a game whose
  round has two phases, where "that is the real answer" sat under the vote a
  minute after it was written
- `[Game]` A field the server refused can be used again. react-aria marks an
  invalid field on the *form*, so a native submit of it silently did nothing —
  the button looked alive and the press was swallowed. Typing now clears the
  refusal, which is what a form should do anyway
- `[Game]` The front door's tagline no longer runs under the corner menu. A
  centred column only clears that corner once the viewport is far wider than the
  column, so it collided at every width from a phone up to about 1 200px. The
  page starts below the menu instead of beside it — giving up the width would
  have cost a phone's headline a third of its measure
- `[Game]` The room code stays on one line. It was sized against the viewport,
  which stopped being the width it gets the day the console grew a ceiling; it is
  sized against its own column now, which is what the design always claimed it
  was
- `[Server]` A question with nothing to add says nothing. Upstream keeps its
  `anecdote` field even when it is empty, and what it leaves there is `-`, `P`
  or the empty string — 362 of the 1 800 rows, so one round in five put a stray
  dash under the answer on the screen the whole room is reading. The ingestion
  script drops an anecdote with no sentence in it, and the bank is rebuilt
- `[Game]` The control variants all name what the eye sees again. `ghost` named
  how important an action was while `filled` and `outlined` named the material,
  and it was underlined — so the moment a second underlined thing existed,
  neither name told you which was which. It is `underlined` now, and the three
  read as one family
- `[Game]` A device stops collecting dead seats. Every room it had played kept a
  storage key of its own and nothing ever removed one — a browser used for a few
  evenings of testing held seventy-three, all but the last naming a code that had
  stopped resolving, and disbanding a room *added* one on every phone in it,
  because a phone told the room is gone runs no code to tidy up after it. Seats
  are one store now, pruned as each is claimed to the eight most recent and
  nothing claimed more than a day ago. The keys of the old shape are swept on the
  first launch that finds no store, and dropped rather than carried over: they
  are undated, so the eight worth keeping cannot be told from the rest
- `[Game]` The host's roster keeps *Remove* on the row it belongs to. A row is a
  grid of three tracks and the roster puts four things in it, so the button fell
  to an implicit second row and into the 2ch rank track — where a button that
  will not wrap overflows on both sides, which is what put it left of the row's
  own left edge and hard against the edge of a phone. The fourth track is
  declared only where a fourth child exists: an empty one would still pay its
  gap on the three boards that are read rather than managed
- `[Game]` *You are the only one who knows who is in the room* is the switch's
  own description now, not a line standing beside it. It began at the panel's
  edge — under the 52px track rather than under the label it explains — and
  nothing tied the two together for a screen reader. react-aria deprecated
  `Switch` in the version installed here in favour of `SwitchField` +
  `SwitchButton`, and the field publishes the described-by a description needs,
  so the wrapper took the migration and the alignment and the wiring both came
  with it. Every hover, press and focus selector moved to the button in the same
  pass: those three render props exist on that half alone, and a selector left
  behind on the field would have matched nothing without failing to compile
- `[Game]` **Le Fake's reveal stopped hiding the standings below the fold.** A
  room of ten writing ten lies filled 2 377px of a 1080px screen: the board alone
  ran past the bottom, and the scores — the half the table turns to the screen
  for — sat eight hundred pixels under it, on a television nobody walks over to
  scroll. The board and the standings sit side by side now, the geometry the room
  read the vote in one press earlier, and each divides the screen rather than
  taking the height its own type adds up to. Who wrote a lie and who it caught
  share one row instead of a line of the screen each. A table of five reads it at
  the size it always did; only a room that wrote ten reads them smaller, which is
  the room with more to read
- `[Game]` **A long answer stopped running off the reveal.** A quiz answer is
  whatever the bank wrote — nine characters at the median, and eighty-three at
  the longest, which at the size the room reads from across it was six lines and
  most of the screen before a single player was listed. It is set to what it
  costs now: the ninety-five per cent that were always short still fill the
  screen, and the long ones stop taking it. Track titles at the blind test's
  reveal answer to the same rule
- `[Game]` **The reveal's roll call fits the screen at ten players.** Who
  answered what, one line each, ran past the bottom of the room's screen once
  enough people played — so the list now divides the height it has by the number
  of lines in it. A table of five reads it exactly as before, and the recap that
  stays up while the next round counts in follows the same rule
- `[Game]` **The buzzer's reveal is legible from across the room again.** With
  nothing to give away, that screen is a single line — who took the point — and
  it was being drawn smaller than the standings beside it, on an otherwise empty
  screen. It is set at the size it was always meant to be
- `[Game]` **A long track no longer eats the name of whoever answered it.** On
  the reveal's roll call, the nickname and the answer shared the row's shortfall
  in proportion to their length, so a fifty-seven-character title and artist cut
  `Zoé` down to `Z…` with two hundred and fifty pixels going spare at the other
  end of the same line. The name is drawn on its own text now and the answer
  takes what is left: half a title still reads, half a nickname names nobody.
  The longest nickname is held to half the row so it cannot swallow the answer
  in turn

### Internal

- **Dependencies up to latest, majors and the package manager included.**
  pnpm 11.25 to **12.3.4** — the Rust rewrite, whose npm package is a wrapper
  that fetches a native binary, so the lockfile now names pnpm itself under
  `packageManagerDependencies` with a `@pnpm/exe.*` entry per platform;
  `lockfileVersion` stays `'9.0'` and a clean `--frozen-lockfile` install takes
  13 seconds. **Vitest 4 to 5** across all three suites: 511 tests, three
  configs, not one line changed — every breaking change in that release lands on
  something this repo does not do, `sequential`, benchmarks, the moved entry
  points, `toThrow('')`, an unawaited `resolves`. The one that could have landed
  silently is `clearMocks` defaulting to `true`, and every mock here is armed
  inside the test that reads it. **tsdown 0.22 to 0.23**, which deletes the
  options it carried for tsup's sake and flips `deps.resolveDepSubpath` to
  `false` — the server bundle was built on both and is byte-identical at
  2 632 873 bytes. Then the patches: react-aria-components 1.21.1, hono 4.13.7,
  hono-rate-limiter 0.5.4, sass 1.104, Playwright 1.63, `@types/react-dom`
  19.2.7, `@rolldown/plugin-babel` 0.2.4 and Biome 2.5.12, which reformats a
  `biome-ignore` inside a type-argument list and moves its own `$schema` pin.

  `@babel/core` stays on 7.29.7 with 8.0.1 out, which is what
  `vite.config.ts` has thrown on since the pin was written.

  Three things the upgrade uncovered rather than caused, and the third is the
  one to remember. `onlyBuiltDependencies` left `pnpm-workspace.yaml`: it has
  done nothing since **v11** replaced it with `allowBuilds`, which sat four
  lines above it naming the same two packages — a dead setting kept beside its
  live replacement, and pnpm 12 still tolerates the key, which is why it would
  have stayed forever. `@vitest/coverage-v8` was in no `package.json` while all
  three vitest configs declare `provider: 'v8'`, so `vitest --coverage` could
  never run without prompting for an install; it is a dev dependency of all
  three now, and `packages/core` reports 96.41% of statements covered.

  And **the engine floor stopped being enforced.** `package.json` declares
  `engines`, `pnpm-workspace.yaml` set `engineStrict: true` and `.npmrc` set
  `engine-strict=true` — three lines saying the install must refuse a machine
  that cannot satisfy them. Under pnpm 12 it does not: a fresh install of this
  workspace with `engines.node` set to `>=99.0.0` completed in 12.7 seconds
  without an error or a warning, where pnpm 10 refused it outright. pnpm 12's
  `engineStrict` governs the engines a *dependency* declares — the release notes
  spend it reaching further into optional subtrees — and dropped the check on
  the root project's own. So `.npmrc` is deleted, it held that key and nothing
  else, and the comment above `engineStrict` says what the setting now does
  instead of what it used to. What still refuses a wrong pnpm is the
  `packageManager` pin, which 12 turned into a hard `ERR_PNPM_BAD_PM_VERSION`.
  Nothing refuses a wrong Node any more; CI, Render and `.nvmrc` each pin 24 on
  their own.


- `[Shared]` **The i18n engine is one library again, shared with the project
  it was adapted from.** It moves to `packages/core/src/i18n/vendor/` as four files
  that name nothing of this project: `defineTranslations` becomes
  `defineDictionary`, `TranslationsLike` becomes `DictionaryFor`, and
  `createTranslator` takes `dictionary` where it took `translations`. Not one
  call site of `translate` changed. Above it sits a new door, `createI18n`,
  which binds each locale to its dictionary once: the provider and the boot-time
  negotiation now call `i18n.translator(locale)` and `i18n.negotiate(...)` and
  never name a dictionary, so a translator holding the French one under the tag
  `en` is no longer expressible. It caches per locale, which the provider did
  not — it rebuilt the translator on every render, handing a new identity to
  anything memoising on it. `isLocale` moves to `@taverla/protocol/locale`
  beside `LOCALES` and `localeSchema`, where a guard over a contract value
  belongs, which leaves `packages/core/src/i18n/` holding the library and
  nothing else. What came back from the other copy:
  `WellFormed` now refuses a leaf that is not a message at all — `{ count: 3 }`
  compiled before, because a mapped type over a primitive returns that
  primitive — `negotiateLocale` replaces the region-stripping inside
  `pickLocale` and tries each tag whole before dropping a subtag, so a supported
  `pt-BR` beats a bare `pt`, each `Intl` formatter is now built once per translator and kept, where both
  copies rebuilt one on every substitution, and the library carries a README
  again. New:
  `translator.types.test.ts` writes every rule that is a compile error at a call
  site as the type it resolves to, since a compile error cannot be caught by a
  test that has to compile; `tsc --noEmit` checks them.
  Four capabilities were added on top, none of them used here yet — the library
  is meant to be reusable, and a gap that is cheap to close now is expensive to
  discover in another project later: `{x:relative}` (`Intl.RelativeTimeFormat`,
  unit declared with the message, so `-1` reads *hier*), `{x:displayname}`
  (`Intl.DisplayNames`), `i18n.compare(locale, options?)` (`Intl.Collator`, so a
  sorted list puts `Émile` between `Adrien` and `Zoé` rather than after both),
  and `translate.rich(key, values)`, which cuts a message at the spans it marks —
  `Lis les <link>conditions</link>` — and hands each to the function named after
  it. **`rich` names no framework**: a span function returns whatever the caller
  wants and the return type is inferred from it. One defect surfaced while
  testing that: negotiation only walked *up* a tag, so an app shipping `fr-FR`
  and `fr-CA` and no plain `fr` answered English to a browser asking for `fr`.
  The library now lives in its own repository, `C:/git/typed-i18n`, from which
  both copies are taken verbatim.

- `[Game]` **The breakpoint is a mixin now, not a comparison repeated ten
  times.** `@include layout.wide` and `layout.narrow` wrap the two media
  queries, and `$wide-screen` is left with three references: its declaration,
  those two mixins, and the token derived from it. The ten call sites outside
  `_layout.sass` opened with `>=` or `<` on the same number and had to stay each
  other's exact complement — the one thing a grep cannot check, and the one that
  breaks the day the boundary stops being `>=`. It stays a SASS variable because
  a media query cannot read a custom property, which is the only reason any
  SASS variable is left in the repo.

- `[Game]` **`@babel/core` is back on 7.x, and the build refuses anything
  else.** The pin drifted to `^8.0.1` two dependency bumps ago — which is what
  `pnpm -r up -L` does to a range — and under Babel 8 the React Compiler cannot
  parse the AST for a destructured parameter with a default, so it bails on
  that function alone with the build green. Measured with the compiler's own
  `logger`: 113 successes and 3 errors on 8, 114 and 2 on 7. **One function**,
  and the one it took was `TextField`, which every form in the product renders.
  The two errors that stay are `round-audio.ts` mutating a value the compiler
  will not let it, and have nothing to do with Babel.

  The note in `docs/component-shape.md` said *most of the app* and was wrong by
  two orders of magnitude, which is part of why nobody went looking; it now
  carries the measurement and how to repeat it. And the pin stops being a
  sentence: `vite.config.ts` throws on any `@babel/core` outside 7.x, so the
  next `deps:upgrade` fails loudly instead of quietly costing a component.

- `[Game]` **The route table is keyed by path, so it cannot lose one or answer
  the same one twice.** Both shipped once: `paths.game` was given to the player
  screen as well as the shelf, which left `/play/XXXX` on the 404 and
  PlayerPage unreachable with build and lint green — an e2e journey was the
  only thing that said so, because two route entries holding the wrong
  constant are two strings and nothing more. `lazyPageFor` is a record over
  every path but `home`, checked with `satisfies`: a missing key is a compile
  error, and a repeated one has nowhere to go.

- `[Game]` **A path is built through a params type with no escape hatch.**
  `generatePath`'s own intersects an index signature over every string, so a
  name the pattern does not carry — a typo beside the right one, a param since
  renamed — type-checks and is dropped in silence, and the argument stays
  optional where the pattern needs one. `pathFor` takes a plain record over
  `PathParam`'s names, which puts excess-property checking back and makes the
  argument required; it delegates to `generatePath<string>`, collapsing the
  loose type to that index signature alone, so the percent-encoding is kept and
  no cast is needed.

- **Dependencies up to latest**, no majors outstanding: react-aria-components
  1.20 to 1.21, zod 4.4 to 4.5, react-router 8.3.0 to 8.3.1, hono 4.13.4 to
  4.13.5, biome, tsx, `@types/node`, `@vitejs/plugin-react`,
  `@react-aria/optimize-locales-plugin` and `@hono/zod-validator`; pnpm 11.22 to
  11.25. 1.21 adds no deprecation to the list 1.20 already carried, and the four
  left on it are all unused here. The bundle grew 21 KiB and Lighthouse did not
  move: 0.94 performance, 1 everywhere else.

- **`pnpm deps:upgrade` could never run**, and now updates the three things a
  version bump touches. It opened on `pnpm self-update`, which refuses outright
  under Corepack — `ERR_PNPM_CANT_SELF_UPDATE_IN_COREPACK` — so the `&&` behind
  it meant the upgrade the script exists for never happened. The command was
  wrong, not the intent: pnpm *should* move with the rest, so
  `corepack use pnpm@latest` is what does it, which is also what writes the
  `packageManager` field and its hash.

  `biome migrate --write` closes the chain, because upgrading Biome is two
  edits and only one of them is the version. `biome.json` pins a `$schema` at
  the exact release, so a bump leaves the config validating against the previous
  one — editors keep offering the old options and stop knowing the new ones,
  silently and for as long as nobody looks. It is Biome's own command for it,
  so it carries any config migration the release needs at the same time.

  `managePackageManagerVersions` went with it: pnpm 11 does not recognise the
  setting, so it warned on every command and did nothing — and what it claimed
  to do, self-installing the pinned `packageManager`, is exactly what the
  self-update above was refused for. Corepack is what manages it on the Node 24
  this repo pins.

- **`pnpm lighthouse` runs Lighthouse CI over the built app**, against the real
  server rather than a preview: `pnpm --filter @taverla/server preview` serves
  `dist` the way `render.yaml` does, so the numbers are the deployment's. Three
  runs each over the home page, a game's front door and the credits, asserted on
  the median at 1 for accessibility, best practices and SEO and 0.9 for
  performance. It is deliberately not in `pnpm validate`: it builds, boots a
  server and runs nine audits.

  `scripts/lighthouse.mjs` exists for one reason. `lhci` launches Chrome through
  `chrome-launcher`, which deletes the temporary profile it made when it kills
  the browser — and on Windows that delete fails `EPERM` every single run, after
  the audit is finished and the report is already on disk. There is no flag for
  it. Handing Lighthouse a `port` is the way out: `chrome-launcher` attaches to
  what is already listening, so it creates no profile and its `kill()` returns
  before the delete. The browser is Playwright's Chromium, which is the one the
  end-to-end journeys already run in.

- `[Game]` **`Radio` is deprecated in react-aria-components 1.20**, in favour of
  `RadioField` + `RadioButton` — the same split `Switch` already took here, and
  with the same trap: `isHovered`, `isPressed` and `isFocusVisible` belong to
  the button and not to the field, so every state selector goes on the button.
  `segment` is the button, and the field is laid out away with
  `display: contents` so the button stays the flex or grid item the strip
  arranges. One `.segment` rule still covers this and `ToggleGroup`'s bare
  button alike.

- `[Game]` **`useParams` is narrowed by `PathParam` rather than
  `ParamParseKey`.** They are the same type with one difference, and it is the
  one that matters: `ParamParseKey` answers `string` for a pattern carrying no
  parameter, so a pattern that lost its `:` buys an index signature and every
  name still reads as `string | undefined` with nothing to say it stopped
  matching. `PathParam` answers `never`, and the name stops compiling.

- `[Shared]` **`Standing.chasing` is gone**, with `player.standing.behind` in
  both locales and the test that pinned its tie rule. It answered *who is one
  row above you and by how much*, on a phone that was not allowed the board —
  and the board now says it by name, by points and for everybody. What is left
  of `standingOf` is the place and the size of the room, which is the pair the
  persistent strip carries at every phase; its doc said the opposite and said it
  as doctrine

- **`not_implemented` is gone from the protocol.** It was the one code that
  existed for work that was not built yet, it stopped being sent four games ago,
  and it was still shipping a translated string in both locales. The rule that
  replaces it is in `docs/realtime-protocol.md`: a code exists when something
  sends it. Five documents describing it as a live marker were corrected with
  it, along with two gaps `00-bootstrap.md` still listed as open — an absent
  host has been visible to players and room creation has been rate limited for
  some time
- **There is a Dockerfile, and CI builds it.** Render still deploys from its own
  Node runtime and never reads the image; it exists for a host that wants one
  and for a production run on a laptop. `pnpm deploy` needs `--legacy` from
  pnpm 10 on, and the image reproduces the deployment's directory layout because
  `SERVE_GAME_FROM` resolves against the working directory. The CI job is what
  keeps a file nothing else builds from rotting unnoticed
- The server announces itself as Taverla rather than as the blind test, which it
  stopped being three games ago
- The game picker is on the lobby stage and in the settings fold, one at a time.
  While the room fills up the game is the decision everyone is waiting on, so it
  sits beside the QR code with the chosen game's pitch under it; once a round
  has run it is a setting like the countdown
- `useCreateRoom` holds the one trip to the network both front doors make. The
  shelf's page opens a room with nothing chosen, a game's page carries which,
  and the console either lands on is the same
- **One journey per door, rather than a fourth.** `full-game.spec.ts` goes
  through the front page and picks the game on the console — the ordinary way
  in — and `everyone-answers.spec.ts` keeps the shortcut. Writing it turned up a
  trap worth the comment it now carries: both pages have a "Create a room", so a
  click landing before the navigation opens a room with no game, and the failure
  surfaces a minute later at a launch that stays greyed out
- The third game moved four strings out of the first two's namespaces, which is
  the i18n rule's own test working: "would the second game show this
  unchanged?". The host's right/wrong pair is `host.verdict.*` where it was the
  bare buzzer's, and the field a simultaneous round is answered in — its label,
  its send, its "waiting for the others", its "as many goes as you like" — is
  `round.answer.*` where it was the blind test's. What stayed game-owned is what
  only that game can say: the halves, and "it was"
- `AskedQuestion` is one component on both surfaces, sized off the viewport
  rather than off which screen is rendering it. The question is read at four
  metres and in a hand, and two components would have been the same clamp twice.
  It is rendered by the console and by the player screen rather than inside the
  answer forms, which the console also shows — a seated host would have read the
  question twice
- `holdsTheAnswer` says whether the host still has what the round is judged
  against, over every arm of `HostRoundContent`. The verdict panel took a
  `HostTrack` and a `GameKind`, which is the same fact spelled twice and only
  the blind test's half of it
- The socket harness opens a room on the game its settings name. It opened one
  on a shelved game and moved it, because the quiz was served and not shelved;
  that gate closed when the quiz went on the shelf
- The host console is eight files where it was one. 602 lines held six
  components, and the five sets of controls a phase offers — the lobby's launch,
  the round's reveal, the two ways out of a reveal, the three out of a finished
  game — shared no state with each other and nothing but their props with the
  page. `HostActions` is now a switch over the phase and one file per branch,
  including the branch that answers nothing: while the floor is held the only
  decision left is the verdict, and the stage owns that
- **Line count turned out to be a poor proxy for a component worth cutting.**
  The two signals that predicted one here were an *asynchronous I/O routine* and
  a *decision that deserves a test* — recorded in `react-components.md`, along
  with the components the audit deliberately left long. `Stage` is 111 lines of
  phase branches that delegate to a panel each, and a file per branch to write
  `<RevealPanel />` is worse than the switch
- The line the setup fold shows while it is closed is `settingsSummary` in
  `@taverla/core/room/settings-summary`, and it has a test. It is not UI: it
  decides which of four fields a room has anything to say about — the game only
  when the shelf can name it, the source only for a blind test, the answer mode
  only where more than one is offered — and it reads the *draft* source rather
  than the committed one, because the picker commits on the launch and a summary
  that waited would contradict the control above it
- `isShelvedGame` is `@taverla/core/room/shelved-game`. It sat beside the
  translation-key builders, which is where it was needed first rather than what
  it is about, and the summary was about to be its second definition
- `usePlaylistPreview` holds the picker's one trip to the network. The component
  keeps the draft it renders from, and the hook keeps what came back
- Four strips in the settings panel each spelled out the same round trip —
  `String()` on the way down, a lookup and a guard on the way back, because
  react-aria addresses a segment by string. `NumberChoice` says it once

### Breaking Changes

- `[Shared]` `settings.game` is **nullable**, `POST /api/rooms` no longer
  requires a game, and `PROTOCOL_VERSION` goes to 9. Opening on a default was
  the cheap answer and was rejected: the lobby summary and every phone would
  have named a game nobody chose, and "still deciding" could not be expressed at
  all. The nullable costs a null case at some fifteen sites and buys what this
  repo argues for everywhere else — the guard on `host.startRound` *is* the
  narrowing that makes every downstream call type-check, exactly as
  `registerBuzz`'s guard is what produces the answer window.

  Three of those sites turned out to be reading the wrong field: `applyVerdict`,
  `timeOutBuzz` and the lockout button ask `round.content` which game they are
  in, because that is the game the round was *opened* on. `settings.game` is
  what the room is set to next
- `[Shared]` `no_game_chosen` is the refusal a room with no game answers a
  launch with. Its own code rather than `wrong_phase`, because the phase is
  right — the lobby is exactly where this happens — and what is missing is a
  decision the host can make on the screen in front of them
- `[Shared]` A room may be opened on the quiz, and `PROTOCOL_VERSION` goes to 8
  — so a tab left open across the deploy reloads instead of meeting a round it
  cannot render. `shelvedGames` and `gameKinds` now hold the same three, which
  is what shipping every game looks like rather than a sign the distinction was
  unnecessary: it exists for the window between a game being served and having
  screens, and the quiz spent a stage in exactly that window
- `[Shared]` A player is told what they hold in every game, not only the blind
  test. `yourVerdict` carries the whole `Verdict` union where it carried the
  `halves` arm alone. The reasoning that narrowed it — a game judged on one
  claim has no half to hold — was true and beside the point: a claim the
  *server* judges in silence needs the same feedback a pair of halves does, or a
  player who is already right keeps typing and the refusal they finally get
  reads as a lockout rather than as a win
- `[Shared]` A quiz round's answer becomes public as `revealedQuestion`,
  carrying the note as well — where the beach in the film actually is, why the
  record stood for forty years. It travels with the answer rather than beside
  it, because it gives the answer away
- `[Shared]` How a round is answered is an axis with its own settings, and
  `PROTOCOL_VERSION` goes to 7. `settings.mode` is a union discriminated on
  `kind`, beside `settings.game` and for the same reason: which game the room is
  playing and how it is answered are independent choices, and each owns settings
  the other cannot read. `answerWindowMs` moves into the buzzer arm, which makes
  `registerBuzz`'s guard against a hand-written buzz *be* the narrowing that
  produces the window — a mode where nobody buzzes can no longer reach it. Built
  on one field rather than the two the threshold asked for, because the field was
  in the wrong place, and that is a different fault from a missing abstraction
- `[Shared]` A verdict is judged in the shape its game is judged in, and
  `PROTOCOL_VERSION` goes to 6. `Verdict` was the blind test's two booleans, so
  paying a charade with both of them true would have scored one claim twice. It
  is a union now — `halves` for two independent claims, `single` for one —
  `verdictKindFor` says which a game takes, and `applyVerdict` refuses a shape
  the current game is not judged in, because a host socket is as forgeable as a
  player's. `yourVerdict` stays the `halves` arm alone: banking is what having
  two of them means, and a game judged on one claim has no half to hold
- `[Shared]` A room is opened *for* a game: `POST /api/rooms` carries which one,
  and the host lands on a console already set up. The shelf already had a door
  per game, so choosing again in the lobby was asking a question already
  answered — the picker there is for changing your mind. What a room may be
  opened for is `shelvedGames`, which is deliberately not `gameKinds`: the quiz
  has both its arms and no server behind them, and refusing it at the door beats
  refusing it at the first "start"
- `[Shared]` The room's settings and the round's content split by game, and
  `PROTOCOL_VERSION` goes to 4. `RoomSettings` and `RoundView` were the blind
  test wearing the room's name: what every game needs — answer mode, round
  count, countdown, auto-advance, when the round opens, the buzz, the lockout,
  the awards — stays on the room, and what the game *is asking* moves behind
  `settings.game` and `round.content`, unions discriminated on `kind`. The
  host's secret half moves the same way, into one `currentContent` that keeps
  the reason `currentTrack` and `currentAudioUrl` were ever two fields: a seated
  host still loses the track and keeps the audio. Built now because a second
  game exists to measure it against, which is the only moment the shared shape
  is knowable — see `docs/game-catalogue.md`
- `[Shared]` A typed answer is one `guess` where it was a `title` and an
  `artist`. Two fields asked a player to know *which* half they were holding
  before they could say it, and a typed round is won by firing the moment
  something surfaces

### Features

- `[Shared]` **A second game: a bare buzzer.** The server serves no content at
  all — no catalogue, no network call, no licensing question — and the room
  brings the charade, the quiz on paper or the lesson. What it guarantees is the
  one thing a room cannot do for itself: who pressed first. It is the case the
  seam was built for, and it disagreed with the first in four places, which is
  what a second case is for. Its one genuinely new rule is `locksOutOnMiss`: a
  blind test lockout expires when the clip does, but a charade has no such
  clock, so its host chooses whether a miss sits a player out and can reopen the
  field mid-round with `host.clearLockouts`. Everything else is deletions — a
  `content` arm carrying nothing but its name, a round timer that cancels
  instead of scheduling, and a reveal that is the scoreline alone
- `[Shared]` The settings stay within reach of a game already running. They lived
  in the lobby's fold, so the moment a game started they became unreachable — a
  host who wanted a longer countdown had to end the evening to get one. The fold
  moves to the host's footer, beside the volume, in every phase, and
  `host.updateSettings` lands on the round *after* the one on screen. Three
  settings cannot wait to be read and the server refuses them while a round is
  in play: `answerMode`, because a simultaneous round is scored on the way out
  and a typed round switched to `choice` would pay a typed answer at a pick's
  rate; `game.kind`, which would leave `round.content` on the arm the screens are
  rendering; and `roundDurationMs`, which cut below the time already spent ends
  the round on arrival. The console greys those three with a line saying they
  wait — a courtesy, since the guard on the socket is the rule. The seat is the
  one thing kept to the lobby, because taking it reopens the socket and a
  re-seat mid-round would drop the answer being typed
- `[Shared]` The floor has a clock. Buzzing costs nothing on its own, so a fast
  thumb attached to an empty head could hold a whole room until the host
  intervened. `answerWindowMs` is how long the floor is held before the server
  takes it back, and `null` is the same feature read from the other end: the
  screens count *up* from the buzz and the host decides when to cut in. Running
  out is the same outcome as answering wrong — no points, locked out, the round
  resumes — because that is what taking the floor and saying nothing cost
  everyone else, and because a pass with no lockout lets the same thumb take it
  straight back. Both screens read the same number, off the server's clock
  rather than a local timer started when the frame arrived
- `[Game]` Typing an answer is one field and as many goes as the clip allows. A
  guess is measured against the title and the artist independently — whichever
  it matches is banked — so "jean jacques goldman on ira" takes both and
  "daniel balavoine on ira" takes the title and still owes the artist. The pair
  pays 3 however it was reached, and the speed bonus ranks on the first guess
  that *banked* something rather than on arrival, or being quickly wrong would
  buy a place in the queue. A pick stays one shot: four candidates with retries
  is the answer with extra steps. `yourVerdict` carries what the reader holds,
  scoped to them — without it a second guess is a guess at what to guess at, and
  everyone else's progress stays secret until the reveal
- `[Game]` A visual world, replacing the prototype's dark-with-a-neon-accent
  look: the screen is a title card, and the phase is the colour. Six saturated
  fields, one per phase, so the far side of a room knows where the game is
  before reading a word. Archivo self-hosted, hard edges, and the buzzer as the
  one round object because it is the one physical button
- `[Server]` One origin in production: Hono serves the built SPA with an SPA
  fallback, so `/play/K3M9` resolves on a cold load and the QR code's
  `location.origin` holds without a proxy or a second domain
- `[Game]` The host console runs an evening: a genre picker, audio scheduled
  against the server clock, a judging panel that takes one tap, a reveal with
  the cover art, running scores and a final board that keeps the players for
  another game
- `[Game]` The phone plays: a countdown synchronised with every other device, a
  buzzer that answers on the press rather than the release, an honest reason
  whenever it is dead, and the reveal on the small screen too
- `[Server]` Only songs a room will recognise. Deezer's popularity score is the
  one field that separates a hit from AI-generated lo-fi, and the floor is set
  from measurements: classics sit at 830k–990k, the junk at 25k–405k
- `[Game]` Twelve Deezer genre charts to choose from, so the evening is a few
  thousand well-known tracks rather than today's global top 100
- `[Game]` A volume slider, and a switch that chains rounds by itself — the
  wait is served by the server, because the host screen is exactly the tab most
  likely to be in the background when its timers get throttled
- `[Server]` The round engine: a track drawn without repeats, a countdown every
  device lands on together, buzzes ordered by arrival, the host's verdict, and
  the reveal. A wrong answer locks that player out and the clip resumes for the
  others from where the buzz stopped it, rather than ending the round
- `[Server]` A round survives what a party does to it — the buzzer holder
  locking their phone, the host reloading, a player being removed mid-answer
- `[Shared]` The wire contract: role-scoped message unions, room views, error
  codes, and a codec that strips host-only fields from player frames
- `[Server]` Hono server with a native WebSocket endpoint — room creation, host
  claiming, player seats that survive a reload, live roster broadcast, and a
  clock handshake answered before the socket has even introduced itself
- `[Server]` Deezer adapter behind a domain port, proxied because
  `api.deezer.com` answers without an `Access-Control-Allow-Origin` header
- `[Game]` One Vite SPA serving both surfaces by lazy route: join, host console
  with QR code and live roster, player screen with a buzzer that explains why it
  is disabled
- `[Shared]` Pure domain rules with tests — clock offset estimation, room-code
  alphabet, buzz eligibility, competition ranking, locale negotiation
- `[Game]` English and French, with no i18n library: the English dictionary is
  the key type, so a missing translation does not compile. Server error codes
  are translated client-side and the server's `message` is no longer rendered
- `[Game]` Light and dark themes, resolved in CSS so the first paint cannot
  flash the wrong ground — `data-theme` is stamped only for an explicit choice
- `[Game]` One menu in the corner of every screen — language, theme, the
  connection and the way home — so the phone that arrived from a QR code can
  reach all of it without a settings page, and no screen is a dead end
- `[Game]` The join form remembers what you like being called, so the second
  room of the evening costs one tap instead of typing a name again
- `[Game]` The room code can be copied, for the half of joining that is not a
  QR code: the host copies it and sends it to someone on a laptop
- `[Game]` A nickname set at display size wraps instead of leaving the screen.
  Twenty characters is legal and nothing makes them breakable, so the winner's
  name and the "{nickname} buzzed" heading could both push a sideways scrollbar
  onto the page — worst on the phone, which is exactly where a host running the
  room from their hand would see it
- `[Game]` A game ends on a name. The final screen already listed everyone
  ranked, ties and all — what it never did was say who won, so a room read a
  table instead of hearing a result. The winner is now the largest thing on the
  screen, ties are named rather than broken, and a game nobody scored in says
  that instead of crowning whoever sorts first. Past eight players the board
  goes to two columns, flowing downwards so a ranking still reads 1, 2, 3
- `[Game]` Pages settle in rather than appearing. Eight pixels and a fade,
  quieter than the reveal on purpose — a navigation must not borrow the weight
  of what a round pays out — and carried by the two layout mixins, so the six
  screens cannot drift and the seventh inherits it. Nothing inside a running
  round moves: that surface is timing people
- `[Shared]` The host can take a seat and play, which is what one phone in the
  middle of a table needs. Their screen stops being told the track the moment
  they do — the judge's copy and the speaker's copy were one field, and pulling
  them apart is what made it possible to withhold one and keep the other. Not
  offered in buzzer mode: that round needs someone reading the answer to judge
  it, and a judge who is also answering is not one
- `[Game]` The scoring is stated where there is time to read it: under the
  control that chooses the mode on the host, and on the phone while it waits for
  the game to start. Nothing new appears during a round — those are the two
  moments nobody is against a clock
- `[Shared]` Typing is the default. The buzzer gives the floor to whoever is
  quickest and leaves the rest of the room watching, which is the wrong default
  for a party where everyone came to play
- `[Shared]` A right pick pays one point where typing the pair pays three.
  Recognising the answer among four is not the act of producing it from nothing,
  and paying them the same made the easy mode the optimal one
- `[Shared]` Two more ways to answer, and one game rather than three. **Four
  choices** puts the same candidates on every phone — drawn from the room's own
  pool, because three soul tracks beside one chart hit is not a question — and
  **typing it** takes the title and the artist as two fields worth a point
  each, with a bonus for holding both. Both are everyone at once: the clip does
  not stop for an answer, and the round ends when the last player is in or the
  clip runs out. Speed is a rank among whoever got it right, +2 then +1, so
  being quickly wrong wins nothing. The reveal then shows what everybody said,
  which is most of the fun of the round being over
- `[Shared]` The anti-cheat rule is restated rather than relaxed for choice
  mode: a player is handed four candidates and one of them *is* the answer,
  which is the game. Which one lives only in the server's round and reaches no
  frame — asserted over a whole round's transcript, and again at the codec
- `[Game]` Two front doors. `/` is Taverla's — it names the product and shows a
  shelf, laid out as a list rather than as a single title because the second
  game changes nothing there — and `/blindtest` is the game's own, where a room
  is opened. Typing a room code stays on the shelf: a code is a room, and the
  room knows which game it is running. No `game` field on the room and no
  registry: a union of one member is the abstraction `docs/game-catalogue.md`
  says to wait for
- `[Game]` The phone says the game is on hold whichever way the round is being
  answered. The reason travelled through the buzzer's own blocker, so a grid of
  four choices and a pair of text fields sat there looking answerable while the
  server had frozen everything
- `[Shared]` A host who walks away puts the game on hold instead of leaving it
  running in silence. Their browser is the room's speaker and its only judge, so
  a round without them burned clip time nobody could hear and hung on a verdict
  nobody could give. Everything time-driven stops, the clip keeps the seconds it
  had left, and the countdown is handed back whole rather than resumed late —
  its point is that every device lands on the first note together. No grace
  period, deliberately: freezing costs nothing and undoes itself, where waiting
  even five seconds spends five seconds of music on an empty room
- `[Game]` A screen for anything that throws, instead of a white page: the root
  route carries an error boundary offering a reload and the way home. Reload
  rather than retry, because the likeliest way to land there is a lazy chunk
  that stopped existing when the site redeployed under an open tab, and
  re-rendering asks for the same missing file
- `[Game]` The way in stays on the host screen for the whole game — a small QR
  and the code, in the corner. A room takes players at any phase, so someone
  arriving at the seventh round takes a seat and plays the eighth; the screen
  now says so
- `[Game]` The end of a game offers three ways on: another one with the same
  settings, back to the room to change them, or out to the home page
- `[Shared]` Several genres at once. The pool is every chosen chart merged, with
  a track that charts in two of them kept once — otherwise the overlap would be
  twice as likely to be drawn. Picking none means every genre, which is what the
  "all" stamp used to say and is now just the default state, and one chart being
  down thins the pool instead of killing the round
- `[Shared]` A difficulty, in three steps, from crowd-pleasers to what only the
  experts will name. It is the popularity floor the pool already applied, made
  adjustable — and it stays a Deezer number inside `deezer-client.ts`, because
  the room speaks in words a second catalogue would keep. The lobby's search
  preview carries it too, so what it counts is what the pool would hold
- `[Game]` The lobby sets the party: how many rounds, how long a clip runs, and
  how long the countdown lasts. All three were already carried by
  `host.updateSettings` and pinned to their defaults, so every evening was ten
  rounds of thirty seconds. The clip length is the one that changes how a room
  plays — thirty seconds is a long time to wait for people who knew it on the
  intro

### Improvements

- `[Server]` Everyone-at-once is no longer the blind test's alone. The whole
  simultaneous path — what a player has banked, how a guess is graded, when they
  are finished, what the round pays on the way out — was typed to two halves,
  which is one game's shape sitting on all of them. Stage 11 opened the seam on
  the host-judged buzzer and stopped there; this opens the other half.
  `pointsForSimultaneousAnswer` replaces the pair of halves-only prices and says
  the rule once: typing pays three where a pick pays one, in every game, because
  producing the answer from nothing is not the act of recognising it among four
- `[Server]` A quiz typed answer is matched against the whole of what was typed,
  which is where this game parts company with the blind test's matcher on
  purpose. Searching *inside* a line is what makes one field honest when it
  holds two claims; a question holds one, and containment would pay a player who
  hedged — "trois ou quatre" contains the answer to how many languages
  Switzerland has
- `[Game]` The playlist follows the rest of the settings out of the lobby. It
  was a draft the launch committed, so once there was no launch left to press it
  had no way to apply and was hidden for the rest of the evening. Every control
  that opens a round now commits it first — the launch, "next round" and "play
  again" — which is the rule the lobby always had, read at the moment it means
  something. A source edited mid-clip cannot touch the round already drawn, so
  the picker stays reachable throughout
- `[Game]` A press answers on a touch screen. Every variant painted
  `[data-hovered]` and left `[data-pressed]` a two-pixel nudge — but
  `data-hovered` never fires on a touch device, and the reset already removes
  the browser's tap highlight, so on the phone most of these screens are aimed
  at, pressing anything changed nothing. The game card on the home page had no
  pressed rule at all. Whatever a hover paints, a press now paints too
- `[Game]` The settings panel opens and closes on an animation rather than
  blinking. The panel is a grid row going `0fr → 1fr`, because `height: auto` is
  not a length and will not transition; it works in both directions because
  react-aria collapses with `hidden="until-found"` — `content-visibility`, not
  `display: none` — so the box survives to be animated, and `allow-discrete`
  holds the hiding back until the row has finished closing
- `[Shared]` The answer matcher looks for each half *inside* what was typed
  instead of only as the whole of it. It compared whole strings, so "jean
  jacques goldman on ira" found neither half — which is exactly what a room
  types into one field. The search is over runs of **whole words**, and that is
  the guard rather than a length threshold: `normalizeAnswer` drops whitespace
  on purpose, and on the bare string a title of `Hell` is inside `Michelle`
- `[Game]` The document says what the product is. The tab read "Blind Test", the
  page had no description, and a link pasted into a chat unfurled as a bare URL
  — which matters here more than search does, because this is a product people
  share by sending someone the link. Title, description, canonical, Open Graph
  and a Twitter card, plus a 1200×630 share image set in the product's own
  lettering on the lobby ground
- `[Game]` The favicon is from this design world rather than the one before it.
  It was still the prototype's rounded near-black tile with a neon-pink dot —
  the exact arrangement the design pass exists to refuse — and it survived that
  pass because nothing on screen shows it. A hard-edged `T`, cream on burnt
  orange, with a PNG beside it because iOS ignores an SVG icon
- `[Game]` `theme-color` matches the ground it is meant to hide the seam against.
  It was `#c2410c`, a colour in neither palette, and there was one of it where
  the two themes need two
- `[Game]` `robots.txt` keeps room URLs out of indexes. The SPA fallback answers
  200 on every path, so a code pasted somewhere public could put a dead room in
  a search result
- `[Game]` The lobby is a title card again. It stacked the QR card, the roster
  and eight strips of settings at one weight, which on a phone put the only
  action that matters — starting — at the bottom of a 2100px scroll. The setup
  folds behind one ruled row that says what it currently holds ("Top charts ·
  Type it · 10 rounds"), so the room code and the QR code get the screen back:
  1010px on a phone, and no scroll at all on a laptop
- `[Game]` A Deezer playlist can be tried before the evening rests on it. The
  source was a raw id field with no feedback, so a host who pasted the wrong
  number learned it on the first round; it now wears the same preview the
  search does, over the same route shape, and lists what the pool would hold
- `[Server]` A playlist id nobody can look up is told apart from a catalogue
  that is down. Deezer answers both with HTTP 200 and an `error` object, and
  collapsing them meant a typo read as "the server refused that"
- `[Game]` The corner menu says which build is running, asked for the first time
  it is opened. It is the deployment's commit rather than the tab's bundle,
  which is what "is my fix live?" is actually asking
- `[Server]` `POST /api/rooms` is rate-limited — 30 per address per ten minutes,
  the same window the sweeper clears an unjoined room in. Unauthenticated and it
  allocates a code, and the code space is the thing worth defending
- `[Game]` Translation keys are namespaced by who would reuse the string, not by
  the screen that renders it. `host.*` names a screen, and a host console shows
  both kinds — so the source picker, the genres, the clip length and the
  title/artist verdict moved to `blindtest.*`, while "Start the game" and
  "Volume" stayed. Inside `blindtest.*` a single answer mode takes the mode as
  its next segment, which is what keeps stage 09's two new modes from colliding
  with the buzzer's
- `[Game]` Every screen is laid out for the screen it is opened on. The home
  page and the nickname screen were the phone layout on a laptop — a 620px
  ribbon down the middle, tall enough to scroll, with the second way in below
  the fold on the very screen the host uses to make a room
- `[Game]` Starting the game is what commits the chosen music. Confirming a
  playlist and *then* launching it was two decisions where the host made one,
  and it was the only control in the lobby that did not apply on selection
- `[Game]` Inputs have a material of their own — paper behind the same ink edge
  every control carries — instead of the bare `--cut` block that belongs to the
  things you only look at. An input is never taller than the button that
  submits it
- `[Game]` An icon family, authored rather than installed, drawn on the stem
  weight of the type beside it. A glyph never travels without its word
- `[Game]` A `small` control size. Every secondary action in the product was a
  52px block, which is why each of them read as a second primary action

### Fixes

- `[Game]` Changing game gives the new one its own settings. It kept the room's,
  so a table coming off the bare buzzer landed on a blind test in buzzer mode
  with no round limit — the buzzer's settings worn by a game that has better
  ones. The three a game gets a say in change over; the countdown and the
  auto-advance are the host's and survive
- `[Game]` The volume slider answers a press. The rail and the thumb had no
  cursor of their own, so a control you drag looked like text, and the press
  state was spent dimming the thumb — under the fingertip parked on top of it,
  which is the one place nothing can be seen. Both take `pointer`, and the thumb
  grows at full ink instead: dimming reads as disabled, which is the rule the
  choice strips already follow
- `[Game]` A player holding one point reads "1 point", not "1 POINTS". The word
  was an invariant string beside a score the markup printed itself, so every
  game showed it wrong in both languages at every score of one. The final board
  had the mirror of it: two keys chosen with `topScore === 1`, which is the
  English rule applied to French — and French counts zero as singular, so it was
  wrong at zero too, on the biggest screen in the room. One key, one call, and
  the plural rules come from the locale
- `[Game]` A setting changed while the socket is away is no longer swallowed.
  The launch actions were already disabled without one, but the answer mode,
  difficulty, round count, clip and countdown each wrote a frame into a closed
  socket: the strip showed the new value, the server never heard it, and the
  next snapshot put it back with nothing said. The volume is exempt on purpose —
  it never leaves the host's machine
- `[Game]` A disabled choice strip looks disabled. It carried no `[data-disabled]`
  rule at all, so a control that answered nothing looked exactly like one that
  would. Ruled, never dimmed, like every other disabled control here: the
  selected stamp drops its ink ground and keeps the ink as an edge, so nothing
  loses contrast and a host reading their settings over a dead socket can still
  see which one is on
- `[Game]` The app grows past the screen it was opened in. `html`, `body` and
  `#root` were pinned to the viewport's height, so a lobby taller than a laptop
  still scrolled on a desktop browser but stopped following the viewport on a
  phone once the URL bar retracted — the footer's controls were the last thing
  on the page and the first thing out of reach. `min-height: 100dvh`
- `[Game]` A response that is not JSON no longer throws past the API client.
  A host waking a sleeping instance answers the first request with its own HTML
  holding page, and `response.json()` sat outside the `try`
- `[Game]` Pressing the buzzer again after buzzing no longer opens Android's
  "search for SALON" sheet over the game. A press the browser will not act on —
  a control disabled because you already used it — fell through to a text
  selection, and the nearest text was the room header
- `[Game]` The press highlight follows the buzzer instead of drawing a rectangle
  around it. It is the browser's own, it tracks the element's box rather than
  its radius, and every control already answers a press in its own shape
- `[Game]` The last reveal offers "See the results" rather than "Next round"
  beside "End the game". The server has always ended the game instead of opening
  a round past the last one; the host was choosing between a button that did
  something else than it said and one that read as walking out
- `[Game]` The QR card says what to do with it. The room code beside it has
  always been named by the button that copies it, and the card had nothing — an
  address under a glyph says where, not that scanning is the way in. Both
  captions existed in the dictionary and neither was rendered
- `[Game]` The reveal reads in the order it is written. "It was" opens a
  sentence, and it sat *under* the title it opens on both the host screen and
  the phone, so the answer arrived before the words introducing it
- `[Game]` A room code the alphabet cannot contain is refused by naming the
  characters — `O`, `I`, `S`, `Z`, `0`, `1`, `2` and `5` are all excluded, and
  typing four digits used to be answered with "a room code is 4 letters and
  digits", which is both untrue and unactionable
- `[Game]` The host console no longer leaves an unhandled `AbortError` in its
  console every round. A `play()` cut short by the next `load()` rejects, and so
  does one an autoplay policy refuses; neither is actionable
- `[Game]` A room that is gone says so and offers the way out, instead of
  reading "Reconnecting…" forever over buttons that silently do nothing. The
  socket already stopped retrying on a fatal error; nothing on screen said it,
  because "given up" and "about to retry" were the same state
- `[Game]` The launch says why it is refusing. It has always needed a player in
  the room and has always said so only through the roster on the far side of the
  screen, which is too far from a greyed control to read as its reason
- `[Game]` Enter submits the track search. The field and its button sat loose in
  a section with no form, so the only way to search was to aim at the button
- `[Game]` Nothing user-facing assumes a phone any more. The room code is shown
  so it can be read aloud and typed, which is how a laptop in the same room
  joins — a phone is the common case, never the contract
- `[Game]` Taking a seat no longer throws off a secure origin.
  `crypto.randomUUID` exists only in a secure context, and testing on real
  devices over the LAN is plain HTTP on an IP address. Copying the room code
  hits the same wall and has the same answer

### Internal

- The question bank is built by a script that is committed with it,
  `pnpm --filter @taverla/server questions:build`. It reads OpenQuizzDB's public
  packs, folds their twenty-eight rubrics onto the six a phone can show, and
  translates their French keys — `réponse`, `propositions`, `anecdote` — into
  the English ones `question.ts` declares. It refuses two rubrics **with reasons
  written down**, because a rubric that simply went missing reads as an
  oversight: QUADRIQUIZZ asks for four answers and its packs carry one, and a
  MOTS CROISÉS clue names the length and the first letter. It also checks, per
  question, that there are exactly four propositions with the answer among them
  rather than trusting it — 1 708 questions, zero rejections
- There is no OpenQuizzDB API to take. `api.php` and `api_config.html` soft-404
  onto the landing page and the old data mirror is a parked domain; what they
  publish now is downloads. The stage plan's "fallback" was the only option, and
  the better one — a bundled asset cannot go down mid-party
- `playedTrackIds` is `playedContentIds`. A room remembers what it has already
  asked, and half of that is no longer tracks
- `not_implemented` is used nowhere. It existed so a half-built stage could
  answer honestly instead of borrowing a code that meant something else, and the
  protocol rule said it should shrink to nothing as the stages landed
- Everything Playwright owns lives in `e2e/`. The config moves in beside the
  specs it configures, and the two files that are *not* tests move under
  `e2e/support/` — `deezer-stub.ts` most of all, which is a fake upstream
  service rather than a spec and sat between two of them in an alphabetical
  listing. `ls e2e` now answers "which journeys exist?" and nothing else. The
  directory stays package-less on purpose: a suite earns a `package.json` when
  it needs a dependency nothing else in the repo needs or a lifecycle hook, and
  this one needs neither. Worth knowing before the next move — `webServer.cwd`
  defaults to the config's directory while `outputDir` defaults from the
  process's, so the stub's command became relative and the traces CI collects
  did not move
- `[Shared]` A translation knows what a count does to a sentence. The dictionary
  was `Record<TranslationKey, string>` interpolated from
  `Record<string, string | number>`, which checks nothing: a misspelled value
  name rendered `{count}` on a screen and a number printed however JavaScript
  felt like it. Placeholders now carry a type, and the type decides both what
  the caller must pass and what the dictionary owes alongside the message —
  `{n:plural}` and `{n:enum}` choose between alternatives so they take them
  through `defineTranslation`, while `{n:number}`, `{at:date}` and `{items:list}`
  only configure a formatter `Intl` already defaults correctly, so a bare string
  is the whole message. There is no empty options object anywhere. A count
  declares `plural` the moment *any* locale inflects around it, which is why
  English writes only `other` where French writes both. Adapted from Stargazer's
  lib with two deliberate departures: `defineTranslations` refuses a bare string
  that declares a plural — upstream it compiles, throws at substitution, is
  swallowed, and puts the raw key on screen — and `DotPath` counts its recursion
  down, because the lib is generic over the dictionary rather than reading a
  registered one and TypeScript gives up with TS2589 without a floor
- `[Game]` Both dictionaries are nested objects, and a key is the dotted path to
  a leaf. The 128 call sites did not move: a dot path is the same string a flat
  key was, so `DotPath` hands back the same literal union and
  `` `error.${code}` `` stays assignable. Three keys were renamed because a
  branch cannot also be a leaf — `host.answerWindow.label`,
  `host.roundCount.summary` and `preferences.theme.label`. When a group needs a
  name of its own, that name is a child of it
- `[Game]` The strings a *mode* owns left the game that happened to ship first.
  `blindtest.buzz.*` is `buzz.*`, `blindtest.round` is `round.*`, and
  `blindtest.answerMode.*` belongs to the host console. The namespace rule was
  already right and simply had nothing to answer against; what stays inside a
  game's prefix is what only that game can say, and "It was" needs an it
- `[Shared]` `pointsFor` stayed with the shell rather than moving to the blind
  test's directory as the plan had it. It reads either shape of verdict and
  belongs beside `isMiss`, `verdictKindFor` and `nothingScored`;
  `blindtest/typed-answer.ts` took what knows an answer has a title and an artist
- `[Server]` `isRoundInPlay` replaces the socket handler's own set of the three
  phases a round is open in. Same three phases, under a name that only fitted
  the reveal — and `reshapesRound` beside it is the list of settings that round
  is built on
- `[Server]` `pnpm dev` starts the server again. `tsx watch` spawns the script
  as a child process, and under `pnpm --parallel` that child never ran: no
  output, nothing listening on 3100, and a Vite proxy refusing every `/api` and
  `/ws` call. Run on its own it was fine, which is what made it look like a
  local quirk for as long as it did. Node's own watcher has no such indirection:
  `node --watch --import tsx src/index.ts` — Node watches and restarts, tsx is
  only the loader that resolves TypeScript and the `@/` aliases
- `[Server]` Production runs a bundle, not `tsx`. `tsdown` emits one
  `dist/index.mjs` with the workspace packages inlined — they ship as TypeScript
  source, so anything leaving them external would only start under a loader. It
  does not fix the cold start, which is container scheduling; it removes a dev
  tool from the runtime
- `[Shared]` `TrackSearchResponse` is `TrackListResponse`, and its `results` are
  `tracks`. The same shape now answers both the search and the playlist preview,
  and a name that says "search" on a playlist route is a name that lies
- `[Shared]` The game is covered end to end. The socket suites share a harness
  that boots the real server on an ephemeral port: the host-only guard, the
  fatal hang-up, a reloading player reclaiming their seat and score, and the
  clock handshake landing a countdown on a device four seconds out. Two
  Playwright journeys drive the two screens — a whole round across two contexts,
  and the screen a dead socket leaves behind — on ports of their own against a
  stubbed catalogue. `pnpm validate` runs the lot
- `[Game]` Design-system wrappers extend the react-aria props they wrap rather
  than re-declaring a subset, merged through a `composeClassName` helper
- `[Game]` `Button` and `Link` share one control mixin and one
  `control-appearance` module, so a size or a variant — its name, its
  documentation and its default — is declared once rather than twice; a pending
  button overlays a `Spinner` on a transparent label rather than replacing it,
  which keeps the box — and the accessible name — unchanged
- `[Game]` react-aria's `RouterProvider` wired to react-router in the app shell,
  so an `href` navigates client-side instead of reloading and dropping the socket
- Cross-project seams documented in `docs/game-catalogue.md`: the blind test is
  the first game on a shared party-game shell, not the whole product
- pnpm workspace on TypeScript 7, Biome 2.5.7, Vitest 4, React 19 with the React
  Compiler enabled
- `@babel/core` held at 7.x: the React Compiler cannot parse Babel 8's AST for a
  destructured parameter with a default, and it bails silently
- Staged build plan under `docs/plans/`, project conventions under `.claude/`
