import type { Result } from '@adrienlcp/result'
import { zValidator } from '@hono/zod-validator'
import type { Context, Hono } from 'hono'
import { cors } from 'hono/cors'

import type {
  ApiErrorResponse,
  CatalogueTrack,
  CreateRoomResponse,
  HealthResponse,
  RoomExistsResponse,
  TrackListResponse
} from '@taverla/protocol/http'
import {
  createRoomRequestSchema,
  decadePreviewQuerySchema,
  playlistPreviewQuerySchema,
  trackSearchQuerySchema
} from '@taverla/protocol/http'
import { PROTOCOL_VERSION } from '@taverla/protocol/version'

import { normalizeRoomCode } from '@taverla/core/room/room-code'

import { createRoom, findRoom } from '@/domain/room/room-store'
import { env } from '@/env'
import { limitRoomCreation } from '@/infrastructure/http/rate-limit'
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

/**
 * Seven routes, and none of them run during a game — creating a room, checking
 * one exists, browsing the catalogue. Everything that happens while people are
 * playing is a WebSocket frame.
 */
export const registerHttpRoutes = (app: Hono): void => {
  // Only reached when the browser is not behind the Vite dev proxy; in dev the
  // app and the API share an origin, so nothing here fires.
  app.use('/api/*', cors({ origin: env.allowedOrigins }))

  app.get('/api/health', (context) => {
    const body: HealthResponse = {
      build: env.build,
      protocolVersion: PROTOCOL_VERSION,
      status: 'ok'
    }

    return context.json(body)
  })

  app.post(
    '/api/rooms',
    limitRoomCreation,
    zValidator('json', createRoomRequestSchema),
    (context) => {
      const { game, locale } = context.req.valid('json')
      const room = createRoom({ game: game ?? null, locale, now: Date.now() })

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

  app.get('/api/rooms/:code', (context) => {
    const code = normalizeRoomCode(context.req.param('code'))
    const body: RoomExistsResponse = {
      exists: code !== null && findRoom(code) !== null
    }

    return context.json(body)
  })

  app.get(
    '/api/tracks/search',
    zValidator('query', trackSearchQuerySchema),
    async (context) => {
      const { difficulty, q } = context.req.valid('query')
      const found = await fetchTracksFor({
        difficulty,
        source: { kind: 'search', query: q }
      })

      return respondWithTracks(context, found)
    }
  )

  // A playlist id is copied out of a Deezer URL, so the host has no way of
  // knowing they pasted the wrong one until the first round comes up empty.
  app.get(
    '/api/playlists/:playlistId/tracks',
    zValidator('query', playlistPreviewQuerySchema),
    async (context) => {
      const { difficulty } = context.req.valid('query')
      const found = await fetchTracksFor({
        difficulty,
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
  app.get('/api/tracks/films', async (context) => {
    // No query: the arm carries no choice, and the room's difficulty is the one
    // setting this source overrules — see `FILM_SCORE_FLOOR`.
    const found = await fetchTracksFor({
      difficulty: 'mixed',
      source: { kind: 'film' }
    })

    return respondWithTracks(context, found)
  })

  app.get(
    '/api/tracks/decades',
    zValidator('query', decadePreviewQuerySchema),
    async (context) => {
      const { decades, difficulty } = context.req.valid('query')
      const found = await fetchTracksFor({
        difficulty,
        source: { decades, kind: 'decade' }
      })

      return respondWithTracks(context, found)
    }
  )
}
