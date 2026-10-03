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

/** A failure the user is told about, through `apiErrorKey`. */
export type ApiError =
  | 'unreachable'
  | 'unexpected_response'
  | 'rejected'
  | 'rate_limited'

/**
 * `aborted` is the caller's own signal answering, so it is kept out of
 * `ApiError`: a superseded request is dropped without a word, and rendering it
 * would blame the network for a request nobody wanted any more.
 */
export type ApiFailure = ApiError | 'aborted'

type Cancellable = {
  /** Aborts the request, which then fails with `aborted`. */
  signal?: AbortSignal
}

const TOO_MANY_REQUESTS = 429

/**
 * The whole HTTP surface of the app. Everything that happens during a game goes
 * through the socket instead — see `infrastructure/messaging`.
 */
export const createRoom = async ({
  game,
  locale,
  signal
}: Cancellable & {
  /** Omitted by the shelf's own front door: the room is opened, then the table decides. */
  game?: ShelvedGame
  /** What the host reads, which is what a quiz opens on until they say otherwise. */
  locale: Locale
}): Promise<Result<CreateRoomResponse, ApiFailure>> =>
  request(API_ROUTES.rooms, createRoomResponseSchema, {
    body: JSON.stringify({ game, locale } satisfies CreateRoomRequest),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
    signal
  })

export const fetchHealth = async ({
  signal
}: Cancellable = {}): Promise<Result<HealthResponse, ApiFailure>> =>
  request(API_ROUTES.health, healthResponseSchema, { signal })

export const roomExists = async ({
  code,
  signal
}: Cancellable & { code: RoomCode }): Promise<Result<boolean, ApiFailure>> => {
  const answer = await request(
    fillRoute(API_ROUTES.room, { code }),
    roomExistsResponseSchema,
    { signal }
  )

  return answer.status === 'failure'
    ? answer
    : Result.success(answer.data.exists)
}

export const openWallPairing = async ({
  signal
}: Cancellable = {}): Promise<Result<OpenWallPairingResponse, ApiFailure>> =>
  request(API_ROUTES.walls, openWallPairingResponseSchema, {
    method: 'POST',
    signal
  })

export const pollWallPairing = async ({
  pairingCode,
  secret,
  signal
}: Cancellable & {
  pairingCode: WallPairingCode
  secret: string
}): Promise<Result<WallPairingPollResponse, ApiFailure>> =>
  request(
    withQuery(fillRoute(API_ROUTES.wall, { pairingCode }), {
      secret
    } satisfies WallPairingPollQuery),
    wallPairingPollResponseSchema,
    { signal }
  )

/** Answers nothing on success, so there is no body to parse. */
export const pairWall = async ({
  pairingCode,
  signal,
  ...body
}: Cancellable & PairWallRequest & { pairingCode: WallPairingCode }): Promise<
  Result<void, ApiFailure>
> => {
  try {
    const response = await fetch(
      fillRoute(API_ROUTES.wallPair, { pairingCode }),
      {
        body: JSON.stringify(body satisfies PairWallRequest),
        headers: { 'content-type': 'application/json' },
        method: 'POST',
        signal
      }
    )

    return response.ok ? Result.success() : Result.failure('rejected')
  } catch {
    return Result.failure(signal?.aborted ? 'aborted' : 'unreachable')
  }
}

export const fetchPlaylistTracks = async ({
  difficulty,
  playlistId,
  signal
}: Cancellable & {
  difficulty: TrackDifficulty
  playlistId: string
}): Promise<Result<CatalogueTrack[], ApiFailure>> =>
  requestTracks(
    withQuery(fillRoute(API_ROUTES.playlistTracks, { playlistId }), {
      difficulty
    } satisfies PlaylistPreviewQuery),
    signal
  )

/** No query at all: the arm carries no choice, and it pins its own floor. */
export const fetchFilmTracks = async ({
  signal
}: Cancellable = {}): Promise<Result<CatalogueTrack[], ApiFailure>> =>
  requestTracks(API_ROUTES.filmTracks, signal)

export const fetchDecadeTracks = async ({
  decades,
  difficulty,
  signal
}: Cancellable & {
  /** Empty is every decade, the same as it is on the wire. */
  decades: readonly TrackDecade[]
  difficulty: TrackDifficulty
}): Promise<Result<CatalogueTrack[], ApiFailure>> =>
  requestTracks(
    withQuery(API_ROUTES.decadeTracks, {
      decades: decades.join(DECADE_LIST_SEPARATOR),
      difficulty
    } satisfies DecadePreviewQuery),
    signal
  )

export const searchTracks = async ({
  difficulty,
  query,
  signal
}: Cancellable & {
  difficulty: TrackDifficulty
  query: string
}): Promise<Result<CatalogueTrack[], ApiFailure>> =>
  requestTracks(
    withQuery(API_ROUTES.trackSearch, {
      difficulty,
      q: query
    } satisfies TrackSearchQuery),
    signal
  )

const requestTracks = async (
  path: string,
  signal: AbortSignal | undefined
): Promise<Result<CatalogueTrack[], ApiFailure>> => {
  const trackList = await request(path, trackListResponseSchema, { signal })

  return trackList.status === 'failure'
    ? trackList
    : Result.success(trackList.data.tracks)
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
): Promise<Result<TData, ApiFailure>> => {
  let response: Response

  try {
    response = await fetch(path, init)
  } catch {
    return Result.failure(init?.signal?.aborted ? 'aborted' : 'unreachable')
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
    return Result.failure(
      init?.signal?.aborted ? 'aborted' : 'unexpected_response'
    )
  }

  const parsed = schema.safeParse(body)

  return parsed.success
    ? Result.success(parsed.data)
    : Result.failure('unexpected_response')
}
