# Changelog

Categories, in order: Breaking Changes, Features, Improvements, Fixes,
Internal. Tag an entry `[Server]`, `[Game]` or `[Shared]` when it is specific to
one part.

## Unreleased

### Breaking Changes

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
  wait — a courtesy, since the guard on the socket is the rule. The playlist and
  the seat stay in the lobby, the first because its search is a draft the launch
  commits and the second because it reopens the socket
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
