import { z } from 'zod'

import type { TrackSearchResult } from '@taverla/protocol/http'
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
  | 'no_tracks_available'

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
 * speaks `TrackSource`, `TrackSearchResult` and `HostTrack`; swapping the
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
}): Promise<Result<TrackSearchResult[], MusicSourceError>> => {
  const fetched = await requestList(pathFor(source))

  if (fetched.status === 'failure') {
    return fetched
  }

  const playable = fetched.data
    .filter((track) => isWorthGuessing(track, difficulty))
    .map(toSearchResult)

  return playable.length === 0
    ? Result.failure('no_tracks_available')
    : Result.success(playable)
}

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
    return Result.failure('no_tracks_available')
  }

  return Result.success({
    ...toSearchResult(parsed.data),
    previewUrl: parsed.data.preview
  })
}

const isWorthGuessing = (
  track: DeezerTrack,
  difficulty: TrackDifficulty
): boolean =>
  track.preview.length > 0 &&
  (track.rank ?? 0) >= MINIMUM_RANK_BY_DIFFICULTY[difficulty]

const pathFor = (source: TrackSource): string => {
  switch (source.kind) {
    case 'chart':
      return `/chart/${source.genreId}/tracks?limit=${POOL_SIZE}`
    case 'playlist':
      return `/playlist/${encodeURIComponent(source.playlistId)}/tracks?limit=${POOL_SIZE}`
    case 'search':
      return `/search?q=${encodeURIComponent(source.query)}&limit=${POOL_SIZE}`
  }
}

const toSearchResult = (track: DeezerTrack): TrackSearchResult => ({
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
      logger.error('Deezer reported an error', {
        path,
        type: declaredError.data.error.type
      })

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
