import type { Result } from '@adrienlcp/result'
import { zValidator } from '@hono/zod-validator'
import type { Context, Hono } from 'hono'
import { cors } from 'hono/cors'

import type {
  ApiErrorResponse,
  CatalogueTrack,
  CreateRoomResponse,
  HealthResponse,
  OpenWallPairingResponse,
  RoomExistsResponse,
  TrackListResponse,
  WallPairingPollResponse
} from '@taverla/protocol/http'
import {
  createRoomRequestSchema,
  decadePreviewQuerySchema,
  pairWallRequestSchema,
  playlistPreviewQuerySchema,
  trackSearchQuerySchema,
  wallPairingCodeSchema,
  wallPairingPollQuerySchema
} from '@taverla/protocol/http'
import { API_PREFIX, API_ROUTES } from '@taverla/protocol/routes'
import { PROTOCOL_VERSION } from '@taverla/protocol/version'

import { normalizeRoomCode } from '@taverla/core/room/room-code'

import { createRoom, findRoom } from '@/domain/room/room-store'
import {
  collectWallPairing,
  openWallPairing,
  pairWall
} from '@/domain/room/wall-pairing'
import { env } from '@/env'
import { nowMs } from '@/infrastructure/clock'
import { limitRoomCreation } from '@/infrastructure/http/rate-limit'
import { newWallSecret } from '@/infrastructure/ids'
import {
  fetchTracksFor,
  type MusicSourceError
} from '@/infrastructure/music/deezer-client'

/**
 * A catalogue that matched nothing well-known enough to guess is an empty
 * result, not a broken gateway — the caller renders "nothing here", and 502 is
 * reserved for the catalogue actually being down.
 */
const respondWithTracks = (
  context: Context,
  found: Result<CatalogueTrack[], MusicSourceError>
) => {
  if (found.status === 'failure' && found.error === 'no_content_available') {
    const empty: TrackListResponse = { tracks: [] }

    return context.json(empty)
  }

  if (found.status === 'failure') {
    const error: ApiErrorResponse = {
      code: found.error,
      message: 'The music catalogue is unavailable right now'
    }

    return context.json(error, 502)
  }

  const body: TrackListResponse = { tracks: found.data }

  return context.json(body)
}

const pairingNotFound: ApiErrorResponse = {
  code: 'pairing_not_found',
  message: 'That screen code has expired or was never shown'
}

/**
 * Ten routes, and none of them run during a game — creating a room, checking
 * one exists, browsing the catalogue. Everything that happens while people are
 * playing is a WebSocket frame.
 */
export const registerHttpRoutes = (app: Hono): void => {
  // Only reached when the browser is not behind the Vite dev proxy; in dev the
  // app and the API share an origin, so nothing here fires.
  app.use(`${API_PREFIX}/*`, cors({ origin: env.allowedOrigins }))

  app.get(API_ROUTES.health, (context) => {
    const body: HealthResponse = {
      build: env.build,
      protocolVersion: PROTOCOL_VERSION,
      status: 'ok'
    }

    return context.json(body)
  })

  app.post(
    API_ROUTES.rooms,
    limitRoomCreation,
    zValidator('json', createRoomRequestSchema),
    (context) => {
      const { game, locale } = context.req.valid('json')
      const room = createRoom({ game: game ?? null, locale, now: nowMs() })

      if (room === null) {
        const error: ApiErrorResponse = {
          code: 'internal_error',
          message: 'Could not allocate a room code'
        }

        return context.json(error, 503)
      }

      const body: CreateRoomResponse = {
        code: room.code,
        hostToken: room.hostToken
      }

      return context.json(body, 201)
    }
  )

  app.get(API_ROUTES.room, (context) => {
    const code = normalizeRoomCode(context.req.param('code'))
    const body: RoomExistsResponse = {
      exists: code !== null && findRoom(code) !== null
    }

    return context.json(body)
  })

  // A wall asks for a code to show, the host's device vouches for it with the
  // room's token, and the wall collects the token by polling. Rate-limited with
  // room creation: a code is the same cheap allocation a room is.
  app.post(API_ROUTES.walls, limitRoomCreation, (context) => {
    const opened = openWallPairing({ now: nowMs(), secret: newWallSecret() })

    if (opened === null) {
      const error: ApiErrorResponse = {
        code: 'internal_error',
        message: 'Could not allocate a screen code'
      }

      return context.json(error, 503)
    }

    const body: OpenWallPairingResponse = opened

    return context.json(body, 201)
  })

  app.get(
    API_ROUTES.wall,
    zValidator('query', wallPairingPollQuerySchema),
    (context) => {
      const pairingCode = wallPairingCodeSchema.safeParse(
        context.req.param('pairingCode')
      )

      if (!pairingCode.success) {
        return context.json(pairingNotFound, 404)
      }

      const collected = collectWallPairing({
        now: nowMs(),
        pairingCode: pairingCode.data,
        secret: context.req.valid('query').secret
      })

      if (collected.status === 'failure') {
        return context.json(pairingNotFound, 404)
      }

      const body: WallPairingPollResponse = collected.data

      return context.json(body)
    }
  )

  app.post(
    API_ROUTES.wallPair,
    zValidator('json', pairWallRequestSchema),
    (context) => {
      const pairingCode = wallPairingCodeSchema.safeParse(
        context.req.param('pairingCode')
      )

      if (!pairingCode.success) {
        return context.json(pairingNotFound, 404)
      }

      const { hostToken, roomCode } = context.req.valid('json')
      const room = findRoom(roomCode)

      if (room === null || room.hostToken !== hostToken) {
        const error: ApiErrorResponse = {
          code: 'wall_not_paired',
          message: 'Only the device hosting this room can pair a screen to it'
        }

        return context.json(error, 403)
      }

      const paired = pairWall({
        hostToken,
        now: nowMs(),
        pairingCode: pairingCode.data,
        roomCode
      })

      if (paired.status === 'failure') {
        return context.json(pairingNotFound, 404)
      }

      return context.body(null, 204)
    }
  )

  app.get(
    API_ROUTES.trackSearch,
    zValidator('query', trackSearchQuerySchema),
    async (context) => {
      const { difficulty, q } = context.req.valid('query')
      const found = await fetchTracksFor({
        difficulty,
        signal: context.req.raw.signal,
        source: { kind: 'search', query: q }
      })

      return respondWithTracks(context, found)
    }
  )

  // A playlist id is copied out of a Deezer URL, so the host has no way of
  // knowing they pasted the wrong one until the first round comes up empty.
  app.get(
    API_ROUTES.playlistTracks,
    zValidator('query', playlistPreviewQuerySchema),
    async (context) => {
      const { difficulty } = context.req.valid('query')
      const found = await fetchTracksFor({
        difficulty,
        signal: context.req.raw.signal,
        source: {
          kind: 'playlist',
          playlistId: context.req.param('playlistId')
        }
      })

      return respondWithTracks(context, found)
    }
  )

  // A decade names itself and says nothing about what is in it, so this is the
  // one source a host cannot check by reading the control they just pressed.
  app.get(API_ROUTES.filmTracks, async (context) => {
    // No query: the arm carries no choice, and the room's difficulty is the one
    // setting this source overrules — see `FILM_SCORE_FLOOR`.
    const found = await fetchTracksFor({
      difficulty: 'mixed',
      signal: context.req.raw.signal,
      source: { kind: 'film' }
    })

    return respondWithTracks(context, found)
  })

  app.get(
    API_ROUTES.decadeTracks,
    zValidator('query', decadePreviewQuerySchema),
    async (context) => {
      const { decades, difficulty } = context.req.valid('query')
      const found = await fetchTracksFor({
        difficulty,
        signal: context.req.raw.signal,
        source: { decades, kind: 'decade' }
      })

      return respondWithTracks(context, found)
    }
  )
}
