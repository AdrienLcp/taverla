import { z } from 'zod'

import type { CatalogueTrack } from '@taverla/protocol/http'
import type {
  HostTrack,
  TrackDifficulty,
  TrackSource
} from '@taverla/protocol/track'

import { Result } from '@taverla/core/helpers/result'

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
  album: z.object({ cover_medium: z.string().nullish() }).nullish(),
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

  const playable = withoutRepeats(reached.flatMap((list) => list.data))
    .filter((track) => isWorthGuessing(track, difficulty))
    .map(toCatalogueTrack)

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

const isWorthGuessing = (
  track: DeezerTrack,
  difficulty: TrackDifficulty
): boolean =>
  track.preview.length > 0 &&
  (track.rank ?? 0) >= MINIMUM_RANK_BY_DIFFICULTY[difficulty]

/** `0` is Deezer's all-genres chart, which is what an empty selection means. */
const EVERY_GENRE = 0

const pathsFor = (source: TrackSource): string[] => {
  switch (source.kind) {
    case 'chart': {
      const genreIds =
        source.genreIds.length === 0 ? [EVERY_GENRE] : source.genreIds

      return genreIds.map(
        (genreId) => `/chart/${genreId}/tracks?limit=${POOL_SIZE}`
      )
    }
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

const toCatalogueTrack = (track: DeezerTrack): CatalogueTrack => ({
  artist: track.artist.name,
  coverUrl: track.album?.cover_medium ?? null,
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
