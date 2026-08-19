## The film a table shouts

> *19 August 2026 — "ajouter « musiques de films » (et séries ?) dans le blind
> test, on peut ?"*, and then the definition that decided the whole entry:
> *"une musique de film c'est un morceau composé par un compositeur de film
> spécialement pour le film qu'il faut deviner"*.

Yes, and the definition is what makes it a game rather than a category. **A song
used in a film is not a film score.** *Shallow* is a Lady Gaga single that
appears in *A Star Is Born*; *Cornfield Chase* is a piece Hans Zimmer wrote for
*Interstellar*. The first is already playable by every other source in the
picker, and adding it under this name would be a label the room would catch out
on its second round.

That distinction is not a taste call — **it decides where the tracks come from**,
and the two candidate sources are not the same size.

### The obvious source is the wrong one

Deezer has a genre 173, *Films/Jeux vidéo*, and a *Camojada - Deezer Soundtracks
Editor* account with 200 editorial playlists. Measured 19 August 2026, its chart
is the most playable list in the whole investigation — 100 of 100 with a preview
and a rank over `wellKnown`'s floor — and that is exactly the tell: it is a chart
of **songs**, whose top twenty is *Shallow*, *Skyfall*, *Eye of the Tiger* and
two Aznavour tracks. The editorial *Film Classics* is the same catalogue: 44
playable tracks, of which the recognisable ones are *Stayin' Alive* and
*I Will Always Love You*.

Those lists would answer the request and fail the definition. They are left on
the shelf, not because they are poor, but because the room they serve is the one
already served by *Une décennie*.

### Composers are the source

`GET /artist/{id}/top?limit=50` over a table of film composers, the same shape as
`DECADE_PLAYLIST_IDS` and for the same reason — the catalogue's ids live in
`deezer-client.ts`, the room's vocabulary lives in the arm's name. Measured over
24 composers:

| | tracks, deduped |
|---|---|
| With a preview and a nameable film | **749** |
| of those, rank ≥ 150k | 596 |
| rank ≥ 250k (`mixed`) | 427 |
| rank ≥ 500k (`wellKnown`) | **75** |

Per composer the film is named on 33 of 50 (Zimmer), 39 (Williams), 49
(Giacchino), 50 (Djawadi), 48 (Göransson) — far above the ~70 % the playlists
managed, because a score album is titled `X (Original Motion Picture
Soundtrack)` by convention where a compilation is titled anything.

Two things this measurement also settled:

- **Search by name picks the wrong artist.** *Danny Elfman* returned 4 tracks,
  *Thomas Newman* 8, *Vangelis* 1, *Vladimir Cosma* 0 — homonyms and tribute
  acts outrank the composer. The table holds **ids**, resolved once by hand, and
  a name never reaches Deezer at runtime.
- **A composer's top is not all score.** *My Heart Will Go On* surfaces under
  Céline Dion and *When I'm Home* under James Blake, because Deezer credits the
  performing artist on a soundtrack's songs. Those are still films, so they are
  not wrong — but they are the seam where the definition above has to be
  enforced if a round is ever to be pure score.

### What the round asks is not what the round holds

`gradeGuess` (`packages/core/src/blindtest/typed-answer.ts:26`) measures a typed
line against `track.title` and `track.artist`. On a score, `track.title` is
*Cornfield Chase*, *Day One*, *Concerning Hobbits* — the one thing at the table
nobody can produce. What a room shouts is the **film**, and after that the
**composer**.

And the rule that keeps typed answers honest destroys the only place the film is
written: `CATALOGUE_NOISE` (`packages/core/src/round/answer-matching.ts:13`)
strips brackets and trailing dashes, so `Zoo (De "Zootopie 2")` is expected as
`Zoo`. The regex that removes `(Radio Edit)` removes the film.

**Settled**: the second half of this source's answer is the **film**, and a
track whose film cannot be named never enters the pool — a round must not ask
for a half no player can give.

**Open, and the session's first decision**: what the *other* half is.

- **The composer** — `artistCorrect` keeps its exact meaning, only the title
  half is replaced, and the pair *Interstellar* + *Hans Zimmer* is two things a
  table actually says. Recommended.
- **The track title** — *Interstellar* + *Cornfield Chase*, where the second
  half is close to unwinnable and the round pays 1 point instead of 3 almost
  every time.

### The difficulty floor does not survive this source

`Son Of A Preacher Man` as it appears on *Pulp Fiction* ranks **8k**; `wellKnown`
demands 500k. Deezer's rank scores the *recording*, and a score cue carries
almost none of a single's. The table above is the verdict: 596 tracks at 150k,
**75** at `wellKnown`.

**Settled**: this source pins its own floor and the difficulty control does not
apply to it. It is the first time a source overrules a room setting, and the
alternative is a control whose *hard* position leaves 75 tracks and whose room
never learns why. The floor itself — 150k, or lower — is measured in the session
against how obscure the 400th track actually feels.

### Series are the same job

*Series Classics* as a playlist was 36 tracks and 6 nameable — nothing. Through
composers it is the opposite: Ramin Djawadi alone returns 50 of 50 named, which
is *Game of Thrones* and *Westworld*, and Göransson brings *The Mandalorian*.
A composer who scores a series does the same job under the same name.
**Settled**: one category, holding both, with no separate control.

### What it touches

Forced by the type system, all small: `trackSourceSchema`
(`packages/protocol/src/track.ts:50`) gains the arm, `PROTOCOL_VERSION` goes to
13, then `pathsFor` (`deezer-client.ts:185`), `isSameSource`
(`track-pool.ts:84`), `KIND_LABELS` and the `Draft` round trip
(`playlist-picker.tsx:25, 81-127`), `catalogueFor` and `EMPTY_RESULT_KEYS`
(`use-playlist-preview.ts:36-60`), a seventh route, both dictionaries.

The new ground, and where the session actually goes:

- **Naming the film** — a pure function over a catalogue track, so
  `packages/core` with a test, holding the shapes that must work
  (`X (Original Motion Picture Soundtrack)`, `Y (De "Z")`, `X: Season 2 (Music
  from…)`) and the ones that must fail (`Rocky IV`, `40 Chansons D'or`).
- **Carrying it** — `trackIdentitySchema` gains the film, null everywhere else,
  and `fetchTracksFor` drops the tracks where this source cannot name it.
- **Grading against it** — one half measured against the film, the reveal
  showing film, composer and cue, and the scoreboard reading two halves without
  the word *title* on this source.

### What landed — 19 August 2026

Delivered. `TrackSource` gains `{ kind: 'film' }`, `PROTOCOL_VERSION` goes to 13,
and `TrackIdentity` gains `film`. The four open questions, answered:

1. **The composer sits beside the film**, as recommended — and it cost nothing,
   because the same filter that enforces the definition makes the composer *be*
   `track.artist`. A track enters the pool only when the catalogue credits it to
   a composer on the table, so `artistCorrect` kept its exact meaning and only
   the title half moved. That filter costs 9 % of what the source could hold and
   it is the definition being enforced, not a leak: it is what drops *My Heart
   Will Go On* under Céline Dion and *Suis-moi* under Camille, and with them the
   40 films whose only cue is a song.
2. **49 composers**, measured rather than curated: 59 were probed, and a name
   stays if at least six of its tracks clear the floor, name a film and are
   credited to it. That is what keeps Bernard Herrmann, Henry Mancini and Elmer
   Bernstein off the table — their tops are compilations, which `filmNamedBy`
   refuses — and it is why Cosma, Sarde and Legrand sit beside Williams and
   Zimmer. Eight of the 49 are drawn per pool fill, freshly each time, so an
   evening reaches the whole table where a fixed subset would run out.
3. **No cap per film**, as the entry deferred. It surfaced in the *preview*
   rather than in a round — one film is a dozen cues, so the list showed
   `Les Choses De La Vie` five times and collided two React keys. The list is
   distinct now and the count beside it is still the pool's, because a repeat is
   a thinner preview and never a thinner pool.
4. **The protocol kept `titleCorrect`.** What each half *is* is a property of
   the track, not of the verdict, and renaming the wire contract to fix a word
   on one screen would have been paying the whole protocol for a label. The
   screens say *film* and *compositeur*; the schema still says `titleCorrect`,
   and says why in a JSDoc.

Two things the entry got wrong, both by measurement:

- **The floor is 200 000, not 150 000.** Read band by band: at 150k the bottom
  of the range is a documentary and a Disney park restaurant, at 250k the
  heritage layer goes with it — *Casablanca*, *Docteur Jivago*, *La Strada* all
  fall out. 200k holds 1 155 tracks over 455 films and keeps them.
- **`CATALOGUE_NOISE` was never touched.** The entry read it as the fault —
  *the regex that removes `(Radio Edit)` removes the film* — and the fix turned
  out to be upstream of it: stop asking for the title. The regex is *used* now,
  to strip the film out of the cue for display, so a reveal reading *Forrest
  Gump* does not print `They're Sending Me To Vietnam (From "Forrest Gump"
  Score)` under it.

**The measurement**, for whoever revisits the table: 59 composers, top 100 each,
19 August 2026. 2 949 tracks with a preview, 2 182 naming a film, 2 041 of those
credited to a composer, 1 155 above the floor across 455 films.

### What the browser pass caught, and nothing else would have

Three faults, none of which a green build says anything about:

- **The difficulty strip lied for a whole round.** It was keyed off the room's
  source, and the picker commits nothing until a round opens — so a host who
  chose the composers was told the control still worked until the next launch.
  It reads the **draft** now.
- **The host was shown the cue to judge.** The verdict panel printed
  `track.title` beside buttons reading *Film seulement*, so the one screen that
  has to decide whether a film was named was the one not showing it.
- **The preview repeated itself**, above.

### How to tell it is done — all five hold

- A host picks *Musiques de films*, a player types `le seigneur des anneaux` and
  banks a half. Verified in a browser: `FILM ✓` and `COMPOSITEUR ✓` both stamp.
- No round asks for a film that was not named — `filmNamedBy` returning `null`
  is the admission price.
- The reveal shows the film, the composer and the cue, on the console and on the
  phone.
- The scoreboard reads two halves and neither is called *title* — the stamps,
  the verdict buttons and the scoring sentence all say *film* and *compositeur*.
- Switching source empties the pool, held by `track-pool.test.ts`.
