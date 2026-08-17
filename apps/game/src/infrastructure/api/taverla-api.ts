import type { z } from 'zod'

import type { ShelvedGame } from '@taverla/protocol/game'
import {
  type CatalogueTrack,
  type CreateRoomRequest,
  type CreateRoomResponse,
  createRoomResponseSchema,
  type HealthResponse,
  healthResponseSchema,
  roomExistsResponseSchema,
  trackListResponseSchema
} from '@taverla/protocol/http'
import type { RoomCode } from '@taverla/protocol/identifiers'
import type { Locale } from '@taverla/protocol/locale'
import type { TrackDecade, TrackDifficulty } from '@taverla/protocol/track'

import { Result } from '@taverla/core/helpers/result'

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
  request('/api/rooms', createRoomResponseSchema, {
    body: JSON.stringify({ game, locale } satisfies CreateRoomRequest),
    headers: { 'content-type': 'application/json' },
    method: 'POST'
  })

export const fetchHealth = async (): Promise<
  Result<HealthResponse, ApiError>
> => request('/api/health', healthResponseSchema)

export const roomExists = async (
  code: RoomCode
): Promise<Result<boolean, ApiError>> => {
  const response = await request(`/api/rooms/${code}`, roomExistsResponseSchema)

  return response.status === 'failure'
    ? response
    : Result.success(response.data.exists)
}

export const fetchPlaylistTracks = async ({
  difficulty,
  playlistId
}: {
  difficulty: TrackDifficulty
  playlistId: string
}): Promise<Result<CatalogueTrack[], ApiError>> => {
  const response = await request(
    `/api/playlists/${encodeURIComponent(playlistId)}/tracks?difficulty=${difficulty}`,
    trackListResponseSchema
  )

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
    `/api/tracks/decades?decades=${decades.join(',')}&difficulty=${difficulty}`,
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
    `/api/tracks/search?q=${encodeURIComponent(query)}&difficulty=${difficulty}`,
    trackListResponseSchema
  )

  return response.status === 'failure'
    ? response
    : Result.success(response.data.tracks)
}

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
