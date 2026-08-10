# Changelog

Categories, in order: Breaking Changes, Features, Improvements, Fixes,
Internal. Tag an entry `[Server]`, `[Game]` or `[Shared]` when it is specific to
one part.

## Unreleased

### Features

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
