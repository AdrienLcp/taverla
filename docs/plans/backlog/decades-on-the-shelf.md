## 18 · Decades on the shelf

> *Note 2 — "pour le blind test, on a moyen d'ajouter des catégories « années
> 90 », etc ? Par génération ?"*

> **Delivered 17 August 2026, and the plan below was overruled on its central
> call** — read *What it turned into* at the end before trusting the paragraph
> that begins *So the rail is the one already built*. The diagnosis of the data
> problem held in full; the shape proposed for the fix did not.

Genres already exist — twelve Deezer charts behind a `ToggleGroup`
(`playlist-picker.tsx:46-48`, `:165-186`). What does not exist is any notion of
*when*, and the obstacle is data rather than UI:

- **A track carries no year.** `CatalogueTrack` is `trackIdentitySchema` —
  artist, cover, id, title (`packages/protocol/src/track.ts:9-24`). Deezer's
  chart and playlist endpoints do not return `release_date`, and the per-track
  lookup that does is already done once per round to resolve the expiring
  preview URL.
- **Deezer search cannot filter by year.** Its advanced query supports artist,
  album, label and duration; no date dimension.
- **Filtering at the draw does not work.** `drawPlayableTrack`
  (`track-pool.ts:24-54`) retries five times; against a 100-track chart with a
  decade filter, most draws would miss and a round would fail with
  `no_content_available` rather than find a track.

**So the rail is the one already built**: `TrackSource`'s `playlist` arm
(`track.ts:31-50`). A decade is a curated Deezer playlist id behind a named
button, and the whole change is a preset list, a control in `playlist-picker.tsx`
and an `isSameSource` case so `discardPoolIfStale` (`track-pool.ts:65-97`) drops
the pool when the preset changes. No protocol arm, no new client, no pipeline.

Two things the session has to be honest about, because they are what makes this
a session rather than an afternoon:

- **A preset is somebody else's playlist.** Deezer's editorial decade playlists
  can be renamed, re-ordered or withdrawn, and the failure lands on a room mid-
  evening as an empty pool. Whether that is acceptable, and whether the presets
  should be a handful of well-known ids or a `search` fallback beside them, is
  the call.
- **A preset is 100 tracks, once.** `POOL_SIZE = 100` per request and a room
  never repeats (`room.playedContentIds`), so a decade preset is comfortable for
  an evening and thin for two. The genre picker gets around this by merging
  charts; a decade cannot merge with itself.

The wider version — a `year` on the catalogue track, fetched at pool fill —
costs one request per track against a 50-per-5s rate limit, and should be priced
before it is dismissed, since it is also what a "years 1990–1999" *range* would
need. Presets first; the range only if the room asks for it twice.

### How to tell it is done

- A host picks *Années 90*, and the pool is 90s tracks in a room that had been
  playing something else.
- Changing the preset mid-game discards the old pool.
- An empty or withdrawn playlist fails at the picker, with the preview the
  source picker already has, rather than at the first round.

---

## What it turned into

**The data diagnosis was right and nothing above it was.** Deezer really has no
date dimension — not on a chart, not in advanced search — so a decade really is
a curated playlist. Everything the plan then built on that was one level off.

**A fourth arm, not the `playlist` one.** The plan counted "no protocol arm" as
the saving; it is the cost. A preset expressed as a playlist id puts Deezer ids
in a React component, leaves nothing tying the label *Années 90* to what it
fetches, and breaks the round trip both ways: `draftFromSource` cannot tell a
decade from an id somebody typed, so a host who pasted that same id by hand
reopens the picker on the wrong control, and the settings summary says
*playlist* where the host chose a decade. `TrackDifficulty` had already settled
this argument in the same file — a difficulty is named in the room's vocabulary
because a popularity score is a Deezer fact. A decade is the same sentence.
`TrackSource` gains `{ kind: 'decade', decades }`, empty meaning every decade
the way an empty `genreIds` means every genre, and `PROTOCOL_VERSION` goes to 12.

**That arm is what fixed the two things the plan called honest costs.** Because
the ids live server-side, a decade is free to be *more than one playlist*, and
`pathsFor` already returns a list `fetchTracksFor` merges and dedupes:

- *"A preset is 100 tracks, once"* — each decade is two playlists, measured at
  **90 to 130 playable tracks** at the strictest floor (`wellKnown`, rank ≥
  500k), against a room that never repeats. The 1990s answered 122, 1980s +
  1990s 245, and all six 712.
- *"A preset is somebody else's playlist"* — both series belong to **Deezer's
  own editors** rather than to a label, which is the most stable thing on offer
  for content this product does not own; and a withdrawn one now *thins* a
  decade instead of emptying it, because `fetchTracksFor` keeps whatever
  answered. One of each pair is international and the other French, since a
  table here sings along to both.

**The `search` fallback was not built and should not be.** Silently swapping a
decade for a text search is a pool nobody chose, discovered mid-evening. The
answer is that the failure stays visible and stays the host's.

**`isSameSource` had a hole the plan could not have known about.** The plan
asked for a case so the pool drops when the preset changes; `playlist` already
had one. What did not was **`chart`, which returned `true` regardless of
`genreIds`** — so switching from rock to jazz mid-game kept serving rock until
the pool ran dry. Fixed in the same edit, as set equality on both list-shaped
arms, because a strip hands its selection back in click order.
`track-pool.test.ts` is new and holds it.

**The preview fires on the press.** A decade names itself and says nothing about
what is inside it, so it is the one source a host cannot check by reading the
control they just used — where an id or a query has to wait for typing to stop.
`GET /api/tracks/decades` is the sixth route, and `usePlaylistPreview` grew a
request token: a strip that asks on every press has two answers in flight, and
the slower one is not the older one. The hook now switches on the source instead
of an `isPlaylist` boolean that was picking the endpoint *and* the error string.

**Six decades, 1970s–2020s.** The 1960s were left off: the only French series
covering them is thin, and a table in 2026 is thinner still. Adding one is a row
in `DECADE_PLAYLIST_IDS` and a label in both dictionaries.

**The strip steps through six's divisors.** `ANNÉES 2000` measures 120px with
its padding and the three columns it first fell into gave it 119.5 — half a
pixel, and the second row wrapped and stopped matching the first. The count is
2 / 3 / 6 by **container** width, never four or five, because a column count
that does not divide six leaves the strip's ground showing where a decade should
be. It is a container query rather than a media query on purpose: the same
1920px desktop hands this picker a third of the lobby or the whole of it
depending on where the split fell.

**Still not built, still priced.** A `year` on the catalogue track, fetched at
pool fill — one request per track against a 50-per-5s limit. It is what a
*range* ("1994–1997") would need, and no room has asked twice.

---

