import { zValidator } from '@hono/zod-validator'
import type { Hono } from 'hono'
import { cors } from 'hono/cors'

import type {
  ApiErrorResponse,
  CreateRoomResponse,
  HealthResponse,
  RoomExistsResponse,
  TrackSearchResponse
} from '@taverla/protocol/http'
import { trackSearchQuerySchema } from '@taverla/protocol/http'
import { PROTOCOL_VERSION } from '@taverla/protocol/version'

import { normalizeRoomCode } from '@taverla/core/room/room-code'

import { createRoom, findRoom } from '@/domain/room/room-store'
import { env } from '@/env'
import { limitRoomCreation } from '@/infrastructure/http/rate-limit'
import { fetchTracksFor } from '@/infrastructure/music/deezer-client'

/**
 * Four routes, and none of them run during a game — creating a room, checking
 * one exists, browsing the catalogue. Everything that happens while people are
 * playing is a WebSocket frame.
 */
export const registerHttpRoutes = (app: Hono): void => {
  // Only reached when the browser is not behind the Vite dev proxy; in dev the
  // app and the API share an origin, so nothing here fires.
  app.use('/api/*', cors({ origin: env.allowedOrigins }))

  app.get('/api/health', (context) => {
    const body: HealthResponse = {
      protocolVersion: PROTOCOL_VERSION,
      status: 'ok'
    }

    return context.json(body)
  })

  app.post('/api/rooms', limitRoomCreation, (context) => {
    const room = createRoom(Date.now())

    if (room === null) {
      const error: ApiErrorResponse = {
        code: 'internal_error',
        message: 'Could not allocate a room code'
      }

      return context.json(error, 503)
    }

    const body: CreateRoomResponse = { code: room.code }

    return context.json(body, 201)
  })

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

      // A search that matched nothing well-known enough to guess is an empty
      // result, not a broken gateway — the caller renders "nothing here", and
      // 502 is reserved for the catalogue actually being down.
      if (found.status === 'failure' && found.error === 'no_tracks_available') {
        const empty: TrackSearchResponse = { results: [] }

        return context.json(empty)
      }

      if (found.status === 'failure') {
        const error: ApiErrorResponse = {
          code: found.error,
          message: 'The music catalogue is unavailable right now'
        }

        return context.json(error, 502)
      }

      const body: TrackSearchResponse = { results: found.data }

      return context.json(body)
    }
  )
}
