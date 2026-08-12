# Changelog

Categories, in order: Breaking Changes, Features, Improvements, Fixes,
Internal. Tag an entry `[Server]`, `[Game]` or `[Shared]` when it is specific to
one part.

## Unreleased

### Features

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

### Improvements

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

### Internal

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
