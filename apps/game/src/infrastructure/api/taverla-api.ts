import type { z } from 'zod'

import {
  type CreateRoomResponse,
  createRoomResponseSchema,
  roomExistsResponseSchema,
  type TrackSearchResult,
  trackSearchResponseSchema
} from '@taverla/protocol/http'
import type { RoomCode } from '@taverla/protocol/identifiers'
import type { TrackDifficulty } from '@taverla/protocol/track'

import { Result } from '@taverla/core/helpers/result'

export type ApiError = 'unreachable' | 'unexpected_response' | 'rejected'

/**
 * The whole HTTP surface of the app. Everything that happens during a game goes
 * through the socket instead — see `infrastructure/messaging`.
 */
export const createRoom = async (): Promise<
  Result<CreateRoomResponse, ApiError>
> => request('/api/rooms', createRoomResponseSchema, { method: 'POST' })

export const roomExists = async (
  code: RoomCode
): Promise<Result<boolean, ApiError>> => {
  const response = await request(`/api/rooms/${code}`, roomExistsResponseSchema)

  return response.status === 'failure'
    ? response
    : Result.success(response.data.exists)
}

export const searchTracks = async ({
  difficulty,
  query
}: {
  difficulty: TrackDifficulty
  query: string
}): Promise<Result<TrackSearchResult[], ApiError>> => {
  const response = await request(
    `/api/tracks/search?q=${encodeURIComponent(query)}&difficulty=${difficulty}`,
    trackSearchResponseSchema
  )

  return response.status === 'failure'
    ? response
    : Result.success(response.data.results)
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

  if (!response.ok) {
    return Result.failure('rejected')
  }

  const parsed = schema.safeParse(await response.json())

  return parsed.success
    ? Result.success(parsed.data)
    : Result.failure('unexpected_response')
}
