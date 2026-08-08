import { z } from 'zod'

import { protocolErrorCodeSchema } from './error-code'
import { roomCodeSchema } from './identifiers'
import { trackIdentitySchema } from './track'

/**
 * The HTTP surface is deliberately tiny — create a room, check one exists,
 * browse music — because everything that happens *during* a game is a
 * WebSocket frame. It lives here, next to the socket contract, rather than
 * being inferred from the Hono router: keeping one answer to "where is the wire
 * contract?" is worth more than the handful of lines `hc<AppType>` would save,
 * and it keeps `apps/game` from depending on `apps/server`.
 */
export const createRoomResponseSchema = z.object({
  code: roomCodeSchema
})

export const roomExistsResponseSchema = z.object({
  exists: z.boolean()
})

/**
 * No `previewUrl`: Deezer signs those with a short expiry, so the audio is
 * resolved when the round starts. A pool built at lobby time and played an hour
 * later would carry dead signatures.
 */
export const trackSearchResultSchema = trackIdentitySchema

export const trackSearchQuerySchema = z.object({
  q: z.string().trim().min(1).max(120)
})

export const trackSearchResponseSchema = z.object({
  results: z.array(trackSearchResultSchema)
})

export const healthResponseSchema = z.object({
  protocolVersion: z.number().int().positive(),
  status: z.literal('ok')
})

export const apiErrorResponseSchema = z.object({
  code: protocolErrorCodeSchema,
  message: z.string()
})

export type CreateRoomResponse = z.infer<typeof createRoomResponseSchema>
export type RoomExistsResponse = z.infer<typeof roomExistsResponseSchema>
export type TrackSearchResult = z.infer<typeof trackSearchResultSchema>
export type TrackSearchResponse = z.infer<typeof trackSearchResponseSchema>
export type HealthResponse = z.infer<typeof healthResponseSchema>
export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>
