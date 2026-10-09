# Changelog

Categories, in order: Breaking Changes, Features, Improvements, Fixes,
Internal. Tag an entry `[Server]`, `[Game]` or `[Shared]` when it is specific to
one part.

## Unreleased

### Breaking Changes

- `[Server]` **The game is served by one Cloudflare Worker, with a Durable
  Object per room, and deploys from CI.** A push to `main` that passes lint,
  tests and the journeys ships with `wrangler deploy`, to
  `taverla.adrienlcp.workers.dev`. A room keeps its state across a deploy and
  across a `wrangler dev` reload, and nothing sleeps between two evenings.
  Render, `render.yaml`, the Dockerfile, the bundled Node server and
  `SERVE_GAME_FROM` are gone; `/api/health`'s `build` reads `GIT_COMMIT`, and
  room creation is limited to 10 a minute per address by the platform's
  binding. `pnpm dev` runs the Worker on 3100, and the socket suites keep a
  Node app of their own in `infrastructure/node/`.

- `[Shared]` **Le Fake is off the shelf.** The game, its `/lefake` front door,
  its lobby card and its strings are gone, and with it the `voting` phase, the
  `lefake.submit` and `lefake.vote` frames and the `lie_is_the_answer` and
  `cannot_vote_for_own_lie` codes. A console whose remembered setup still names
  it drops that entry on the next read and keeps every other game's.

- `[Shared]` **The slate's key is revealed on purpose, and can be prepared
  before the evening**, and `PROTOCOL_VERSION` goes to 21. `host.revealItemKey`
  puts one closed item's key up: the wall draws it big and every sheet reads it
  from `round.content.revealedKeys`, `null` on an open item or a key held back.
  `host.startRound` carries an optional `slateKeys`, the key the host typed in
  the lobby — kept for the tab alone, in `sessionStorage` under
  `taverla:slate-keys`, never in the settings, which reach every player. It
  survives a reload and a new room in the same tab and goes when the tab
  closes; a `slateKeys` an earlier build left in `taverla:host-setup` is
  dropped the next time the console reads it.

- `[Shared]` **A latecomer's slate no longer calls a collected item blank**,
  and `PROTOCOL_VERSION` goes to 20: every line of `yourSheet` carries
  `closedBeforeYou`, `true` on an item that closed before the reader held a
  seat, so the sheet says it was collected before they arrived instead of
  *Left blank*.

- `[Shared]` **The console counts every item**, and `PROTOCOL_VERSION` goes to
  19: the slate's host arm carries `filledCounts`, how many sheets have
  something on each item — a count, never an answer — so the host sees an item
  is ready to close.

- `[Shared]` **The slate marks an item while the rest are still being
  written**, and `PROTOCOL_VERSION` goes to 18. `RoomPhase` loses
  `correcting`: the slate writes and marks inside `playing`, and each item
  carries `open`, `closed` or `marked` on `round.content.itemStates`. A new host
  frame, `host.closeItem`, locks one item on every sheet and puts its grouped
  answers on the wall while the others stay writable; `host.collectSheets` now
  closes whatever is still open; `host.reveal` waits until nothing is. Each item
  is stamped with the seats held when it closed, so a player arriving mid-sheet
  still writes every open item and is marked on those alone. No frame carries an
  answer to an item still open, the wall's included.

  Items can be **labelled** — `🔴`, `B`, `Glass 3` — through
  `settings.game.labels`: public, edited in any phase, up to 12 characters, and
  refused when two positions would read the same, a bare number included.
  Numbers stay the default.

- `[Shared]` **The slate is served**, and `PROTOCOL_VERSION` goes to 17: a
  sixth game where everyone fills a numbered sheet in private and the host marks
  it item by item on the wall. It was asked for as a chip tasting and is kept
  because it is any tasting, any quiz on paper. `RoomPhase` gains
  `correcting` — the sheets collected, the scores still moving — which is what
  an older tab would fail to parse.

  One player frame, `slate.write`, saves one line as an upsert, and five host
  frames run the sheet: `host.addItem`, `host.setItemKey`,
  `host.collectSheets`, `host.showItem` and `host.judgeGroup`. The last is its
  own rather than `host.judge` taught an item index: it names every player who
  wrote the same thing, pays on the spot, and can be taken back, so a verdict
  changed on an earlier item moves the board at once. Answers are grouped by the
  shared normalisation and nothing more — no typo tolerance, since a near miss
  is the host's call.

  **Nobody's answers reach anybody else, the host screen included, until the
  collection** — the host screen is the wall, so it holds counts. The host's
  answer key reaches no player frame at all. The round's roster is stamped at
  collection rather than when the writing opens, so a friend arriving at the
  fifth cup gets a sheet. It is in `gameKinds` and not yet on the shelf: its
  screens are the next session.

- `[Shared]` **A room can ask for cinema, and for video games**, and
  `PROTOCOL_VERSION` goes to 16. `arts` was not a subject, it was the
  leftovers — films, television, animation, video games, music, books, comics,
  celebrities and OpenQuizzDB's adult rubric forced in on top — and at 4 960 of
  10 186 rows it was the one chip whose name did not say what ticking it would
  give. `cinema` and `videogames` are split off it, which makes eight
  categories. The version moves because `questionPromptSchema.category` travels
  all the way to a player, so a tab left open across a redeploy would meet a
  `z.enum` value it cannot parse.

  **Splitting a subject is five fold tables to rewrite, not questions to find**:
  every row already carried the rubric it arrived under. `creator` is the one
  that did not move, and it is the hard case: the relation says *who made a
  thing* and never *what kind of thing*, so one sentence shape asks about
  Chandler Bing, Solid Snake and the Sistine Madonna, and reading the prompt for
  a medium files two of those three wrong. `director` and `developer` each ask
  after one kind of work and nothing else, which is what lets them carry a
  category.

  The windfall is **Mintaka's `movies` and `videogames`**, both banked for the
  first time — they had been left out on the written grounds that they *would
  deepen the two subjects that need nothing*, a reason that was `arts` being fat
  and that retires for exactly two of its four unused categories. **They yield
  very differently for the same 2 500 raw rows, and the gap is French Wikipedia
  traffic rather than the fold**: 619 banked for `movies` against 287 for
  `videogames`, a studio being read about far less than a film. The bank goes
  10 186 → **11 097**, leaving `cinema` at 1 361 French rows and 704 English,
  `videogames` at 808 and 1 006, and `arts` at 1 253 and 740; every corpus floor
  still clears. `developer` is 56% of the French half of `videogames`, so what
  deepens it is a second source rather than a wider fold.

  **Refused, measured rather than assumed**: `music` (84 French rows against 431
  English, and music already has a game) and `books` (109 English against 366
  French). Mintaka holds 2 500 raw rows of each, so neither is foreclosed.

  A chip is also the **draw's odds dial**, because a category is drawn before a
  question: screen subjects go from one round in six to three in eight, and
  history, geography and science from three in six to three in eight. The
  console's fold gives the subject strip **900px**, so eight labels have an
  882px budget the old ones overran by 78 — and keeping both long labels while
  cutting only *Cinéma et séries* came to **883, over by a single pixel**. So
  `cinema` reads **Cinéma** and `everyday` reads **Quotidien**, picked on what
  the short form costs rather than on what it saves, and the container query
  stays at 55rem. See
  [`docs/plans/24-the-chip-that-says-what-it-gives.md`](docs/plans/24-the-chip-that-says-what-it-gives.md).

- `[Shared]` **A press in the reflex race is called a press**, and
  `PROTOCOL_VERSION` goes to 15. A tap is what a thumb does to glass, and this
  room has never been only phones — the pass that took the device out of the
  prose left it standing in the identifiers, which is where a name outlives a
  comment. The round's reflex content carries `presses` rather than `taps`, and
  with it go `ReflexPress`, `ReflexPressRecord`, `registerReflexPress`,
  `everyoneHasPressed`, `PRESS_WINDOW_MS` and `ReactionMoment.pressedAt`. The
  version moves because that field is read straight off the snapshot by every
  screen in the room, so a tab left open across a redeploy would find
  `content.taps` undefined and throw on the first heat.

  The screens moved with it: the console's stage button is `.press`, the
  player's line is `reflex.pressed`, and `ReflexStage`'s `onTap` is `onBuzz` —
  which is what the player's twin has called the same callback since it was
  written. The e2e specs hold `screen` where they held `phone`, the word the
  product already uses for whatever a player brought.

- `[Shared]` **A host can hold the questions to what the room has heard of**,
  and `PROTOCOL_VERSION` goes to 14. `wellKnownOnly` joins `QuestionDrawSettings`
  beside `allowsAdultContent`, so it reaches the quiz and Le Fake at once — both
  draw from the same bank, and the rating is the bank's rather than a game's. A
  third multiplicative filter on `drawQuestion`'s eligible set is the whole of
  the server side; off by default, so a room that says nothing plays all 8 355
  rows.

  It is a **switch and not a level picker**, which is the measurement stage 21
  spent a session on: the draw takes a category before it takes a question, so a
  level is only as good as the category it thins most, and thirds of the French
  bank leave *difficile* ten geography questions. One threshold behaves where
  three bands do not. The word is the blind test's — `difficulty` at the
  protocol root already means `wellKnown | mixed | obscure` — so the quiz's own
  arm is `wellKnownOnly` rather than a second `difficulty`, and it reads the
  same in both halves of the bank even though the two sources decide
  `isWellKnown` their own way. It is not on `reshapesRound`, so it moves
  mid-game and lands on the next round, the same as the blind test's
  difficulty. See
  [`docs/plans/21-well-known-questions.md`](docs/plans/21-well-known-questions.md)

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

- `[Server]` **Taverla lives at `taverla.adrienlcp.com`.** The Worker declares
  the custom domain in `wrangler.jsonc` and turns `workers.dev` off; the
  canonical link, Open Graph tags, sitemap and `llms.txt` name the new host,
  and the analytics tracker loads from `analytics.adrienlcp.com`. A room's
  screens (`/host`, `/invite`, `/pair`, `/play`, `/wall`) are served `noindex`
  by `_headers` rather than `Disallow`ed in `robots.txt`, so a crawler can read
  that they are not to be indexed.

- `[Game]` **The board-game shelf, first pieces: a new shell and a choice
  screen that never scrolls.** Every screen now stands on a matte printed
  board — pale sky by day, slate blue by evening — in Bricolage Grotesque and
  Atkinson Hyperlegible Next, both self-hosted; Archivo is gone, and so is the
  phase painting the whole field, which now inks a `--phase-ink` for the score
  track still to come. Controls are die-cut pieces with a chipboard edge. A
  player's choice round is held to the viewport: one line of chrome (round,
  pawn and score, the menu as an icon), the clock draining along the question
  card, and four answer tiles in four inks with a shape each, sized from their
  own length and the screen's ratio — four rows upright, two by two when wide,
  beside the question lying down. `e2e/choice-fits.spec.ts` holds it at sixteen
  viewports against the bank's worst rows, with nothing under 14px. The rest of
  the screens inherit the new ground and faces and are redrawn next.

- `[Game]` **The player's buzzer is a piece from the box, and never
  scrolls.** It is held to the viewport like the choice round, under the same
  line of chrome: a thick coral token that sinks under the thumb, beneath the
  question printed on a paper card — beside it lying down. A dead buzzer is the
  empty socket it sits in. The floor stands its holder's pawn where the buzzer
  was, with the clock on a paper token. The reflex race's buzzer waits paper
  side up and turns coral on the flip, a player's time is printed on a card,
  and a false start is a die-cut piece in the danger ink.

- `[Game]` **The rest of a player's screens are pieces of the box too.** The
  round's chrome line replaces the old header and scoreline on every phase —
  the table's code and the seat's name in the lobby and on the final board —
  so it never moves between screens. The lobby is the chosen game's lid,
  banded in its spine colour (the recess it will sit in while the table
  decides), the invitation, and the table's seats with a socket per pawn still
  in the box. The typed round prints its question on the paper card with the
  sand along its top. The reveal turns that card over to print the answer, a
  cover mounted on it; what the round paid is struck on a green token, or an
  empty socket for nothing, beside the player's place; and the room's board is
  a chip per player, filled for a right answer. The final board stands the
  player's own pawn beside their place. Waits — the host away, a seat that
  arrived mid-round, between two rounds — are a paper card lying face up, the
  nickname form sits on the box's lid, and a text field is a paper slot.

- `[Game]` **The console is in the box too, and nothing frames a heading any
  more.** The console's reveal prints the answer on its card with nothing above
  it, and the reflex time on a player's screen is the number alone: the
  *C'était*, *La réponse était* and *C'est pris* lines are read before the
  heading by a screen reader and shown to nobody, as every player screen's
  already were. `DESIGN.md` now describes the box rather than the title cards.

- `[Server]` **356 more French questions, 96 of them science**, from Vikidia rows
  the wiki wrote with three candidates. Each takes a fourth written by hand
  against its own row, in `vikidia-fourth-decoys.json`, and ten keep their
  refusal because *Oui*, *Non* and a third are all there is. French science
  goes 339 → 435, history 513 → 598, arts 1 253 → 1 339, and the bank reaches
  11 453. Writing them surfaced four rows the source had wrong — Cadoudal
  fighting in Alsace, 10 November 1799 dated 18 brumaire, a decoy that restates
  why Mars is red, the Neolithic offered as a wrong answer to *since the
  Prehistory* — repaired or dropped in `question-repairs.json`.

- `[Game]` **The slate's screens name their items and mark them one at a
  time.** A *Names on the items* fold in the lobby, and beside the answer key
  once the sheets are open, gives each item a label; a box left empty keeps its
  number, and a label another item already shows is refused on the spot. Every
  tile, field, wall and sheet line draws the label. The console's sheets view
  is a board of every item — outlined while open with `3/4 written`, solid ink
  and a padlock once collected, faded once marked — where one press collects an
  item and puts it on the wall while the rest are still written. The wall steps
  between collected items, then collects the rest, then shows the scores; *Back
  to the sheets* and *Back to marking* move between the two. A player's
  collected tile is hatched, padlocked and refused; the item on the wall rides
  above their sheet as a band with their answer and its verdict, and takes the
  whole screen once nothing is left to write.

- `[Game]` **The slate is on the shelf**, sixth and last: *L'Ardoise* in
  French. The host sets how many things there are to guess (1 to 60), every
  player gets a grid of numbered tiles that is both the way to a number and how
  much of the sheet is done, and tapping one opens a single large field for it.
  Lines save as they are written and survive a reload; a friend arriving
  mid-sheet gets one. The console shows *Julie 12/26* and never a word, with the
  answer key folded away and one more number a press away. Once the sheets are
  collected the wall marks one number at a time: the key behind a tap, every
  distinct answer with who wrote it, one toggle each, and the standings moving
  with every press — back as well as forward. The marking wears the field a
  judged buzz does.

- `[Game]` **A press now answers back.** Taking the floor is one firm 100 ms thud
  on the screen that took it; losing the race is two shorter knocks (45–65–45)
  on every screen that entered it and was beaten — the false start a reflex
  round charges for included, because a lockout has exactly one cause there. The
  30 ms acknowledgement a press already had is unchanged, and the three now sit
  together in `infrastructure/browser.ts`: what tells a thumb which one it is
  holding is the contrast between them, never the length of any one.

  It is the one thing about a buzz a screen cannot show in advance — the race is
  decided in the fifty milliseconds after the thumb lands, on a machine that is
  not this one — so it is answered in the channel the press was made in. A
  screen that never pressed is told nothing: eight of them knocking at once is
  the noise the product already refuses to make with sound, and a phone
  face-down on a table is audible. A seated console gets the same, because the
  rule is the capability and never the role.

  Keyed on the stamp the server kept for the press, the way the buzz cue is, so
  a roster change landing the whole view again under a held floor knocks
  nothing. And read from the page rather than from the screen that took the
  press: **a reflex heat ends on its last tap**, so the snapshot carrying a slow
  player's own reaction is already the reveal and the buzzer they pressed is
  gone — which is exactly the player the answer was for. Absent on every iOS
  Safari in the room, and silently so, which is why nothing is built on top of
  it.

- `[Game]` **The console honks when a buzz takes the floor.** Two square
  oscillators a perfect fifth apart — 294 and 441 Hz — through a 2.4 kHz lowpass
  and a 200 ms envelope, synthesised in `presentation/audio/buzz-cue.ts` because
  the repository holds no audio asset and a board buzzer was not worth the first
  one. Its amplitude is the machine's own volume times 0.3, so a console muted in
  the menu plays nothing rather than playing quietly, and it is armed by the same
  press that blesses the clip's element — both permissions are granted only
  inside a gesture, and neither can be asked for afterwards.

  It is keyed on the buzz's `atServerTime` and nothing else, which is what keeps
  it to one honk per press: the `buzzed` snapshot is re-delivered on every roster
  change, every settings frame and every reconnection, and `expiresAt` is
  rewritten when a host comes back. **Nothing sounds on the reflex race's flip**
  and nothing can — each device flips against its own estimate of `flipsAt`, so a
  honk arriving on one machine's schedule would score the devices slightly ahead
  of it as having gone early. That silence is structural rather than remembered:
  the race is the one game that never reaches `buzzed`.

- `[Server]` **French science holds an evening of its own at last, and all four
  thin subjects are past 300.** Vikidia is the bank's fifth source and the only
  open French-native one with any science in it — the French encyclopedia
  written for eight-to-thirteens, CC BY-SA 3.0, 265 quiz pages read out of
  namespace 104 in seven requests. French science goes from **170 rows to 339**,
  geography to 685, history to 516 and sport to 390. The corpus floor in
  `question-bank.test.ts` carried an exception for science since Mintaka landed;
  it is gone, and the graded difficulty picker the stage exists to unblock is
  buildable over every French subject rather than three of them. Bank: 10 186.

  **566 rows banked out of 765 ingested, and the ratio is the entry's point.**
  The census flagged **373 of them** — 194 dropped, 135 marked choice-only, 44
  repaired — where Mintaka's census flagged 52 rows in 1 194. A wiki written by
  children for children fails in a way none of the four earlier sources did: **a
  quiz page is read top to bottom, so its rows use pronouns**, and *Où est-elle
  née ?* names nobody once a room is dealt one row on its own. That is about a
  hundred and sixty rows. Eighteen per cent of what survived parsing is
  choice-only — a panda's tail in centimetres is a question only beside its own
  four candidates — against seven rows in 1 194 for Mintaka. And there is
  falsehood, as Mintaka had: the lynx's Latin genus printed as a *wrong* answer,
  seven Koopalings banked as eight, a red fox litter capped below two of its own
  decoys, Vivaldi dead in June.

  **The unbound pronouns were dropped rather than repaired outside the four thin
  subjects.** Rewriting a hundred and sixty French sentences to rescue questions
  about a children's book series is writing questions rather than ingesting
  them, and they sit in `arts`, which holds 2 510 French rows and needed none of
  them. Inside science, geography, history and sport the subject was put back by
  hand — 44 repairs, each re-read against its row, and every answer correction
  verified individually because those are the only ones that can pay a player
  for a wrong answer.

  Four rules carry the parsing, each measured. **A template is content**:
  `{{unité|-63|°C}}` deleted leaves *la température moyenne sur Mars est à peu
  près de…* with three empty candidates, so ten templates are unwrapped to what
  they print and **a row still holding one is refused** — a sentence with a hole
  in it is worse than a row the bank does not have. **The `type` marker lies**,
  appearing as `()`, `types="()"`, `{}` and `"{}"` over the same single-answer
  shape and over fill-in-the-blanks too, so counting the `+` lines is the only
  rule that holds. **The page title is the whole of the subject signal** —
  Vikidia's own categories say `Quiz` on 561 rows out of 827 — so `QUIZ_SUBJECTS`
  maps all 180 pages by hand, and the ten about the wiki itself map to nothing.
  **Redirects are followed before the rating and locally**: *Animaux* redirects
  to *Animal* and scores three hundred readers on its own, which would have
  rated the source's largest science block as one nobody has heard of — and
  following them inside `frenchViewsOfTitles` would have moved every row the
  other four sources already banked. Left on the table: **401 rows carrying only
  three candidates**, 101 of them science, because the bank asks for exactly
  three decoys and inventing a fourth is writing the question. See
  [`docs/plans/22-thin-french-subjects.md`](docs/plans/22-thin-french-subjects.md)

- `[Server]` **Three of the four thin French subjects now hold an evening of
  their own.** Mintaka is the bank's fourth source and its second built on
  Wikidata: 20 000 crowdsourced questions translated into eight languages, CC BY
  4.0. French history goes from **64 rows to 499**, geography from 156 to 640
  and sport from 123 to 355 — past the 300 the English half sits at, which is
  what makes the graded difficulty picker buildable for the quiz at last. Three
  bands over French history now deal a hundred and seventy questions each where
  they would have dealt twenty-one. **Science does not move**: Mintaka has none
  at all, and it is what the stage's second source exists for.

  It is the first source that ships **no wrong answers**, so the three decoys
  are found rather than spread. `wikidata-kinds.ts` asks Wikidata what kind of
  thing each answer is — discipline, then trade, then class — and the decoys are
  drawn from the entities filed under the same one, nearest in how much French
  Wikipedia traffic they take. That is the reading `questionSchema` already
  demanded and the bank had never had to satisfy: *1789 is not a plausible wrong
  answer to which river runs through Paris*, and three other rivers are.

  Four rules carry the quality, each measured rather than chosen. **Four of the
  nine question shapes** are kept — `comparative` prints its own candidates in
  the prompt, `difference` accepts more answers than it records, `multihop` is
  where the corpus's staleness collects. **Questions naming the present go**,
  because the corpus is fixed at October 2021 and a screen saying *l'actuel plus
  jeune gouverneur* is wrong out loud in front of the room. **The answer must
  have a French Wikipedia article people read**, which is also the American
  filter no word list could be: the French translation of *Rebels d'Ole Miss*
  names no league, and a French room's traffic has never opened it. **No answer
  comes up more than five times in a subject**, against 34 rows answering *New
  York* and 31 answering *Roosevelt* upstream.

  Of the 20 000 rows, 1 151 are banked — 1 194 read, 45 dropped by the census
  below and 2 recovered by the decoy rung. The build reports 20 unwinnable and
  68 repeated prompts across the whole bank, which now holds **9 620
  questions**.
  See [`docs/plans/22-thin-french-subjects.md`](docs/plans/22-thin-french-subjects.md)

- `[Game]` **The front door offers the rooms this device can walk back into.**
  Closing the console's tab lost nothing — the room outlives its host by ten
  minutes and a single connected player keeps it alive indefinitely, the token
  in `taverla:host-tokens` always wins a claim, and the seat in `taverla:seats`
  survives a locked screen. What was missing was the lock to put the key in:
  `hostPathFor` had exactly one caller and it was reached only after a `POST`
  that minted a *new* room. `HeldRooms` is that lock. It is offered **to the
  device holding the key** and to nobody else, which is what lets the console's
  door stay URL-only — a public list of open rooms would hand a stranger not a
  seat but the console, and it stays refused. Every candidate is resolved
  through `GET /api/rooms/:code` before it is offered and a confirmed absence is
  pruned from the store, so the morning after a party the list repeats nothing.
  A lookup that merely *fails* is not a refusal and the room is still offered.
  It sits **under** the two doors rather than over them, because it arrives once
  the server has answered and above them it moved the button a thumb aims at by
  221px.

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
  and the persistent strip already says *2nd of 6* at every phase.

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

- `[Game]` **Numbers take the browser's shape, words keep the interface's
  language**: a French screen on an en-GB browser writes its counts and times
  the British way. `@adrienlcp/browser` goes to 0.2, whose `reloadPage` replaces
  the local one.

- `[Game]` **The favicon is the four answer tokens** — coral circle, saffron
  triangle, sky square, leaf diamond on the night board — where the coral piece
  with a *T* still read as the old orange square in a tab. The touch icon is the
  same four, inset on the board.

- `[Game]` **The setup's controls wear the box's rounded corners**: the choice
  strips, the switches, the number steppers and the sliders were still square
  from the previous world, and the pending spinner is a ring.

- `[Game]` **Opening the console's setup no longer drags the room code down
  the page.** The invitation is held to the screen beside the setup however
  far it scrolls, and *Gather round* stays beside the fold's title.

- `[Game]` **Every game has a glyph, and the glyphs come from Lucide.** A
  note, a question mark, a pencil, a bolt and a bell stand before each game's
  name on the front page's spines and on the host's game picker, and the two
  folded doors carry a screen and a QR code. The nine hand-drawn icon files
  are one `icons.tsx` over `lucide-react`, redrawn in the product's own heavy
  stroke.

- `[Game]` **Opening one of the front page's folded doors no longer pushes the
  other onto a line of its own.**

- `[Game]` **The score track is gone from the console and the wall.** The ring
  of squares from *Départ* to N raised a wide screen's padding from at most 56px
  to at most 120px on every side, and said nothing the standings do not already say. The page and the
  menu now sit at the plain `--layout-padding`, so the freed band goes to the
  stage, and `--track-room` is gone with the ring that published it. The phase
  is still read in `--phase-ink`, on the round's sand and pips; the floor
  holder's and the winner's pawn colour had no other wearer and went with it,
  with `trackInkHolderOf` and the `--on-pawn-N` inks.

- `[Game]` **Every state reads in the dark: a disabled piece is an empty
  socket, a marked item keeps its numeral, and a dropped socket stays off the
  stage.** A disabled control was a dark slab beside the enabled ones in the
  evening palette — *À table !* greyed out looked like *Prendre place* — and is
  now the socket the piece would sit in: no fill, a dashed die-line, the
  ground's muted ink. A large control's label now steps up from a medium one at
  every height, where it used to fall under it past 830px and set *Retour à la
  table* larger than *Rejouer*. A marked slate item, on the player's sheet and
  on the console, prints its numeral in a new `--socket-ink` held at text
  contrast in both palettes. And the connection sentence no longer hangs under
  the menu over the question card's clock and the lobby's lids: it is announced
  without being drawn, while the menu button turns saffron with its dot
  pulsing.

- `[Game]` **The words match the box: the host is the host, a round is a
  round.** The copy left the tavern behind with the board-game redesign —
  *l'aubergiste* / *the innkeeper* is *l'hôte* / *the host*, *la tournée* is
  *la manche*, the doors to push and chairs to pull up are a plain *Rejoindre* /
  *Join*, closing a room says *Fermer la table* / *Close the table*, and the way
  back from the credits and dead ends is *Retour aux jeux* / *Back to the
  games*. The front door's two folded panels say what they show: *Afficher la
  partie sur cet écran* and *Afficher le code pour rejoindre*. The table stays,
  as the people playing round it.

- `[Game]` **Labels, stamps and scores sit on their optical centre.** Where
  the browser supports `text-box`, a control's label, a stamp, a segment, an
  error and a single-line figure are trimmed to their capitals and baseline, so
  an uppercase label no longer rides above the middle of its box. Stamps keep
  their exact size; the boards lose the leading over their figures, and the
  standings, the final board and a player's round board take the room back as
  larger type. A stacked console's standings stop running 7% past their budget.

- `[Game]` **A request the host has moved past is cancelled, not just
  ignored.** Toggling decades, switching the source or leaving a page aborts
  the track preview still in flight, and the server stops the Deezer calls
  behind it instead of spending the quota on an answer nobody reads. A change
  of difficulty asks the preview again, so the count beside it is the one the
  round will draw from. The wall polls one request at a time, and opens one
  pairing rather than two

- `[Game]` **The slate's sheet is prepared on the lobby's stage.** How many
  things to guess, their names and the answer key are one fold under the
  game's pitch, summarised by what is ready, rather than inside the collapsed
  settings where a host never thought to look.


- `[Game]` **The slate's console board holds still and uses the screen.** A
  card's press stays at the same height whatever its label says — a word used
  to lift it 24px — and the collect button keeps its padding, because the grid's
  floor is now measured on the widest press in both locales. The progress and
  the folds go under the board below 1200px, so it keeps five cards across at
  1024 and two on a phone.

- `[Server]` **Zod's compiler, on the one path that pays for it.**
  `import 'zod/compile'` is the first line of the server entry point, which
  compiles every schema built after it — and the wire schemas are all of them,
  since nothing constructs one before that import evaluates. Measured on
  `encodeChecked` over a playing room view: **15.2 to 3.0 microseconds a frame
  at twelve players, 23.3 to 7.6 at twenty-four**. That is the hottest loop the
  server has, because `broadcastRoom` runs it once per connection on every
  state change, so the saving scales with the table.

  **The browser is deliberately left out.** The same import costs 8 381 bytes
  gzipped on the entry chunk, which is the chunk that gates a player joining:
  `/play/:code` is served the empty SPA fallback, so nothing on that screen
  happens until it lands. Against it, a player's screen decodes *one* frame per
  state change rather than one per player, which is tens of milliseconds over
  a whole game. Paying a phone's first load for that is the wrong way round.

- `[Game]` **The shelf is ordered by what a table reaches for**, not by the
  alphabet: the blind test and the quiz first, then the reflex race, Le Fake
  and the bare buzzer. `shelvedGames` is the one list — the front door's cards
  and the lobby's picker both read it — so the order is a product decision
  sitting in the protocol, and the comment above it says so before somebody
  sorts it back.

- `[Server]` **The English half now pays for the name a room shouts too**, on
  1 048 of its 4 506 rows and 3 681 spellings — more rows than the French half's
  largest source and more spellings than all of PolyFact. Typed mode is the
  default answer mode and it paid only the one spelling upstream wrote down, so
  a table that typed *Bush Senior* at a screen holding *George H. W. Bush* was
  told it was wrong. Open Trivia DB publishes no identifier of anything, so the
  entity behind an answer is reached through the English Wikipedia article of
  that exact spelling, and `accepted` is filled from the names Wikidata files
  under it.

  **The count came before the code, and it is what allowed it.** Of 3 844
  askable answers, 738 have no article at all — the rows whose answer is a
  sentence, *The inability to make decisions* — and 693 land on another concept
  through a silent redirect, *July 4, 1776* on *United States Declaration of
  Independence*. That second one is the failure that disqualified OpenQuizzDB a
  day earlier, and it is refused here for free by comparing the *landing* title
  against the spelling asked about. Of the 2 413 that reach an article of their
  own name, 1 338 name something rather than describe it: **34.8%**, against the
  third that had been set as the bar for touching the source at all.

  The gate is Wikidata's own labelling convention — a proper noun is
  capitalised, a common noun is not, *Madrid* and *Charlie Chaplin* against
  *spoon*, *yellow* and *chocolate* — which matters because a common noun's
  `skos:altLabel` holds its *neighbours*: banking *blue*'s would pay a room that
  typed **turquoise**. Two classes clear that gate and are named separately: 87
  answers that are classes rather than things (*Bulldog* is a dog breed) and 361
  that are Wikipedia's own pages about a spelling, *Lift* and *Libra* and
  *Turkic* all being disambiguation pages.

  **The query service is not the database**, which cost a measurement to learn:
  `rdfs:label` is silent on Q9358 — Friedrich Nietzsche — and `wdt:P31` on
  Q54173, General Electric, for 66 of 2 407 entities asked. Labels come from the
  action API instead, and a missing `P31` is read as *unknown* rather than as
  evidence, because a gap that refuses is a gap that quietly costs rows. The
  decoys are resolved on a looser gate and only for the rows whose answer
  resolved — three quarters of the work skipped — because a wrong decoy id
  widens what the bank refuses and can never widen what it pays. `accepted` is
  now filled by three sources of five, and the corpus sweep that refuses a
  spelling naming the row's own decoy runs over all of them.

- `[Game]` **A player's buzzer becomes the floor's dial while the floor is
  held.** A circle nobody can press is not a button, and it was still setting
  `BUZZ` in the ink reserved for what you cannot do, over a name and a number
  stacked under it — three objects, and the only one timing anything was the
  last. The ring is the window now, the clock is inside it, and the name stays
  below: the circle takes back the size the hand had been sizing it for, and a
  dead control leaves the tab order instead of sitting in it disabled.

  **The ring drains where there is a window and stands in full ink where there
  is not** — a floor the host judges by hand spends nothing, and a faint ring
  there read as a dial already run out. It is the round bar's own arithmetic on
  a circle, off the server's deadline and re-keyed per snapshot, so someone who
  asked for no motion still gets where the window stands. The console is
  untouched: the ring belongs to the buzzer, not to the clock.

  The number is divided by how much there is to read — one digit and three are
  not the same object — and the stage's headroom falls from `40rem` to `34rem`
  now the clock is inside the circle rather than under it. Seven widths from
  360 to 899 measure zero on the bank's longest question, and a 812×375 phone
  on its side overflows 137px where it used to overflow 152 to 218.

- `[Game]` **The console's final board says what *Rejouer* will relaunch.**
  Taking the setup fold off that footer — it acts on a round in flight, and
  `finished` has none — took with it the one sentence naming the game, the mode
  and the round count, on the screen where that press commits the room to all
  three without stopping at the lobby. The fold's own summary is drawn under
  the button instead, which is also what tells it apart from *Retour à la
  table* beside it.

  The board's budget is re-measured for the line it costs — 23px above the
  split and 42 below, where the longest summary the shelf can write wraps — and
  nine players now measure zero at every laptop height from 768 up, where
  `21rem` was already 7 to 9px short of the footer it was written for.

- `[Game]` **The player's lobby is two columns on a laptop**, for the reason the
  console's lobby is: the pitch and the roster are what this player is waiting
  on, and the invitation is the way in for whoever is beside them with no screen
  in the room yet. Stacked it came to 1 219px of content in a 900px laptop — the
  QR square and every name under the fold — with 570px of the column unused
  beside a 256px square. Split, the whole phase fits at every width from the
  breakpoint up, and a table of nine hangs 152px under it where it used to hang
  five hundred and sixty.

  The ratio is the console's inverted: there the invitation takes the wider
  track because it is what the room reads from four metres, and here nobody
  reads this screen but the hand holding it. What the invitation costs is
  bounded, so it takes the narrow one.

  Two defects the column of its own exposed, both silent. **The code's container
  term was dead** — `24cqi` never fired at any of seven widths from 320 to 1920,
  so the number had never been checked against the face, where the console had
  measured `20` and written down why. The split is what would have made it live,
  and live wrong: a 293px column asking for 70px of type draws a code of four
  `W` as `WW / WW`. And **a spanning item hands its surplus to every row it
  spans**, so a lobby nobody had joined yet drew one line of pitch and then two
  hundred pixels of nothing before the roster, the invitation's spare height
  having been split evenly between the two rows it crossed. Declaring
  `auto 1fr` names where it goes instead.

- `[Server]` **PolyFact pays for the name a room shouts too**, which doubles the
  reach of a fix that had only ever run on one source. 864 of its 1 900 rows now
  hold a second name and 2 248 spellings, so the bank goes from 744 rows with an
  alternate spelling to **1 608**, and from 2 057 spellings to 4 305. Its answers
  are people — *André Téchiné* typed as *Téchiné*, *Marcel Pagnol* as *Pagnol*,
  *Robert Zemeckis* as *Zemeckis*, *Takeshi Kitano* as *Kitano* — and every one
  of those was graded wrong before, because `gradeQuizGuess` measures the whole
  of what was typed and `matchesAnswer` forgives a slipped finger rather than a
  dropped surname. 139 rows accept a strict shortening of their own label, and
  beside them stand the names a room actually uses: *royaume de Saxe* answered
  *Saxe*, *Royaume des Pays-Bas* answered *Pays-Bas*, *Russie* answered
  *Fédération de Russie*.

  Nothing new was built for it. `wikidata-aliases.ts` and `acceptedOf` were
  already there and already tested; what was missing was the entity id, and
  **PolyFact had it all along** — `fact_id` is `subjectQID|propertyID|objectQID`
  and its third segment is the answer. Reading it there rather than through the
  labels is the one decision in the change: *Athènes* is two entities in this
  pack, and it is the one label in 1 322 a label-keyed lookup would have
  answered with a coin toss. The decoys are reached the other way, through the
  positional alignment of `option_ids` with `option_a`–`option_d` that
  `birthYearsOfLabels` already exploits, because `withDecoysSpread` moves a decoy
  to a row whose own `option_ids` never held it. A label two entities answer to
  is a coin toss this can afford there: those ids are read to collect the names
  a decoy goes by, and a wrong one widens what the bank refuses rather than what
  it pays for.

  Wikidata offered 3 084 aliases and the bank took 2 248. **Every one of the 836
  refusals is `acceptedOf` doing its job** — *Eric Rohmer*, *Andre Techine*,
  *Benoit Jacquot*, *Ryusuke Hamaguchi*: spellings the matcher already forgives,
  which buy nothing. The refusal that matters never fired here and is kept
  anyway, so a corpus test now states it over the shipped bank rather than over
  the ingestion: **no accepted spelling of a row may grade one of that row's own
  decoys right.** Wikidata files Augustus as *Gaius Julius Caesar* and the bank
  prints *Jules César* beside him as a wrong answer, and that is the only way a
  second spelling can cost a room instead of paying it. It sweeps both sources
  that fill `accepted` and costs nothing to leave in place for the three that do
  not yet

- `[Server]` **Every Mintaka row has been read once, and forty-five of them were
  wrong.** The census the source owed found almost no `choiceOnly` — seven rows
  out of 1 194, where the two French banks before it gave 695 — because a
  Wikidata-backed row answers one entity by construction and a sentence naming
  a set is the exception. What it found instead was **falsehood**: Woodrow
  Wilson in office during the Depression, John Wilkes Booth as an assassinated
  president, Churchill as prime minister through the Berlin blockade, the
  Terracotta Army under the Qing, medals at a Summer Olympics of 2019 that
  never took place, and *Quel est le surnom de Boston ?* answering *Boston*.
  Each is a `drop` in `question-repairs.json` carrying the sentence that says
  why. One is repaired rather than dropped: Thomas Jonathan Jackson's nickname
  is *Stonewall Jackson*, and his three wrong answers are Civil War figures, so
  naming it leaves a question that works picked as well as typed.

  **That is the census's real yield here and it was not what the plan
  expected.** A source translated from English crowdwork does not fail by being
  unanswerable, it fails by being false — so the artefact it fills is the
  repairs file rather than the choice-only list. Read by eight subagents over
  the banked rows, every verdict a proposal with a reason, and every one of them
  checked against the row before it reached a file.

- `[Server]` **A president who played college football is no longer dealt three
  athletes.** `poolFor` read the discipline rung before the trade for every
  subject, and Wikidata records a sport for anybody who ever played one: Joe
  Biden and Gerald Ford played college football, RFK ran cross-country, Rama IX
  won a sailing medal — so *Quel président américain a obtenu le plus de voix ?*
  stood Tom Brady beside Joe Biden, and seven of the eight history rows the
  sport rung reached were dealt athletes. The rung order follows the subject
  now: a sport question asks the discipline first, everything else asks the
  trade. Biden stands beside Xi Jinping, Lenin and Saddam Hussein.

  The eighth row is what it costs, and it is one: *Jackie Robinson* really was a
  baseball player, and his widest occupation is **military officer**, so the
  first black man in the major leagues is now dealt three Union generals. That
  is the incidental-kind fault one rung down rather than a reason to go back —
  widest-bucket-within-a-rung is measured and settled, and seven rows for one is
  the trade.

- `[Server]` **A room that shouts *Lakers* at a screen holding *Lakers de Los
  Angeles* is now right.** Mintaka files an answer under the label Wikidata
  gives it, and a label is the full name — *dynastie Tang*, *Warriors de Golden
  State*, *Première Guerre mondiale* — where a table types the half of it
  everybody says. The quiz grades a typed answer against the whole of what was
  written and forgives a slipped finger rather than a dropped surname, so those
  rows were told they were wrong.

  `wikidata-aliases.ts` fills `accepted` from French `skos:altLabel`, through
  the same batched, resumable SPARQL the title, kind and birth-date lookups
  already go through — four queries for the source. **769 of the 1 194 banked
  Mintaka rows now take a second name, 2 119 spellings in all, and every one of
  them was refused before.** 140 rows accept a strict shortening of their own
  label: *Lakers*, *Cavs*, *Ming*, *Shaq*, *Tanganyika*, and beside them the
  names a room actually uses — *Grande Guerre*, *39-45*, *Fleuve Bleu*, *RDA*,
  *Paname*.

  `acceptedOf` is the guard, and the third of its three refusals is the one
  worth naming. A spelling the row already wins on buys nothing, and one folding
  to under three characters is as likely a slip as an answer — but **a spelling
  one of the row's own decoys goes by pays for the answer the question called
  wrong**, and the printed labels do not find it. Wikidata calls Augustus
  *Gaius Julius Caesar*, and the man that names was standing beside him as a
  decoy under *Jules César*. So the three decoys are resolved to entities too,
  and the row refuses any name they answer to. Its dangerous neighbour was
  already guarded: `[bank] holds no question whose own decoy would be graded
  right` grades each decoy against the whole row, `accepted` included.

- `[Server]` **A wrong answer is no longer from another century than the right
  one.** PolyFact draws its decoys from entities that answer the same relation
  somewhere in Wikidata, and that test passes on everybody — *Aristote* is the
  author of something, so he was offered as a possible author of a manga
  published in 2015, beside *Terry Pratchett* under a fable by La Fontaine and
  *Randall Munroe* under a novella by Mérimée. A room eliminates those knowing
  nothing at all, so a question offering three of them is a question with one
  candidate, and choice mode is where it is paid.

  The fix is one Wikidata property. `wikidata-years.ts` resolves a birth date
  for every candidate entity, resumable and cached the way the titles and views
  already are, and `withDecoysSpread` swaps out any decoy born more than a
  hundred years from its own answer. **A hundred is where the gaps say the tail
  begins**: half the pairs were already within forty-one years and three
  quarters within ninety-one, so the cut moves what upstream got wrong and
  leaves what it got right. Measured over the banked rows, decoy slots more
  than a century from their answer went from **24.6% to 0.3%** — the remainder
  being the handful of antique rows whose relation offers no closer candidate,
  where the old rule still stands.

  It needs no list of the relations it applies to: only a person carries a birth
  date, so `developer`, `place of death` and `country of citizenship` see it
  never fire, which is right — a century is not what makes a studio or a city a
  bad candidate. The trap it walked into first is worth the sentence: an undated
  entity is never *known* to be an era away and has never been used, so ranking
  a replacement on the absence of a fault put the *United States Holocaust
  Memorial Museum* under a La Fontaine fable. A known year that fits now beats a
  missing one. The rule is the one in the ingestion whose evidence is not in the
  built bank — no year is banked, deliberately — so it is the one asked in
  `scripts/polyfact-source.test.ts`, which is why vitest's server project now
  looks in `scripts/` as well as `src/`.

- `[Server]` **The French bank more than doubles, from a source that had to be
  filtered down by a factor of thirty.** PolyFact is 58 807 French
  multiple-choice questions generated from Wikidata, CC BY-SA 4.0 — and what it
  actually holds is **fourteen sentence templates** filled in over and over,
  most of them about entities no room has heard of. Seven of the fourteen are
  banked; the other seven fail for reasons of their own, and `country`,
  `continent` and `official language` fail three times over — asked about
  villages, answered by inherently famous entities, and leaking the answer into
  the prompt (*dans quel pays se trouve la cathédrale Notre-Dame de
  **Strasbourg** ?*). Of the 26 079 rows left, a row is kept when the subject's
  French Wikipedia article took **300 views over sixty days** and all four
  candidates took 60: **4 321 subjects clear the first bar and 2 144 rows clear
  both**. Three passes then take 244 of those back — see below. French rows go
  **2 018 → 3 918**, the whole bank **6 455 → 8 355**.

  **Notability is traffic, not sitelinks**, and that cost a day to learn. How
  many Wikipedias hold an article is a measure of *bot coverage*: the Cebuano,
  Waray and Swedish bots wrote one for every municipality on Earth, so
  *Torralba del Pinar*, sixty inhabitants, clears any bar *Jumanji* clears —
  filtering on it keeps `official language` and throws away `author`. Two API
  traps came with it and both are written down in `frwiki-notability.ts`:
  `prop=pageviews` **paginates**, and a one-shot request over four thousand
  titles leaves three quarters reading zero, which is indistinguishable from an
  article nobody opens; and the HuggingFace `/rows` API cannot carry 56 324
  rows, refusing from around the eleven-thousandth whatever the throttle, so the
  three splits are fetched as parquet in one request each through `hyparquet`.

  **One entity was the wrong answer under 253 of the 327 `creator` rows** —
  *Gunter Demnig* laid the Stolpersteine and is therefore the creator of tens of
  thousands of Wikidata items, and uncapped he would have been one French arts
  row in nine, twice an evening. `withDecoysSpread` caps any entity at 2% of its
  relation and swaps the excess for the candidate that relation has leant on
  least, checked against the real grader so a swap cannot cost the row.
  `[bank] leans on no single wrong answer` is what holds it, over any language
  and subject with enough rows for a share to mean anything.

  **The same defect sat on the answers, and it was the worse one.** *De quelle
  nationalité est X* is answered **France in 154 of 418 rows and the United
  States in 94** — so a room answering *France* without reading the question
  takes better than one round in three, free in typed mode and above the quarter
  a random pick is worth in choice. `withoutOverusedAnswers` caps an answer at 5%
  of its relation and drops the excess, which takes France to 9.9% and costs 231
  rows. Capped rather than filtered: dropping every France would teach a room the
  answer is *never* France, which is the same exploit facing the other way.

  A read-through of all 2 144 found the rest, and one of them was a rule: **59
  prompts end *…a été réalisé ou mis en scène par ?***, a template that forgot
  its interrogative word, and a sentence stopped short is what the screen shows.
  `par qui ?` is the repair that needs no gender agreement. Thirteen more rows
  are dropped and five repaired by hand — two unreleased games described in the
  present tense, a handful of titles that collide with a famous namesake
  (*La Jetée*, *Il bidone*), and four rows whose decoy answers the prompt as well
  as the answer does, all of them a first-party studio beside its own publisher.

  What it does **not** buy: PolyFact is Wikidata relations about people and
  works, so French history stays at 64 rows and geography at 156. The 1 900 land
  as 1 488 `arts`, 407 `everyday` and 5 `science` — and because the draw picks a
  category first, that makes those two more *varied* rather than more likely.

- `[Game]` **The credits page names three banks, not two.** CC BY-SA asks for
  the credit to travel with the work, and PolyFact's sentence has to stay true
  to what the ingestion does to it — so it says which seven of the fourteen
  shapes were kept, that a row survives only when the room has heard of its
  subject and all four candidates, and that a wrong answer the source leaned on
  was swapped out. The list was one entry per *language*; it is one per source
  now, because the French half is written by two people who never met.

- `[Server]` **The French question bank grows by a seventh, and stops asking the
  same thing twice.** Three cheap sources, none of them a new upstream: the
  cached OpenQuizzDB listing was fetched in August and holds 516 packs where the
  live one serves 552; `MOTSCROISES` had been skipped on a taste call — *a
  crossword clue names the length and the first letter* — which is what makes it
  **more** playable typed, not less, and `ALPHAQUIZZ` and `ORTHOQUIZZ` are the
  same family and were already banked; and `pack-20.json` was refused whole over
  a raw newline upstream left inside a JSON string, so `fetchPack` now folds the
  control characters a string may not hold into spaces rather than losing four
  questions to a character nobody can see. French rows go **1 767 → 2 018**.

  The pass over the 288 new rows is what found the older fault: the build had no
  deduplication at all, and the two banks carried **41 questions twice** under
  different pack ids — a crossword grid reissued, Gainsbourg asked the same thing
  in two packs about him. The guard a room already has against repeating itself
  is by id, so a game could serve the same question in two rounds.
  `withoutRepeatedPrompts` keys on the language and the normalised prompt, keeps
  the first of a group and names the ones it settles, because a group whose
  copies disagree on the answer — *the largest country in the world* is banked as
  both `Russia` and `Russian Federation` — is a coin toss worth a repair.
  `[bank] asks no question twice` is what holds it.

  Twenty-six repairs and fifteen `choiceOnly` flags came out of the same
  read-through. The flags are all one shape: an answer no keyboard produces —
  `Environ 850`, `110-120 volts`, `Par leurs sécrétions` — where the four options
  make one question. The repairs are the usual two: a decoy that answers the
  prompt as well as the answer does (osso buco *is* served alla milanese;
  panzerotti *is* the folded stuffed pizza), and a claim with a shelf life that
  has run out (Nadal's career Golden Slam is 2010, not 2008; Marie-José Pérec
  stopped being the only French woman with three Olympic titles).

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
  keyboard and its way home is the only thing on it.

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

- `[Game]` **A prerendered page fades in once.** The page painted by the
  document no longer plays `page-enter`, which the app then played a second
  time over its own nodes; a page reached by a navigation still arrives.

- `[Game]` **The launch follows an opened setup down the page.** *À table !*
  and the reason it refuses are one object, under the setup and pinned to the
  screen's bottom edge until the setup ends: scrolled to the last setting, the
  press sat off the top of the screen and its reason at the far end.

- `[Game]` **A healthy room no longer reads as reconnecting.** When a screen's
  socket was replaced — a nickname change, or React mounting twice in
  development — the old socket's close landed after the new one had opened and
  set the screen to *Reconnecting*, greying out every control on a live
  connection. A torn-down socket now says nothing about the one that replaced
  it, and `choice-fits.spec.ts` checks the status line is empty after its sweep.

- `[Server]` **The bank's one 275-character choice is repaired.**
  `vikidia-astronomie-2-1` ran three sentences together without a space,
  misspelt half of them and dated the Moon's impact at 5 billion years; it is
  123 characters now, and was the one choice no screen could show beside its
  question and three decoys at a 14px floor.

- `[Game]` **Every reveal fits a 768px laptop, and a console held in a hand
  reaches the next round without scrolling.** Above the split the reveal's
  footer is one row — the next round, the way out, the hold strip — with the
  settings fold under it, which gives the stage about 7rem back. The blind
  test's list sits under the cover and the title together rather than beside
  the cover, so it can take two columns, and a name in that list is cut only
  when it alone is wider than its row. Stacked, the standings go under the
  footer: every player already has them on their own screen. Where the
  footer's row cannot fit — French at 1024px — the way out goes under the next
  round rather than wrapping the row; a long answer is sized against the column
  it is set in, so a title past sixteen characters no longer comes down in four
  lines beside a cover; and below the split the cover sits beside the title
  wherever the title keeps 16rem.

- `[Game]` **The quiz reveal fits a 1280×800 laptop again.** From five answers
  the list beside the answer flows into two columns, the hold bar's row only
  exists while a bar is drawn and sits a tighter gap under the stage, and the
  answer gives up the height the bar takes. A full table with a two-line answer
  and a 25s hold no longer runs the page past the bottom.

- `[Server]` **A room nobody is connected to is kept ten minutes from the last
  socket leaving**, not from the last frame anyone sent. A host who sat in the
  lobby for a quarter of an hour and reloaded could lose the room whenever the
  one-minute sweep fell between the close and the reconnect.

- `[Game]` **Marking the slate keeps the way back to the list.** Once every
  sheet was collected, the console lost *Back to the sheets* and with it the
  only grid of items, so a host could not jump to one without ending the game.
  It now reads *Back to the list*, and the grid's heading says everything is in.
- `[Game]` **A fold inside a fold keeps its own chevron**: an open parent no
  longer turns every nested chevron upside down.


- `[Game]` **The invitation poster is back**: `/invite/:code` shows the room's
  code and square alone, centred, for a big screen that only has to let people
  in. The wall had replaced it, but its lobby also draws the game and the
  table, and it needs the host's device to pair. The console menu offers
  *Show the QR code, big* beside *Show the game in a new tab*, and the home page
  folds *Show a table's invitation* back in under *Show a table on this screen*.

- `[Game]` **The menu scrolls when it outgrows a short screen**: React Aria capped
  the popover at the viewport edge and left the rest overflowing, so a host's
  exits could fall off the bottom.

- `[Game]` **The wall's lobby says the innkeeper is choosing a game** instead of
  telling nobody to choose one.

- `[Game]` **Opening a fold no longer shifts the page sideways**, a focused
  field inside one keeps its whole ring, and the slate's item names are wide
  enough to read twelve letters and an emoji whole: the document reserves its
  scrollbar gutter, the fold's clip leaves the ring room, and a name box is
  sized to the longest name the protocol takes.

- `[Game]` The slate's marking wears the judged-buzz field again. It lost it
  when `correcting` left the phases; `useMarkingField` stamps `data-marking`
  on the wall and on a player with nothing left to write.

- `[Game]` **The game picker is three by two on the big console**, not a
  column of six. Stacking below `37rem` stopped the 5+1 wrap but drew the
  lobby's 556px picker at 1440px as one column; it now takes one row, three by
  two, two by three or one column, from thresholds measured off the widest
  French label at its ceiling. `strip.tiles-below` is the grid shape.
- `[Shared]` **The slate offers no reveal hold.** The console hides the
  auto-advance strip under it, as it hides the rounds strip, and the server
  never counts a slate reveal down — a hold remembered from another game would
  otherwise move the room to the final board with no control on screen.

- `[Game]` **The four choice buttons drew at 52px with no block padding**, on
  the screen whose comment says they are *sized by the press rather than by the
  words*. `box` is included inside `&.outlined`, so a control's height and
  padding land on `.button.outlined.medium` — three classes — and
  `.choices .button` has two: it lost both declarations in silence, and the
  `padding: 0 var(--space-m)` shorthand took the vertical padding with it, so a
  candidate long enough to wrap put its second line against the edge. Measured
  72px and 12px after, against 52 and 0 before. The rule is nested on the
  section it modifies and names `.medium`, which is the four classes it takes
  to win — **any component overriding a control's box needs the same count**,
  and that is now written where the next one will read it.

- `[Game]` **The reveal struck the screen instead of the card.** `card-strike`
  sat on `.player-round.centred`, which is every phase but `playing` — the
  lobby, the countdown, the reveal, the final board and two notices — so a 1.06
  scale settling over `slow` moved the *whole* screen on each of them: measured
  at 877px down to 827 over 450ms on a 978px window, landing right under the
  press that had just answered. It read as a reflow and was reported as one
  ("un petit saut de UI, les boutons s'élargissent"). It goes on `.outcome`,
  which is the card the round pays out; the board beside it does not move at
  all, and the five other phases keep the field's own colour change as their
  moment. The console's `.reveal-panel` is untouched — that one is still a
  panel.

- `[Game]` **Two links in the menu pointed at the page they were drawn on.**
  *Accueil* on the front door and *Crédits* on the credits page were pressed
  and nothing happened. `useIsCurrentPath` is the predicate, and each one is
  absent rather than disabled: a way out that goes nowhere is not a way out,
  and on the front door the exits have no other rung, so the group goes with
  it.

- `[Game]` **The floor's dial stepped instead of running.** `floor-drain` took
  its start from `calc(1 - var(--drain-from))`, and a `calc()` holding a
  `var()` is never interpolated in a keyframe: `getComputedStyle` read the
  unresolved `calc(0.3px)` back from the first frame to the last, so the ring
  moved only when a snapshot re-keyed the circle — one jump per correction,
  which is what a room saw as a clock ticking rather than draining. Measured
  against the two forms it is not, on the same 10s animation at 1.5s: a bare
  `var()` and a literal both read `0.406176px`.

  The share already spent is now computed beside the duration and substituted
  whole, which the reduced-motion reading takes too. The ring advances every
  frame — 0.050 of the circle at 1.5s and 0.519 at 15.5s of a 30s window.

- `[Game]` **A player's reveal was decided by a board no formula could reach.**
  Nine rows came to 707px beside a payout of 219, so the taller half set the
  height of the screen on its own and the page ran 104px off a 1440×900, 174 off
  a 1280×800 and 198 off a 1024×768. Every term of a row was fixed — 8px of
  padding, a 4px gap, a score at a flat `1.5rem` — and the one clamp in it, the
  name's, sat on its floor at every laptop height. This is the console's
  `finished` fault one storey down, and the third time in this pass that fixed
  furniture turned out to be what a budget cannot spend.

  **A row is one multiple of its own size now**, which is the whole precondition:
  the padding and the gap go in `em`, the score and the payout become fractions
  of the name, and both give up the reset's 1.5 line-height — half a row of
  nothing above and below a numeral was the single largest term in the row. The
  sentence under the name gives up its leading too, because it is one ellipsised
  line and leading is for prose that wraps. That alone takes a row from 78px to
  63 at the same size, on every table and every screen.

  **And the stage publishes what the board may spend.** `RoundBoard` writes how
  many players are in the room, the reveal writes how much screen is left, and
  the row divides the one by the other: `18.5rem` of chrome above the split,
  measured at 296px on a 1440×900 and 283 on a 1024×768. The budget is a `min()`
  over the clamp, so it only ever takes size away — a table of four reads exactly
  as it did — and it carries a floor below the clamp's own, because the clamp's
  floor is the only term that fires on a phone and a 768px-tall laptop sits on
  the same one. A budget that could not go under it would never fire at all,
  which is the shape the question's length term met one commit ago.

  **Stacked is not that arithmetic made smaller**: the two halves share one
  column, so what the payout costs comes off the board's budget as well — 28rem,
  and 37 for the one game whose payout carries a picture, read off the markup the
  way the console's reveal panel reads its own header.

  Nine players now measure 0 at 1440×900, 1280×800, 1366×768, 1024×768, 1920×1080
  and 900×800, on the quiz and on the blind test alike. What is left is content
  that wants more than the screen: 57px on a 1440×700, and 82 on a 390×844 where
  a payout, nine names and nine sentences do not go into 844px at any size a
  grandparent can read.

- `[Game]` **A quiz answered at the buzzer ran off every screen but one.** Two
  objects on a player's screen, each sized as though it were alone: the question
  is the quiz's stimulus the way the clip is the blind test's, and the difference
  is that a clip takes no room. Stacked they came to 535px of a 564px budget, so
  the page scrolled 54px off a 1440×900, 82 off a 1440×700, 44 and 55 off a
  1280×800 and a 1024×768, and 155 off a 360×640. The bank's longest question
  took all six past 138, and at 307px of prompt on a 360×640 no size of circle
  could have closed it.

  **A laptop is the screen with width to spare and none of the height**, so the
  question moves *beside* the circle above the wide-screen breakpoint — the split
  the reveal, the vote and both lobbies already make, on the same shares: what
  you read takes the wide track, and a circle bounded at 420px takes the narrow
  one. Read off the markup rather than the width, because a blind test's screen
  carries no question and a split there would draw the circle against an empty
  column.

  **Stacked, the circle takes what is left**, published by the stage as a fourth
  limit beside the three it had: 296px is what the page keeps for itself at
  360×640 and at 390×844 alike, and the circle never learned that the stimulus
  above it had taken any. It says nothing where there is nothing above, so the
  blind test's buzzer is byte-identical at all seven widths — 378, 294, 336, 323,
  269, 304, 269.

  **And the question publishes how long it is**, which is what no viewport can
  answer and the reveal's own answer has done since it was drawn: the bank runs
  from nine characters to a hundred and ninety-two, and at a size the screen
  alone picks the long ones are eleven lines. Archivo at width 125 sets 0.607 of
  its font size per character — measured with a `Range` on the rendered node — so
  one line holds `164.75cqi` and three hold `494`. The median of 62 and the 90th
  percentile of 91 still clamp to the full size; the tail reads smaller, and the
  tail is what could not be read at all. The clamp's floor comes down with it,
  because **on a phone the floor is the only term that ever fires**: 4.5vmin of a
  360px screen is 16px, so a clamp starting at 24 drew every question at 24
  whatever its length.

  Both phases now measure 0 at 1440×900, 1440×700, 1280×800, 1024×768, 900×640,
  390×844 and 360×640, with the real question and with the longest one the bank
  holds. A phone on its side is still 152–218px short and cannot be made to fit —
  a banner, a question, a circle and three lines do not go into 375px of height
  at any legible size.

- `[Game]` **`BUZZ` was drawn outside the button it names**, and it vanished
  rather than overflowed: the word is set in the field's own colour, so the part
  of it past the ink is field on field. The label was sized against the *screen*
  in an object the screen had stopped deciding the size of, which is the fault
  this product keeps meeting one surface at a time. It was already there before
  this pass: the dead buzzer is `30vh` wide, so any screen under 800px tall drew
  a 226px word in a 210px circle. The heights were measured when that circle was
  drawn and the lettering in it was not.

  The circle is the container and the word takes a box of its own to read it,
  because a container cannot be asked about its own width. `BUZZ` sets at 0.8833
  of its font size per character with letter-spacing counted, so the word is
  3.533 times the size and `16.9cqi` is the widest share of the diameter this
  product already draws — the 0.598 a 378px circle at the clamp's own ceiling
  gives. Every state now holds that share or less, from a 420px circle down to a
  112px one, where four of them were over 1.0. The box carries the type mixin
  again rather than inheriting it, because `letter-spacing` inherits as a
  computed *length*: -0.035em of a 64px circle reaches a 20px word as -0.112em
  and folds it onto itself.

  What it costs is the lettering on a short laptop, which stops being pinned at
  the clamp's 64px ceiling and becomes one share of whatever circle it is in —
  0.597 everywhere, where a 294px circle used to wear the same 64px word a 420px
  one does.

- `[Game]` **A player's screen buried the one line the buzzed phase is about.**
  `Bertrand a buzzé` and `C'est à toi. Annonce !` were drawn at 16px in
  `--ink-muted` under a 378px circle nobody can press — the ink reserved for
  *what you cannot do*, spent on the sentence a player has to act on now, in a
  noisy room. The console bills the same fact as an `h2` in `billboard` and
  says why: the size a host reads while looking up at the room. So does this
  screen now, and it is the register the floor's clock under it already had —
  which made the number a player does not need three times the size of the
  name they do.

  Two things paid for it. The floor's line **took the status slot** rather than
  standing under it, because `Quelqu'un a été plus rapide` and `Bertrand a
  buzzé` were one fact twenty pixels apart at one size; the anonymous half
  survives exactly where it is not a duplicate, which is a buzzer whose seat has
  gone and leaves no nickname. And the dead buzzer **stopped being sized by the
  hand** for the length of the window — the move the console already makes for
  the countdown it draws over a reveal, where the object gives up the screen
  because what the room is reading is underneath it.

  300px is measured, not picked: a 1440×700 laptop scrolled 7px before this and
  a 360×640 phone 20 — both were already scrolling, both land on 0 — and 260,
  220 and everything below them buy nothing at any width that is not a phone on
  its side. The other five sizes never scrolled and still do not.

- `[Game]` **A player's vote board and final board both ran off a laptop**, and
  the two are one mistake a phase apart: a column capped at 900px holding a list
  of short rows, with five hundred pixels of viewport beside it doing nothing.
  Le Fake's board of ten candidates was 305px past a 1440×900 — on the one phase
  carrying a clock a player cannot pause — and nine players at `finished` were
  270px past it, with six of the nine above the fold on the screen that says
  where the evening left everybody.

  **Both deal into two columns now**, gated the way the console's own board
  already was: the count asks for the split and the container grants it. The
  vote list splits past six candidates and at a 720px list, which is where the
  second column stops paying — measured, the list bottoms out at 315px there and
  the longest candidate settles at three lines, where a 600px list draws that
  same candidate in five. The final board takes the console's 624px threshold
  unchanged, because it is two of the narrowest single column and a player's
  board is narrow in the same places. The rule moved into `Scoreboard` with it:
  both callers ask the same question of the same rows, and a roster opts out
  because it is read while it is still growing.

  **A `@container` rule on the element that declares the container never
  fires**, which is how the first attempt at the vote list did nothing at all:
  an element is never its own query container, and the `ul` had been carrying
  `container-type` for its rows since the day a viewport unit came off them. A
  query that *cannot* match reads exactly like a threshold nobody reached. The
  container moves up to the section and the rows take one of their own — which
  they owed anyway, because a candidate drawn in a 408px column was being sized
  for 828.

  Ten candidates: 358 / 335 / 262px of overflow at 1024×768, 1280×800 and
  1440×900, now 38 / 15 / 0. Nine players at `finished`: 317 / 306 / 270, now
  33 / 14 / 0, and 0 at 768×1024. A 390×844 phone scrolls either list as it
  always did; neither is a list a phone was ever going to hold whole.

- `[Game]` **The console's final board ran 269px off a 1280×800**, with
  *Rejouer* half under the fold and *Retour à la table* entirely below it — on
  the one screen whose whole job is to say who won and let the room decide
  whether to play another. `finished` was the phase with no height budget where
  every other stage on this console divides what is left of `100dvh`, so the
  board kept the row a lobby draws: a 32px numeral on 24px of fixed padding,
  72px a row, nine of them.

  Three things were wrong and only the last is arithmetic. **The footer was
  still running a game that had ended** — the auto-advance delay and the setup
  fold act on a round in flight, and both are behind the button beside them,
  since *Retour à la table* lands on the lobby whose stage is the picker, the
  roster and the seat. They cost 158px of a 302px footer. **The board was the
  last wide stage still stacking**, so the table divided whatever the name had
  not already spent — 237px for nine players, 18px rows — where beside the name
  it divides the whole 464 and reads at 46. And **the rows' furniture was fixed
  padding**, the part a formula that only shrinks type can never reach, which is
  the lie board's lesson met a third time.

  Two things fell out of the split. The container the sub-columns are measured
  in **has to be the box the table is drawn in**: the board is 1216px wide
  whether it splits or not, so measured against it a room of nine was dealt into
  two 220px sub-columns inside a 500px track — the truncation the 624px
  threshold exists to prevent. And **the split needs something to put in both
  halves**: with nobody scored there is no name, and two columns left a 13px
  label alone in 676px of field. `:has(.winners)` decides the composition, the
  header the table subtracts and which box the query reads, all three off the
  one fact the component already carried.

  Measured after, nine players: no overflow and both exits above the fold at
  390×844, 430×932, 768×1024, 899×800, 900×800, 1280×800, 1440×900 and
  1920×1080. A 360×740 console still scrolls 68px — down from 353 — with the
  rows already on their legibility floor.

- `[Game]` **The winner's name was sized against the viewport in a column that
  had stopped being one.** `clamp(3rem, 13vmin, 11rem)` knew nothing about the
  track it is set in, so `ZOÉ` was drawn at 104px in a 676px column it could
  have filled and `Wolfgangamadeusmozart` was broken mid-word at that same size.
  It is `min(22vmin, 106cqi / --longest-word-width)` now — the height it may not
  eat, and the width its longest unbreakable run needs — which is the revealed
  title's own pair on a third surface, with the same constant because it is the
  same face. `container-type` goes on the header rather than the board, one
  level further down than the sentence goes, because the board is twice the box
  the name is drawn in.

  Measured at 1280×800: `Zoé` 176px on one line where it was 104, and
  `Wolfgangamadeusmozart` whole at 34px where it was broken at 104.
  `Anne-Charlotte` sets at 80 over two lines, breaking at its hyphen, which is
  what the guard is for.

- `[Game]` **`WONDERWALL` came down as `WONDERWAL / L` on a 1440px console, at
  the size the formula had picked to hold it whole.** The term that promises a
  whole word divides a constant by the word's character count, and the constant
  was the face's *mean*: `monument` averages 0.898 of its own font size per
  capital, so `n` of them were handed `111cqi / n`. Measured on the rendered
  node over a fifty-title sample, that promise was kept fifty-eight per cent of
  the time — `ILLINOIS` sets at 0.67 of the mean and `MAMMA` at 1.053, and a
  word above it breaks in half with `overflow-wrap: anywhere` doing exactly what
  a guard of last resort does.

  **An average is the right measure of a paragraph and a coin flip on one
  word**, so the length stays a count and the run is now published as a width.
  `M` and `W` are the only two letters that need it: every word above the mean
  in that sample holds one, and every word under two thirds of it holds none. So
  the pair counts 1.3 in `answer-fitting.ts` and everything else counts 1, which
  is what keeps the constant near the mean while making it the worst case rather
  than the middle of one — `106cqi` on the console and `116cqi` on the player's
  screen, which reads the catalogue's own casing and takes a sample of its own.
  A flat character count would have needed `91`, and cost the answer eighteen
  per cent of its size instead of four.

  Measured after, in a 532px column at 1440×900: `Wonderwall`, `Pocahontas` and
  `Mamma` each on one line, and `Illinois` still at the size it always had.

- `[Game]` **The reveal's auto-advance strip had never once been a row.** It
  stacked its four segments down a 100px column, with `Temps avant la tournée
  suivante` broken over five lines on a 1440px screen — and at every other width
  too. `strip.stacks-below` puts `container-type: inline-size` on the strip's
  root, which implies `contain: inline-size`, so the box lays out as though it
  held nothing; the console footer is a centred column, so the strip was
  shrink-to-fit. The two together resolve to **zero**, and every container query
  it owns was firing at once. `.setup-fold` beside it escaped only because it
  already carried a width for its own composition.

  It is the inline twin of the height trap the reveal's budget already carries,
  and it fails the same silent way — a strip that has always been a column reads
  as one somebody drew that way. `e2e/strip-rows.spec.ts` now refuses a strip
  whose container measures zero on the narrowest screen; its sweep could not,
  because the sweep writes a width onto that box before it reads anything.

- `[Game]` **A room of nine cut five of its names to three letters, on the one
  screen that exists to say who won.** The final board goes to two columns past
  eight players and that was the whole test: `final-board.sass` carried no media
  query and no container query at all. On a 375px console a 328px board was split
  into two 140px columns each holding `4ch 1fr auto`, which leaves 59px for a
  nickname — `Adr…`, `Jea…`, `Clé…`, `Mar…`, `Ann…`. Swept across board widths
  with nine real names, the split stops truncating at 540px.

  **The count says two columns are wanted; the container says whether there is
  room for them**, and one of the two was answering both. The threshold is not
  read off that 540px, because a nickname is up to twenty characters and no
  room's names are in a dictionary the way a strip's labels are. It is what two
  of the *narrowest single* column need: a 320px screen gives this board 288px,
  so two of those plus the `--space-xl` between them is **624px**. Below it the
  board is one column and the page scrolls, which is the bargain a console held
  in a hand already strikes one screen over.

  Measured after: every name whole at 375px, two columns and nothing truncated
  from a 629px board up, and the 1280×800 console unchanged.

- `[Game]` **A socket that blinked drew `Reconnexion…` across the room's own
  code.** The shell reserved `calc(var(--layout-padding) + 116px)` for the fixed
  corner menu — a hard-coded guess at a trigger that measures 97px inside a room
  and 77px at a front door. It was 18px too much with the connection alert empty,
  which on its own broke `TOURNÉE 1 SUR 10` onto two lines at 390px, and 129px
  too little the moment the alert filled: the live region renders *beside* the
  trigger and takes the box to 245px, against a header that had 242px for two
  facts. Nothing warned; the two were simply drawn over each other.

  Two edits, and the second is what keeps the first true. **The corner is one
  object wide and the sentence hangs below it** — the alert was the only thing
  in that box whose width the header could not afford, and downwards it costs
  height the chrome already owns, at every width. And **the menu measures its own
  trigger into `--menu-width`**, the way a reveal panel publishes its own header:
  the word is translated and the dot beside it is present in a room and absent at
  the door, so that number was never a constant to begin with. The literal
  survives as the fallback for the frame before the observer runs.

- `[Game]` **A square screen broke the reveal's answer into pieces and ran the
  console 502px off the bottom.** The cover was `34vmin` — an axis of the
  *screen* — inside a panel that is `1.6fr` of a split stage, so at 900×900 the
  block took 306px of a 472px row and left the answer 121: `Pocahontas` came
  down as `POC / AHO / NTAS`, 680px of title, and the page scrolled past the
  launch. Measured across the range, the defect tracks the width of the text
  column and not the height of the screen — 647px of column at 1920×1080 and no
  overflow, 260px at 1024×768 and 87, 121px at 900×900 and 502.

  The cover is `min(34vmin, 32cqi, 320px)` now: the height it may not eat, the
  share of the panel it may not take from the words beside it, and the size the
  asset actually is. That alone took 900×900 from 502px of overflow to 94 and
  touched nothing at 1920×1080 or 2560×800, where `vmin` still binds.

  **The answer itself was sized against the screen too**, and had been broken
  mid-word at every width — `POCAHON / TAS` even at 1920. The player's screen
  already publishes `--longest-word` beside `--answer-length` and holds every
  answer to a whole word; the console never got the fact. Both now read it from
  `helpers/answer-fitting.ts`, and `111cqi` is measured by the method the room
  code's `20cqi` was: a capital in `monument` averages 0.898 times its own font
  size. Every screen above the split fits, and the answer is one word on one
  line everywhere but 900×900, where the readability floor is four pixels wider
  than the column.

  **And the artist under it was the third `vmin` in the same column**, which the
  other two had been hiding: with the answer pushed to 32px by its column, `PLK`
  was drawn at 36 over it. It takes 0.6 of the answer's own size at most —
  looser than the 0.41 the two hold wherever the column is not the binding term.

- `[Game]` **A console run from a phone lost its next round under the
  scoreboard.** Every height formula on that screen lived behind
  `@include layout.wide`, so below 900px there was no budget at all and a 320px
  phone received the same CSS as an 899px window. Measured at 390×844 with three
  players: the reveal came to 1 068px and the launch sat at 758–830, a table of
  eight would have put it at about 1 228, and each extra player cost 94px — 47
  for their answer and 47 for their standing, neither of which any formula could
  reach.

  **The split is a width question and the budget is a height one**, and the one
  block was answering both. Above 900px the two halves sit side by side and each
  divides the whole screen; stacked they share one column and the screen pays for
  both, which is a different arithmetic rather than a smaller one. It is written
  as its own arm now, against `27rem` of chrome measured the way `31rem` was —
  the header, the footer, the page padding and two gaps came to 434px.

  Two things were spending that budget without being asked to divide it. **The
  cover was sized in `vmin`, which is the *width* on a portrait screen**, so the
  floor written to stop it vanishing on a wide one was the only thing that ever
  fired on a phone: 180px of an 844px screen for a 250px thumbnail, in the one
  composition where height is the axis under pressure. It answers the height
  there instead — 135px at 844, 107px on a 667px screen. And **both lists carried
  12px of fixed padding**, which is 24px a formula that only shrinks type can
  never reach; they divide the budget and put their furniture in `em`, the same
  bargain the lie board struck above the split. A row goes 47px → 34 and 37 at
  three players, and 47px → 25 and 34 at eight.

  Together: 1 068px → **955**, and the launch from 758–830 to **644–716**. It
  still does not fit, and it is not asked to — 410px of budget against a cover,
  an answer, one line per player who spoke and one per player in the room is
  content that wants more than twice it. What the budget buys is that the type
  stops growing once the page is already scrolling, which is the right bargain on
  a console held in a hand rather than read across a room, and where the
  standings are the one thing every player already has on their own screen.

  The panel's own stack threshold was the last of it: a hand-written `860px`,
  forty short of the product's single breakpoint, so between 860 and 900 the
  reveal drew two columns inside a stage that had already stacked. It is
  `layout.narrow` like everything else.

- `[Game]` **A player on a laptop met round one half-drawn.** The reveal splits
  in two above 900px, and the board that fills its second half withholds itself
  where a round paid nobody and nobody typed — which is every round before the
  first point, and so always round one. Nothing reconciled the two: the answer
  was drawn in the 433px `1fr` track with 347 pixels of nothing beside it, and
  the whole reveal two hundred pixels left of the screen it looks centred on.
  The split now reads the board off the markup with `:has(.round-board)`, the
  way the console's own reveal panel already reads its reaction board, so a
  reveal with nothing to put beside it takes the column whole and the answer is
  sized against all of it. Only a wide screen could see it — a phone stacks the
  two halves and never declared the empty track.

- `[Game]` **The credits page named the wrong licence for two of its five
  banks.** It printed one shared `CC BY-SA 4.0` under every source, where the
  `attributions` header of `question-bank.json` has always carried one per
  source — Mintaka is CC BY 4.0 and Vikidia is CC BY-SA 3.0. The licence moves
  onto the credit entry, which is the one thing a credits page must not get
  wrong.

- `[Server]` **The adult-content draw test was flaky, about one run in twenty.**
  It sampled 400 draws for a rating carried by 107 rows; the category is drawn
  before the question, so an adult row's chance is 0.73% a draw and four hundred
  of them miss every one 5% of the time — a red that says nothing about the
  filter, and a green that would have missed a broken one just as often. Both
  halves now draw two thousand, which puts it at one in two million. Vikidia's
  252 French arts rows moved the miss rate from 4.3% to 5.4%, which is what
  surfaced it.

- `[Server]` **Drawing a question cost twelve milliseconds and now costs two
  tenths of one.** `drawQuestion` grouped its eligible rows by category by
  copying each category's array once per row, which is quadratic in the largest
  category — 2 258 French arts rows is about two and a half million element
  copies for a single draw. It is `Map.groupBy` now, the call the module already
  makes to split the bank by language: 2 223 ms of grouping over four hundred
  French draws becomes 33. Every round of the quiz and of Le Fake paid it, and
  the corpus tests were the only place loud enough to hear it — the bank's own
  test file ran 34 s and now runs 11, and one of its draws had started timing
  out at random.

- `[Game]` **A choice strip no longer hands its short row the shape of a chosen
  one.** A strip that runs out of width wraps, and `flex: 1` stretches whatever
  is left over so the strip's own ground cannot show through — which makes an
  unselected stamp four times the width of its neighbours, the shape a
  *selected* one has. The game picker was fixed; six more do it, and they are
  the six now carrying a `stacks-below()` of their own: the answer mode, the
  blind test's difficulty and its source, the quiz and Le Fake's subjects, and
  Le Fake's two clocks. **Twelve strips need nothing** — they hold one row down
  to 273px, which is what a 320px screen gives them, so every band they break in
  is one no room can reach; measuring the strip rather than the layout would
  have stacked all twelve for nothing. The widths are measured in the locale
  that binds, and that is **not always French**: the difficulty needs 444px
  there and 464 in English, which is the one threshold the measurement corrected.
  `e2e/strip-rows.spec.ts` is what keeps them honest — the only spec here that
  plays nothing, sweeping each strip's own box rather than the viewport, because
  a dictionary edit moves a row and nothing else would say so.

- `[Game]` **A socket that reopens inside a blink no longer repaints the
  console.** `isLive` is `status === 'open'` and it disables every control on
  the screen, so taking a seat — which reopens the socket to put the name on the
  next `hello` — put `data-disabled` on **sixty elements at once** and took it
  off 61 ms later: every stamp inverted and came back, on localhost, and party
  Wi-Fi does the same without being asked. `useSettledStatus` holds a status
  leaving `open` for a second before publishing it. A **refusal** is not a gap
  and goes through untouched, so a dead room is still told at once; the timer
  starts once on the fall out of `open` and is never restarted, so the retry
  ladder cannot hold a dead socket open for ever; and a `send` that could not
  write reveals the held status immediately, because a press that goes nowhere
  is the moment the truth is worth more than the calm.

- `[Game]` **The console's join reminder was drawing a QR code no camera could
  read.** A flex item shrinks by default and the square had no `flex`, so on a
  phone 64px of declared width was drawn at **35 against 64 of height** — not a
  small QR, a rectangle, scannable by nothing. It cost 93px of a 844px screen to
  do it, with the sentence beside it wrapping onto three lines and the round
  index onto two, because the corner menu's inset takes 132px of a 390px header.
  The square is `flex: none` now so it cannot be squashed at any width, and
  below `layout.$wide-screen` neither it nor the sentence is drawn: both are the
  big screen's half of this, by the same argument that keeps the QR off the
  player's round screen — a console that narrow is in one person's hand with
  nobody else looking at it, and phone to phone the four characters win. The
  sentence names the `aside` at every width instead, so nothing is lost by not
  drawing it. The header goes from 93px to 44px and carries the round and the
  code, one line each.

- `[Game]` **The console asked for a recovery code where no code could help.**
  `HostRefused` drew the token form for *every* refusal, so a URL naming a room
  that does not exist answered `No table under that code.` and then asked for
  the recovery code of a table that is not there. A token says **who** may hold
  a room, never **which**, so it can only answer a refusal that turned on the
  room already having a console — `host_already_connected` and
  `host_reconnecting`. Everywhere else the form is a control that cannot work,
  and a screen offering one reads as a puzzle rather than as an answer. On
  `room_not_found` the screen is now the sentence and the one way out — the
  retry went with the field, and for the same reason one control further down:
  waiting is worth offering only where it could change the answer, and no room
  comes back from being swept. Both are the **positive** list rather than the
  exceptions, so an error code nobody has met yet lands on offering nothing,
  which is the side of this to be wrong on.

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
  rows**, 77 fewer and 122 repaired.

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

- `[Server]` **A catalogue failure's log line is tested**: a track listing and a
  drawn round each log once, `error` for an outage and `warn` for an unknown
  path, with the route or the room beside the faults — a success reached past a
  failing path included.

- `[Game]` **Every margin, padding and gap sits on the spacing scale**, floors
  and caps of the fluid ones included: the off-scale 6, 10, 14, 16, 18, 22, 24,
  28, 36, 40, 44, 56, 60 and 64px went to the nearest step, the smaller on a
  tie because the round screens are where room runs out. A size set on its own
  is a `--text-*` step. The question card's top sits a few pixels tighter;
  `choice-fits` holds on all sixteen viewports.

- `[Game]` **A stylesheet writes a line, a corner and a control by name.**
  `--stroke-hair` / `-thin` / `-bold`, `--hairline`, `--radius-xs`,
  `--control-touch` and `--control-height` join the tokens, every spacing
  `clamp()` takes the scale's step where one matches, and the sand's place on a
  question card is one mixin. The compiled CSS resolves to the same 4,565
  declarations it did.

- `[Game]` **A session id is made in `infrastructure/ids.ts`**, by
  `newSessionId()` on `nanoid` as the server's is, rather than inside the seat
  storage with a `crypto.randomUUID` and a `Math.random` fallback for plain
  HTTP. `crypto.getRandomValues` works in every context, so the fallback is
  gone with it.

- `[Server]` **One engine per room, with nothing process-wide underneath**
  (stage 28, session A). The room store, the round timers and the connection
  registry are gone; a `RoomEngine` holds the room, its sockets, a clock, one
  wake and a `persist` hook, and every deadline — countdown, round, floor,
  reveal hold, abandoned seat, room expiry — is read off the room rather than
  held in a closure, so a room restored from a snapshot fires on time. The two
  one-minute sweepers become deadlines of the room they sweep. Node keeps the
  engines in `in-process-rooms.ts` until the Durable Object replaces it.

- `[Shared]` **Route paths are part of the contract.** `@taverla/protocol/routes`
  holds every HTTP path and the room socket's: the server registers the
  pattern, the client fills it with `fillRoute`, which is typed on the
  pattern's `:params`, and the Vite proxy reads the same prefixes. Queries are
  checked against the `z.input` of the schema that parses them, so a renamed
  query field is a type error instead of a silent default.

- `[Shared]` **The `no-undefined-argument-result` Biome plugin is gone.**
  `Result.success(undefined)` is the same value as `Result.success()`, and a
  `Result.failure(undefined)` already shows as a `FailureResult<undefined>`;
  the lint rule was not worth its upkeep.

- `[Shared]` **`Result` and the i18n library are installed from npm.**
  `@adrienlcp/result` and `@adrienlcp/i18n` are published from
  `github.com/AdrienLcp/packages`; the vendored `packages/result/` and
  `packages/i18n/`, `pnpm toolkit:sync` and `pnpm toolkit:check` are gone, and
  every i18n import comes from the package root.

- `[Shared]` **`Result` and the i18n library moved to a toolkit, and are
  vendored back.** Five repositories held a dialect of `Result` and three held
  the i18n library; `C:/git/toolkit` now holds one of each, as
  `@adrienlcp/result` and `@adrienlcp/i18n`, and `typed-i18n` moved into it
  whole. Here they are `packages/result/` and `packages/i18n/`, workspace
  packages under the names they would carry on npm, so the day the toolkit is
  published a `package.json` changes and no import does. Eleven files import
  them by the new name; nothing else moved.

  The sync is one way and mechanical: `pnpm toolkit:sync` copies `src/` out of
  the toolkit, `pnpm toolkit:check` fails when a copy has drifted, and
  `pnpm validate` runs the check first. It skips when there is no toolkit
  beside the repository, because nothing is published and CI clones this
  repository alone. Biome no longer lints the vendored `src/` either: the copy
  is formatted by the toolkit's Biome, and a config that drifted would have
  this repository rewrite the copy on every `pnpm lint`.

  `Result.failure(undefined)` stopped lying on the way through. It is typed
  `FailureResult<undefined>` and used to return `{ error: 'unknown' }`, because
  the implementation read the argument's value instead of counting the
  arguments; it now returns the `undefined` it promised. The Biome plugin still
  refuses the call — accidentally writing it now yields a failure with no error
  code rather than the unknown one, which is worse, not better — and its
  message was rewritten to say so.

  `tsdown` inlines `@adrienlcp/*` alongside `@taverla/*`: the bricks ship
  TypeScript source, so an external import would build a server that only
  starts under a TypeScript loader. Verified on the built `dist/index.mjs`,
  which the end-to-end journeys run.

- `[Shared]` **`toSorted` and `toReversed`, rather than copying an array to
  sort it.** 22 sites over 17 files, and a `code-style` rule so the next one
  is written that way instead of found later: `[...items].sort(…)` is the same
  array written twice, and a bare `items.sort(…)` mutates what the caller
  handed over, which is how a render-order tweak reorders somebody’s state.

  Nothing here was mutating shared state — every site already spread, or
  closed a `filter`/`map` chain on an array of its own — so this buys the
  shape rather than a fix. The exception the rule keeps is an array built
  inside the function that never escapes it, which is why a `Map` or a `Set`
  still spreads before it sorts: `HOST_ONLY_MESSAGE_TYPES` is a `Set`, and
  `toSorted` is not on one. `i18n/vendor/` keeps its four sites — it is a
  verbatim copy of another repository, changed there or not at all.

- `[Server]` **`frenchAliasesOf` is `aliasesOf({ entityIds, language })`.** The
  language was literal in the SPARQL (`FILTER(lang(?alias) = "fr")`) with no
  parameter anywhere in the module, which is what made the English half
  unreachable. Naming it was the larger half of the change — the function stops
  being *French* anything — and the cache was the part that had to move with it:
  one file per language rather than one keyed by both, or every English miss
  would read as a French entity nobody had asked for yet.

- `[Game]` **The React Compiler runs on Oxc, and Babel leaves the repo.**
  `react({ compiler: { logDiagnostics: true } })` with `oxc-transform-react`
  replaces `@rolldown/plugin-babel` carrying `reactCompilerPreset()`, and takes
  four dev dependencies out with it — `@babel/core`, `@rolldown/plugin-babel`,
  `@types/babel__core`, `babel-plugin-react-compiler` — along with the
  `vite.config.ts` guard that existed to hold the first of them on 7.x.

  **The pin was right and stays vindicated**: Babel 8 took `AssignmentPattern`
  out of the `LVal` alias group, `BuildHIR::lowerAssignment` keeps an object
  pattern's property values behind `isLVal()`, and the bail is filed under
  `Todo` and never printed — one function in 116, and the one it took was
  `TextField`. Three fixes are open upstream and none is merged;
  `babel-plugin-react-compiler` has published nothing stable since 1.0.0 in
  October 2025. Oxc parses its own AST and never meets it.

  **Measured before switching, both ways on the same tree: every asset identical
  in name and in size.** A Vite asset name carries its content hash, so that is
  a byte-identical payload — 767 521 bytes over 27 chunks — and the claim of
  equivalence is a comparison rather than a hope. The client build went **21.3 s
  to 3.3 s** on a loaded machine, 9.6 s to 2.3 s on a quiet one; the plugin
  timings had put `@rolldown/plugin-babel transform` at 58% of the build.

  Vite still calls the integration experimental, and `logDiagnostics` printed
  nothing where the Babel pipeline had reported two permanent `CompileError`s —
  a difference in what the two *report*, since the code they emit is the same.
  `docs/component-shape.md` holds the comparison to re-run.

- `[Game]` **`useEffectEvent` replaces the latest-ref pattern, in the three
  places that had written it by hand.** React has owned this since **19.2** and
  the repo was already there, so the bump is what made somebody look rather than
  what unlocked it. `use-room-socket.ts` kept `onFrame` in a ref updated by an
  effect with no dependency array, so a socket built once could still forward to
  whatever the current render handed it; `use-settled-status.ts` did the same
  with `statusRef` behind a `useCallback`; `round-audio.ts` did it twice, with
  `clockRef` and `volumeRef`. Two of the four convert — three refs and two
  effects become two Effect Events — and the clock one gains a name,
  `millisecondsUntilStart`, where a bare `clockRef.current` said nothing about
  why it was not a dependency.

  `volumeRef` was reading over its own shoulder. `unlock` is a plain arrow
  rebuilt on every render, so `volume` was already in scope and the ref was a
  longer way of writing it.

  It also lifts a requirement the two connection hooks were paying: `onFrame`
  no longer needs a stable identity, so the `useCallback` around each decoder
  goes and the compiler owns them like everything else.

  **The fourth stays a ref, and finding out why cost a red journey.** An Effect
  Event is *not* a stable identity: React 19.3's `updateEvent` returns a fresh
  closure over a stable ref on every render. `reveal` is handed *out* of
  `useSettledStatus` and sits in `send`'s `useCallback` dependencies, so
  converting it changed `send` every render and every screen holding `send` in a
  dependency array with it — `Maximum update depth exceeded`, the error boundary,
  and one Playwright journey red on a page that had simply stopped. The rule is
  the seam rather than the shape: an Effect Event is right inside the Effect that
  owns it, where nothing reads its identity, and wrong the moment it leaves.

  `react-components.md` carries that, and its `paths:` grew
  `apps/game/src/**/*.ts` — a rule about hooks was scoped to `.tsx` while every
  hook it describes is a `.ts` file.

- **Dependencies up to latest, and not a major among them.** **React and
  `react-dom` 19.2.8 → 19.3.0**, with `@types/react` and `@types/react-dom`
  moving to 19.3.0 beside them; **Vite 8.2.2 → 8.3.0**; **Zod 4.5.4 → 4.6.1**
  across protocol, server and game at once, which is the only way a schema the
  three of them share can move; `@types/node` 26.4.1 → 26.5.1; and **Biome
  2.5.12 → 2.5.13**, which moves its own `$schema` pin again and is the only
  file the upgrade touched outside a manifest and the lockfile. 539 unit tests,
  four journeys, and the client, SSR and prerender builds: nothing changed.

  `@babel/core` stays on **7.29.7** with 8.0.1 out, which is what
  `vite.config.ts` has thrown on since the pin was written — see
  `docs/component-shape.md`.

  The install's one peer warning is **older than this upgrade and untouched by
  it**: `@hono/node-ws@1.3.1` asks for `@hono/node-server@^1.19.11` and the
  server runs 2.1.1. Both are already at their latest, so the range closes when
  node-ws catches up and not before; the socket upgrade works.

- `[Game]` **Playwright launches Chromium with `--mute-audio`.** The journeys
  reach a round, a room plays its clip at a stored volume defaulting to 80%, and
  a run started headed plays it out loud. Muted at the process rather than
  through `taverla:volume`, so no journey has to remember.

- `[Server]` **The riddle rubric OpenQuizzDB ships is banked at last**, and it
  is the one place a *rule* finds `choiceOnly` rather than a reading.
  QUADRIQUIZZ chains four clues under one letter — *Avec un G, il faut un
  alcool, un lieu de départ, un engin et une couleur* — and carries a single
  answer for the four, which is why it was refused: four questions over one
  answer is a question no room can win. That answer is the **first** clue's on
  all 120 rows, and the other three clues are answered by the propositions
  standing beside it, so cutting the enumeration after the first clue leaves a
  whole question with its three decoys already written. **114 rows**, after one
  drop and five prompts the dedup pass had already seen — *Avec un S, il faut un
  pays* is banked once.

  They are `choiceOnly` as a rubric rather than as a census: *un pays* with an S
  is Suisse, and Sénégal, and Suède, so only the four candidates make it one
  answer. The column is now read from two places at once — the source says so
  where a whole rubric is one shape, `choice-only-questions.json` stays the
  row-by-row reading everywhere else — which is why `choiceOnly` moved onto the
  ingested row. That confines them to a quiz in `choice` mode: Le Fake already
  refuses a row whose candidates it never shows.

  French `choiceOnly` goes from 41 rows to 155, which is **3.8% of the French
  bank against the English half's 14.7%** — the objection that this would change
  the character of a bank playable typed, measured. Two rows are marked adult by
  repair because the rubric is not the adult one and they are, and one is
  dropped: a *balai* is not a *loup*, and the three clues cut away were the ones
  whose words fitted.

- `[Server]` **Every banked question says whether the room has heard of what it
  asks about.** `isWellKnown`, on all 8 355 rows, and each source reaches it its
  own way: Open Trivia DB rates its own questions and `hard` is the one that
  fails, while a French row is read off the sixty-day traffic its subject's
  Wikipedia article takes. OpenQuizzDB names that article on every row it has
  one for, which is what let the French half be rated whole rather than only on
  the 1 900 PolyFact rows that carried a Wikidata identifier —
  `frenchViewsOfTitles` is the same lookup with the Wikidata hop removed. It
  leaves **1 652 French rows and 3 443 English ones**.

  The threshold is two thousand views, and it was measured rather than chosen.
  The draw takes a category before it takes a question, so a level is only as
  good as the category it thins most: cut the French bank into thirds by traffic
  and *difficile* holds five history questions, which a twenty-round evening
  draws three of. One threshold at two thousand leaves the smallest category
  fifty-three. Zero views is read as *not measured* rather than as obscurity —
  three hundred OpenQuizzDB rows name an article that does not exist, *Noeud
  double* for what is filed under *Nœud*, and a rule reading that as a low score
  put *who directed Apocalypse Now* in the hardest bucket. See
  [`docs/plans/21-well-known-questions.md`](docs/plans/21-well-known-questions.md).

- `[Game]` **Every component carries `React.FC<Props>`.** The shape was already
  in `code-style.md`, as an example rather than as a sentence, and forty-one
  components had drifted off it — twenty-five of them in files that carried no
  annotated component at all, sixteen private ones sitting under an exported
  sibling that had one. Props move from the parameter to the annotation, and
  the six files that named `ReactNode` or `SVGProps` in a second import from
  `react` now read them off the namespace `React.FC` already brings in. The rule now says it in
  words, names the generic component as the one exception `React.FC` cannot
  express, and says where the React types come from.

- **CI no longer installs Chromium through Google's apt repository.**
  `playwright install --with-deps` runs `apt-get update` over every source the
  runner image carries, and one of them is Google's own Chrome repository — a
  server nothing here installs from, Playwright shipping the Chromium it drives.
  Google publishes that index a piece at a time, and an update landing between
  the pieces fails on a hash mismatch: lint, build, test and the image job all
  green, and the run red on a browser download. It failed twice in a row, so it
  is not a race worth re-running. The step drops the source before installing,
  and stands on Ubuntu's mirrors alone.

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
  The library then lived in a repository of its own, from which both copies
  were taken verbatim — see the toolkit entry above, which is where it moved
  before this release shipped.

  **Three fixes came back from it in one copy.** A locale may register a loader
  rather than a dictionary — `() => import('./dictionary-de')` — and
  `translator(locale)` stays synchronous through it, answering from the default
  locale until the dictionary lands; `load` dedupes concurrent calls and forgets
  a failed one, so asking again retries. Placeholders are compared *across*
  locales rather than checked within one: a renamed, dropped, invented or
  retyped placeholder, and a dropped `<link>` span, each fail to compile —
  behind a loader too, before it is ever called. And a placeholder inside a
  plural form or an enum member is substituted at last, so
  `other: '{?} messages from {sender}'` prints the sender; only dictionary text
  is re-read on that pass, never a caller's value, which is what keeps a player
  named `{seconds}` from being read as a placeholder.
  `dictionary-de.fixture.ts` is a dictionary in a module of its own, so the
  tests prove the shape a real bundler split produces rather than a promise a
  test made up.

  **Which is why a dictionary is now written, never annotated.** A
  `: DictionaryFor<typeof EN_DICTIONARY>` annotation widens every message to
  `string`, and a widened message has nothing left for the comparison above to
  read — `satisfies` does not save it either, since it changes the
  excess-property check and not the widening. A `const` type parameter does,
  and that is what `defineDictionary` is. `FR_DICTIONARY` takes it, the
  annotation goes, and the `Dictionary` type it was written for leaves
  `translation.ts` with nothing left to annotate.
  `fieldErrorMessage` moves to `presentation/i18n/field-error.ts`, which is
  where the two front doors were each keeping their own copy of the same union
  and the same ternary.

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
