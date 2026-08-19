import { z } from 'zod'

import type { CatalogueTrack } from '@taverla/protocol/http'
import {
  type HostTrack,
  type TrackDecade,
  type TrackDifficulty,
  type TrackSource,
  trackDecades
} from '@taverla/protocol/track'

import {
  filmNamedBy,
  isScoredByOneOf
} from '@taverla/core/blindtest/film-score'
import { Result } from '@taverla/core/helpers/result'
import { shuffled } from '@taverla/core/helpers/shuffle'

import { env } from '@/env'
import { logger } from '@/infrastructure/logging/logger'

export type MusicSourceError =
  | 'music_source_unavailable'
  | 'no_content_available'

const REQUEST_TIMEOUT_MS = 6_000
const POOL_SIZE = 100

/**
 * Deezer's popularity score runs to about a million, and it is the one field
 * that separates a song a room will recognise from the AI-generated lo-fi and
 * bedroom uploads that free-text search is full of. Measured against the
 * catalogue: charting hits and classics sit at 830k–990k (Bohemian Rhapsody
 * 958k, Dancing Queen 946k), while the junk sits at 25k–405k.
 *
 * `obscure` therefore still holds a floor. A blind test nobody can answer is
 * not a hard blind test, it is a broken one, and below about 50k the catalogue
 * stops being music anyone chose to release.
 */
const MINIMUM_RANK_BY_DIFFICULTY: Record<TrackDifficulty, number> = {
  mixed: 250_000,
  obscure: 50_000,
  wellKnown: 500_000
}

/** Deezer's name for "that id resolves to nothing", whatever was asked for. */
const RESOURCE_NOT_FOUND = 'DataException'

/**
 * Deezer answers a bad request with HTTP 200 and an `error` object, so the
 * status code alone never tells you whether the call worked.
 */
const deezerErrorSchema = z.object({
  error: z.object({
    code: z.number().optional(),
    message: z.string(),
    type: z.string()
  })
})

const deezerTrackSchema = z.object({
  album: z
    .object({ cover_medium: z.string().nullish(), title: z.string().nullish() })
    .nullish(),
  artist: z.object({ name: z.string() }),
  id: z.union([z.number(), z.string()]).transform(String),
  /** Empty on tracks Deezer will not stream in this country — unplayable, so unusable. */
  preview: z.string(),
  /** Absent on some endpoints, and a missing score must not silently pass the floor. */
  rank: z.number().nullish(),
  title: z.string()
})

const deezerListSchema = z.object({ data: z.array(deezerTrackSchema) })

type DeezerTrack = z.infer<typeof deezerTrackSchema>

/**
 * The one module in the repo that knows Deezer exists. Everything above it
 * speaks `TrackSource`, `CatalogueTrack` and `HostTrack`; swapping the
 * catalogue means rewriting this file and nothing else.
 *
 * The browser cannot call Deezer itself: `api.deezer.com` answers without an
 * `Access-Control-Allow-Origin` header, so every catalogue read is proxied
 * here. Audio playback is unaffected — an `<audio src>` is not a CORS request.
 */
export const fetchTracksFor = async ({
  difficulty,
  source
}: {
  difficulty: TrackDifficulty
  source: TrackSource
}): Promise<Result<CatalogueTrack[], MusicSourceError>> => {
  const fetched = await Promise.all(pathsFor(source).map(requestList))
  const reached = fetched.filter((list) => list.status === 'success')

  // One chart of several failing is a thinner pool, not a dead game. Only a
  // source that answered nothing at all is worth refusing the round over.
  if (reached.length === 0) {
    const everyPathHeldNothing = fetched.every(
      (list) =>
        list.status === 'failure' && list.error === 'no_content_available'
    )

    return Result.failure(
      everyPathHeldNothing ? 'no_content_available' : 'music_source_unavailable'
    )
  }

  const playable = catalogued({
    difficulty,
    source,
    tracks: withoutRepeats(reached.flatMap((list) => list.data))
  })

  return playable.length === 0
    ? Result.failure('no_content_available')
    : Result.success(playable)
}

/**
 * Deezer puts the same track on more than one genre chart, so a host who picked
 * both rock and pop would otherwise get a pool where the overlap is twice as
 * likely to be drawn.
 */
const withoutRepeats = (tracks: DeezerTrack[]): DeezerTrack[] => [
  ...new Map(tracks.map((track) => [track.id, track])).values()
]

/**
 * Resolved when a round starts, never earlier: preview URLs are signed with an
 * expiry (`hdnea=exp=…`, roughly a day), so a pool assembled in the lobby and
 * played later would hand the host dead links.
 */
export const fetchHostTrack = async (
  trackId: string
): Promise<Result<HostTrack, MusicSourceError>> => {
  const response = await requestJson(`/track/${encodeURIComponent(trackId)}`)

  if (response.status === 'failure') {
    return response
  }

  const parsed = deezerTrackSchema.safeParse(response.data)

  // The rank is not re-checked here: the pool already applied the floor, and a
  // single-track lookup is Deezer's own `/track` endpoint, which reports a
  // different score than the list did.
  if (!parsed.success || parsed.data.preview.length === 0) {
    return Result.failure('no_content_available')
  }

  return Result.success({
    ...toCatalogueTrack(parsed.data),
    previewUrl: parsed.data.preview
  })
}

/**
 * What a source lets into a pool, which every arm but one answers with the
 * room's difficulty and nothing else.
 *
 * The film arm answers it three times over and **overrules the room's
 * difficulty** doing it. Deezer's rank scores the recording, and a score cue
 * carries almost none of a single's: `Son Of A Preacher Man` as it appears on
 * *Pulp Fiction* ranks 8k where `wellKnown` demands 500k, and the whole
 * composer table holds 135 tracks above that floor against 1 155 above this
 * one. So the arm pins its own, and a track still has to name a film and be
 * credited to a composer to get in — `film-score.ts` holds why each of those is
 * a refusal rather than a preference.
 */
const catalogued = ({
  difficulty,
  source,
  tracks
}: {
  difficulty: TrackDifficulty
  source: TrackSource
  tracks: DeezerTrack[]
}): CatalogueTrack[] => {
  if (source.kind !== 'film') {
    return tracks
      .filter((track) => isWorthGuessing(track, difficulty))
      .map((track) => toCatalogueTrack(track))
  }

  const composers = Object.keys(FILM_COMPOSER_IDS)

  return tracks.flatMap((track) => {
    if (track.preview.length === 0 || (track.rank ?? 0) < FILM_SCORE_FLOOR) {
      return []
    }

    if (!isScoredByOneOf({ artist: track.artist.name, composers })) {
      return []
    }

    const film = filmNamedBy({
      albumTitle: track.album?.title ?? '',
      artist: track.artist.name,
      trackTitle: track.title
    })

    return film === null ? [] : [toCatalogueTrack(track, film)]
  })
}

const isWorthGuessing = (
  track: DeezerTrack,
  difficulty: TrackDifficulty
): boolean =>
  track.preview.length > 0 &&
  (track.rank ?? 0) >= MINIMUM_RANK_BY_DIFFICULTY[difficulty]

/** `0` is Deezer's all-genres chart, which is what an empty selection means. */
const EVERY_GENRE = 0

/**
 * What a decade costs, in the only vocabulary that knows: Deezer has no date
 * dimension anywhere — not on a chart, not in advanced search — so a generation
 * is a curated playlist and nothing else.
 *
 * Deezer's **own** editors keep both series, which is the most stable thing on
 * offer for something this product does not own; a label's playlist can be
 * withdrawn on a marketing calendar. Two per decade rather than one, and they
 * pay for themselves twice: a hundred tracks is comfortable for an evening and
 * thin for two, and a playlist that disappears thins the pool instead of ending
 * the round — `fetchTracksFor` keeps whatever answered.
 *
 * One of each pair is international and the other is French, because a table
 * here sings along to both and a decade that held only one half would be a
 * different game.
 */
const DECADE_PLAYLIST_IDS: Record<TrackDecade, readonly string[]> = {
  '1970s': ['1470022445', '821019291'],
  '1980s': ['867825522', '791349661'],
  '1990s': ['878989033', '1051470831'],
  '2000s': ['248297032', '713806955'],
  '2010s': ['14917741483', '1162725851'],
  '2020s': ['13650084141', '1139670951']
}

/**
 * Where a film's music comes from, and the reason this arm exists at all.
 *
 * Deezer publishes a *Films/Jeux vidéo* genre and 200 editorial soundtrack
 * playlists, and they are the wrong source: measured 19 August 2026, that
 * chart's top twenty is *Shallow*, *Skyfall* and *Eye of the Tiger*. Those are
 * songs used in films, every one of them already playable under `chart` and
 * `decade`, and serving them here would be a label the room catches out on its
 * second round.
 *
 * **Ids, never names.** Searching Deezer for a composer returns a homonym or a
 * tribute act ahead of them — `Danny Elfman` gave 4 tracks, `Vladimir Cosma`
 * gave none — so each of these was resolved by hand once and a name never
 * reaches Deezer at runtime.
 *
 * Who is on it is measured, not curated by taste: each name returns at least
 * six tracks that clear `FILM_SCORE_FLOOR`, name a film and are credited to
 * them. That is what keeps Bernard Herrmann and Henry Mancini off it — their
 * tops are compilations, which `film-score.ts` refuses — and it is why a French
 * table's Cosma, Sarde and Legrand sit beside Williams and Zimmer.
 */
const FILM_COMPOSER_IDS: Record<string, number> = {
  'Alan Silvestri': 791,
  'Alexandre Desplat': 9183,
  'Bear McCreary': 5863,
  'Brian Tyler': 16596,
  'Bruno Coulais': 1075,
  'Carter Burwell': 2732,
  'Christophe Beck': 7461,
  'Cliff Martinez': 5060,
  'Daniel Pemberton': 449167,
  'Danny Elfman': 760,
  'Ennio Morricone': 1536,
  'Francis Lai': 15986,
  'Gabriel Yared': 1047,
  'Georges Delerue': 7956,
  'Gustavo Santaolalla': 1509,
  'Hans Zimmer': 1935,
  'Harry Gregson-Williams': 3170,
  'Howard Shore': 556,
  'James Horner': 184,
  'Jerry Goldsmith': 5980,
  'Joe Hisaishi': 66582,
  'John Barry': 2466,
  'John Powell': 2301,
  'John Williams': 805,
  'Junkie XL': 2152,
  'Justin Hurwitz': 6747671,
  'Jóhann Jóhannsson': 75802,
  'Klaus Badelt': 2791,
  'Kyle Dixon & Michael Stein': 11206178,
  'Lalo Schifrin': 4694,
  'Lorne Balfe': 1199471,
  'Ludwig Göransson': 4553724,
  'Marco Beltrami': 8425,
  'Maurice Jarre': 2901,
  'Michael Giacchino': 4962,
  'Michel Legrand': 8347,
  'Nicholas Britell': 5317330,
  'Nino Rota': 5741,
  'Patrick Doyle': 3639,
  'Philippe Sarde': 134189,
  'Rachel Portman': 1941,
  'Ramin Djawadi': 67835,
  'Randy Newman': 5679,
  'Thomas Newman': 2245,
  'Trent Reznor & Atticus Ross': 1539961,
  Vangelis: 2639,
  'Vladimir Cosma': 17238,
  'Yann Tiersen': 762,
  'Éric Serra': 786
}

/**
 * How many of them one pool is drawn from. The whole table is 49 requests, well
 * past what any other arm asks of Deezer in one fill; a fresh draw each time a
 * pool empties is what keeps the rest of the table reachable over an evening,
 * where a fixed subset would run a room into `no_content_available`.
 */
const COMPOSERS_PER_POOL = 8

/**
 * The floor this arm pins in the room's place. Chosen against what the
 * catalogue actually holds at each height: at 500k the whole table is 135
 * tracks, at 150k the bottom of the range is a documentary and a Disney park
 * restaurant, and here it is *Casablanca*, *Docteur Jivago* and *La Strada* —
 * 1 155 tracks over 455 films.
 */
const FILM_SCORE_FLOOR = 200_000

const pathsFor = (source: TrackSource): string[] => {
  switch (source.kind) {
    case 'chart': {
      const genreIds =
        source.genreIds.length === 0 ? [EVERY_GENRE] : source.genreIds

      return genreIds.map(
        (genreId) => `/chart/${genreId}/tracks?limit=${POOL_SIZE}`
      )
    }
    case 'decade': {
      const decades =
        source.decades.length === 0 ? trackDecades : source.decades

      return decades.flatMap((decade) =>
        DECADE_PLAYLIST_IDS[decade].map(
          (playlistId) => `/playlist/${playlistId}/tracks?limit=${POOL_SIZE}`
        )
      )
    }
    case 'film':
      return shuffled(Object.values(FILM_COMPOSER_IDS))
        .slice(0, COMPOSERS_PER_POOL)
        .map((composerId) => `/artist/${composerId}/top?limit=${POOL_SIZE}`)
    case 'playlist':
      return [
        `/playlist/${encodeURIComponent(source.playlistId)}/tracks?limit=${POOL_SIZE}`
      ]
    case 'search':
      return [
        `/search?q=${encodeURIComponent(source.query)}&limit=${POOL_SIZE}`
      ]
  }
}

const toCatalogueTrack = (
  track: DeezerTrack,
  film: string | null = null
): CatalogueTrack => ({
  artist: track.artist.name,
  coverUrl: track.album?.cover_medium ?? null,
  film,
  id: track.id,
  title: track.title
})

const requestList = async (
  path: string
): Promise<Result<DeezerTrack[], MusicSourceError>> => {
  const response = await requestJson(path)

  if (response.status === 'failure') {
    return response
  }

  const parsed = deezerListSchema.safeParse(response.data)

  if (!parsed.success) {
    logger.error('Deezer returned an unexpected list shape', { path })

    return Result.failure('music_source_unavailable')
  }

  return Result.success(parsed.data.data)
}

const requestJson = async (
  path: string
): Promise<Result<unknown, MusicSourceError>> => {
  try {
    const response = await fetch(`${env.DEEZER_API_URL}${path}`, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    })

    if (!response.ok) {
      logger.error('Deezer request failed', { path, status: response.status })

      return Result.failure('music_source_unavailable')
    }

    const body: unknown = await response.json()
    const declaredError = deezerErrorSchema.safeParse(body)

    if (declaredError.success) {
      const { type } = declaredError.data.error

      // An id nobody can look up is a host's typo, not an outage, and the two
      // deserve different answers — on screen, and in the log a real outage
      // has to be findable in. Every other declared type — quota, permission,
      // a malformed query — really is the catalogue refusing us.
      if (type === RESOURCE_NOT_FOUND) {
        logger.warn('Deezer knows nothing at that path', { path })

        return Result.failure('no_content_available')
      }

      logger.error('Deezer reported an error', { path, type })

      return Result.failure('music_source_unavailable')
    }

    return Result.success(body)
  } catch (cause) {
    logger.error('Deezer request threw', {
      path,
      reason: cause instanceof Error ? cause.name : 'unknown'
    })

    return Result.failure('music_source_unavailable')
  }
}
