import { z } from 'zod'

/**
 * What the players are trying to guess. It exists on the wire in exactly two
 * situations: inside a host-only message, and inside `round.revealed` once the
 * round is over. A player socket that receives it earlier has been handed the
 * answer — see `host-message.ts` for how the type system prevents that.
 */
export const trackIdentitySchema = z.object({
  artist: z.string(),
  coverUrl: z.url().nullable(),
  id: z.string(),
  title: z.string()
})

/**
 * The identity plus the audio the host browser plays. Deezer signs preview URLs
 * with an expiry (~24h), so this is resolved when the round starts, never when
 * the track pool is built — a pool assembled at lobby time and played an hour
 * later would 403 on a stale signature.
 */
export const hostTrackSchema = trackIdentitySchema.extend({
  previewUrl: z.url()
})

/**
 * Where a room's tracks come from. Every variant resolves, server-side, to a
 * list of Deezer track ids; the browser never talks to Deezer directly, because
 * `api.deezer.com` answers without `Access-Control-Allow-Origin`.
 */
export const trackSourceSchema = z.discriminatedUnion('kind', [
  /**
   * A Deezer genre chart. `0` is the all-genres chart; the others are the
   * numeric ids Deezer publishes at `/genre`, and each is a hundred tracks that
   * are charting — which is the cheapest definition of "a song people know".
   */
  z.object({
    genreId: z.number().int().nonnegative(),
    kind: z.literal('chart')
  }),
  z.object({ kind: z.literal('playlist'), playlistId: z.string().min(1) }),
  z.object({
    kind: z.literal('search'),
    query: z.string().trim().min(1).max(120)
  })
])

export type TrackIdentity = z.infer<typeof trackIdentitySchema>
export type HostTrack = z.infer<typeof hostTrackSchema>
export type TrackSource = z.infer<typeof trackSourceSchema>
