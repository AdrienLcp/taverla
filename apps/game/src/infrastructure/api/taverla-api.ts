import { Result } from '@adrienlcp/result'
import type { z } from 'zod'

import type { ShelvedGame } from '@taverla/protocol/game'
import {
  type CatalogueTrack,
  type CreateRoomRequest,
  type CreateRoomResponse,
  createRoomResponseSchema,
  DECADE_LIST_SEPARATOR,
  type DecadePreviewQuery,
  type HealthResponse,
  healthResponseSchema,
  type OpenWallPairingResponse,
  openWallPairingResponseSchema,
  type PairWallRequest,
  type PlaylistPreviewQuery,
  roomExistsResponseSchema,
  type TrackSearchQuery,
  trackListResponseSchema,
  type WallPairingCode,
  type WallPairingPollQuery,
  type WallPairingPollResponse,
  wallPairingPollResponseSchema
} from '@taverla/protocol/http'
import type { RoomCode } from '@taverla/protocol/identifiers'
import type { Locale } from '@taverla/protocol/locale'
import { API_ROUTES, fillRoute } from '@taverla/protocol/routes'
import type { TrackDecade, TrackDifficulty } from '@taverla/protocol/track'

export type ApiError =
  | 'unreachable'
  | 'unexpected_response'
  | 'rejected'
  | 'rate_limited'

const TOO_MANY_REQUESTS = 429

/**
 * The whole HTTP surface of the app. Everything that happens during a game goes
 * through the socket instead — see `infrastructure/messaging`.
 */
export const createRoom = async ({
  game,
  locale
}: {
  /** Omitted by the shelf's own front door: the room is opened, then the table decides. */
  game?: ShelvedGame
  /** What the host reads, which is what a quiz opens on until they say otherwise. */
  locale: Locale
}): Promise<Result<CreateRoomResponse, ApiError>> =>
  request(API_ROUTES.rooms, createRoomResponseSchema, {
    body: JSON.stringify({ game, locale } satisfies CreateRoomRequest),
    headers: { 'content-type': 'application/json' },
    method: 'POST'
  })

export const fetchHealth = async (): Promise<
  Result<HealthResponse, ApiError>
> => request(API_ROUTES.health, healthResponseSchema)

export const roomExists = async (
  code: RoomCode
): Promise<Result<boolean, ApiError>> => {
  const response = await request(
    fillRoute(API_ROUTES.room, { code }),
    roomExistsResponseSchema
  )

  return response.status === 'failure'
    ? response
    : Result.success(response.data.exists)
}

export const openWallPairing = async (): Promise<
  Result<OpenWallPairingResponse, ApiError>
> =>
  request(API_ROUTES.walls, openWallPairingResponseSchema, {
    method: 'POST'
  })

export const pollWallPairing = async ({
  pairingCode,
  secret
}: {
  pairingCode: WallPairingCode
  secret: string
}): Promise<Result<WallPairingPollResponse, ApiError>> =>
  request(
    withQuery(fillRoute(API_ROUTES.wall, { pairingCode }), {
      secret
    } satisfies WallPairingPollQuery),
    wallPairingPollResponseSchema
  )

/** Answers nothing on success, so there is no body to parse. */
export const pairWall = async ({
  pairingCode,
  ...body
}: PairWallRequest & { pairingCode: WallPairingCode }): Promise<
  Result<void, ApiError>
> => {
  try {
    const response = await fetch(
      fillRoute(API_ROUTES.wallPair, { pairingCode }),
      {
        body: JSON.stringify(body satisfies PairWallRequest),
        headers: { 'content-type': 'application/json' },
        method: 'POST'
      }
    )

    return response.ok ? Result.success() : Result.failure('rejected')
  } catch {
    return Result.failure('unreachable')
  }
}

export const fetchPlaylistTracks = async ({
  difficulty,
  playlistId
}: {
  difficulty: TrackDifficulty
  playlistId: string
}): Promise<Result<CatalogueTrack[], ApiError>> => {
  const response = await request(
    withQuery(fillRoute(API_ROUTES.playlistTracks, { playlistId }), {
      difficulty
    } satisfies PlaylistPreviewQuery),
    trackListResponseSchema
  )

  return response.status === 'failure'
    ? response
    : Result.success(response.data.tracks)
}

/** No query at all: the arm carries no choice, and it pins its own floor. */
export const fetchFilmTracks = async (): Promise<
  Result<CatalogueTrack[], ApiError>
> => {
  const response = await request(API_ROUTES.filmTracks, trackListResponseSchema)

  return response.status === 'failure'
    ? response
    : Result.success(response.data.tracks)
}

export const fetchDecadeTracks = async ({
  decades,
  difficulty
}: {
  /** Empty is every decade, the same as it is on the wire. */
  decades: readonly TrackDecade[]
  difficulty: TrackDifficulty
}): Promise<Result<CatalogueTrack[], ApiError>> => {
  const response = await request(
    withQuery(API_ROUTES.decadeTracks, {
      decades: decades.join(DECADE_LIST_SEPARATOR),
      difficulty
    } satisfies DecadePreviewQuery),
    trackListResponseSchema
  )

  return response.status === 'failure'
    ? response
    : Result.success(response.data.tracks)
}

export const searchTracks = async ({
  difficulty,
  query
}: {
  difficulty: TrackDifficulty
  query: string
}): Promise<Result<CatalogueTrack[], ApiError>> => {
  const response = await request(
    withQuery(API_ROUTES.trackSearch, {
      difficulty,
      q: query
    } satisfies TrackSearchQuery),
    trackListResponseSchema
  )

  return response.status === 'failure'
    ? response
    : Result.success(response.data.tracks)
}

const withQuery = (
  path: string,
  query: Readonly<Record<string, string>>
): string => `${path}?${new URLSearchParams(query)}`

/**
 * Responses are validated against the same schemas the server builds them from,
 * so a contract drift surfaces here rather than as `undefined` three components
 * deep.
 */
const request = async <TData>(
  path: string,
  schema: z.ZodType<TData>,
  init?: RequestInit
): Promise<Result<TData, ApiError>> => {
  let response: Response

  try {
    response = await fetch(path, init)
  } catch {
    return Result.failure('unreachable')
  }

  // Told apart from a plain refusal because it is the one the caller can act
  // on: "wait a moment" is advice, "the server refused that" is not.
  if (response.status === TOO_MANY_REQUESTS) {
    return Result.failure('rate_limited')
  }

  if (!response.ok) {
    return Result.failure('rejected')
  }

  // A 200 is not a promise of JSON. A host waking a sleeping instance answers
  // the first request with its own HTML holding page, and parsing that used to
  // throw past this function into whatever was awaiting it.
  let body: unknown

  try {
    body = await response.json()
  } catch {
    return Result.failure('unexpected_response')
  }

  const parsed = schema.safeParse(body)

  return parsed.success
    ? Result.success(parsed.data)
    : Result.failure('unexpected_response')
}
