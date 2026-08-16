## 18 · Decades on the shelf

> *Note 2 — "pour le blind test, on a moyen d'ajouter des catégories « années
> 90 », etc ? Par génération ?"*

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

