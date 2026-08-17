import { z } from 'zod'

import { protocolErrorCodeSchema } from './error-code'
import { shelvedGameSchema } from './game'
import { hostTokenSchema, roomCodeSchema } from './identifiers'
import { DEFAULT_LOCALE, localeSchema } from './locale'
import {
  trackDecadeSchema,
  trackDifficultySchema,
  trackIdentitySchema
} from './track'

/**
 * The HTTP surface is deliberately tiny — create a room, check one exists,
 * browse music — because everything that happens *during* a game is a
 * WebSocket frame. It lives here, next to the socket contract, rather than
 * being inferred from the Hono router: keeping one answer to "where is the wire
 * contract?" is worth more than the handful of lines `hc<AppType>` would save,
 * and it keeps `apps/game` from depending on `apps/server`.
 */
/**
 * The room comes first and the game second: a code goes up, the phones arrive,
 * and the table decides while they do. So the game is **optional** — omitted by
 * the front door, and carried by a game's own page, which is a shortcut for a
 * host who already knows what they came to play.
 *
 * It stays a `ShelvedGame` when it is sent. A game can be served in full before
 * it has screens, and a room opened on one of those would render another game's
 * round.
 */
export const createRoomRequestSchema = z.object({
  game: shelvedGameSchema.optional(),
  /**
   * The host's interface language, and the only thing a room can go on for a
   * setting nobody has been asked about yet — the quiz has to be drawn in *some*
   * language before the console has rendered. It is the shell's fact rather than
   * that game's: what the host reads, not what the room plays.
   *
   * Defaulted rather than required, because this door has no version handshake
   * the way the socket does: a tab opened before the field existed still posts.
   */
  locale: localeSchema.default(DEFAULT_LOCALE)
})

/**
 * The one place a `hostToken` reaches a client. It is never on the socket and
 * never in a room view: a screen holds it because it opened the room, or because
 * somebody read it out of that screen's menu and typed it.
 */
export const createRoomResponseSchema = z.object({
  code: roomCodeSchema,
  hostToken: hostTokenSchema
})

export const roomExistsResponseSchema = z.object({
  exists: z.boolean()
})

/**
 * No `previewUrl`: Deezer signs those with a short expiry, so the audio is
 * resolved when the round starts. A pool built at lobby time and played an hour
 * later would carry dead signatures.
 */
export const catalogueTrackSchema = trackIdentitySchema

/**
 * The difficulty rides along so the preview counts what the pool would actually
 * hold. Defaulted rather than required: it is a lobby convenience, and a caller
 * that omits it gets the same floor the room starts on.
 */
export const trackSearchQuerySchema = z.object({
  difficulty: trackDifficultySchema.default('wellKnown'),
  q: z.string().trim().min(1).max(120)
})

export const playlistPreviewQuerySchema = z.object({
  difficulty: trackDifficultySchema.default('wellKnown')
})

/**
 * The decades travel comma-separated, and an absent list is every decade —
 * which is what an empty selection means on the wire too.
 */
export const decadePreviewQuerySchema = z.object({
  decades: z
    .string()
    .default('')
    .transform((value) => value.split(',').filter((part) => part.length > 0))
    .pipe(z.array(trackDecadeSchema)),
  difficulty: trackDifficultySchema.default('wellKnown')
})

/** Shared by every route that answers "what would the pool hold?", not just the search. */
export const trackListResponseSchema = z.object({
  tracks: z.array(catalogueTrackSchema)
})

/**
 * `build` answers "is my fix live?" and nothing else. It is the deployment's,
 * not the tab's: a phone holding a cached bundle still reads what the server
 * was built from, which is the question being asked.
 */
export const healthResponseSchema = z.object({
  build: z.string(),
  protocolVersion: z.number().int().positive(),
  status: z.literal('ok')
})

export const apiErrorResponseSchema = z.object({
  code: protocolErrorCodeSchema,
  message: z.string()
})

export type CreateRoomRequest = z.infer<typeof createRoomRequestSchema>
export type CreateRoomResponse = z.infer<typeof createRoomResponseSchema>
export type RoomExistsResponse = z.infer<typeof roomExistsResponseSchema>
export type CatalogueTrack = z.infer<typeof catalogueTrackSchema>
export type TrackListResponse = z.infer<typeof trackListResponseSchema>
export type HealthResponse = z.infer<typeof healthResponseSchema>
export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>
