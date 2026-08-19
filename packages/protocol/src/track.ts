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
  /**
   * The film or the series the track was written for, and `null` on every
   * source but the one that goes looking for composers.
   *
   * Where it is set it is the half the round asks for **in the title's place**,
   * and the reveal shows all three. A score cue's own title is `Cornfield
   * Chase`, `Day One`, `Concerning Hobbits` — the one thing at the table nobody
   * can produce, where the film is what the room shouts.
   */
  film: z.string().nullable(),
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

export const trackDecades = [
  '1970s',
  '1980s',
  '1990s',
  '2000s',
  '2010s',
  '2020s'
] as const

/**
 * The generations a table is made of. Deezer cannot filter by year — its
 * advanced search takes an artist, an album, a label and a duration, and no
 * date — so a decade resolves to curated playlists, and which ones is a
 * catalogue fact only `deezer-client.ts` may hold. Named the way the room says
 * it for the same reason `TrackDifficulty` is: a catalogue that *could* filter
 * by year would keep these six words.
 */
export const trackDecadeSchema = z.enum(trackDecades)

/**
 * Where a room's tracks come from. Every variant resolves, server-side, to a
 * list of Deezer track ids; the browser never talks to Deezer directly, because
 * `api.deezer.com` answers without `Access-Control-Allow-Origin`.
 */
export const trackSourceSchema = z.discriminatedUnion('kind', [
  /**
   * Deezer genre charts, merged. The ids are the ones Deezer publishes at
   * `/genre`, and each chart is a hundred tracks that are charting — the
   * cheapest definition of "a song people know".
   *
   * **Empty means every genre**, which is the all-genres chart rather than an
   * empty pool. A host who wants everything is the default state, and making
   * them light twelve stamps to say so would be the wrong way round.
   */
  z.object({
    genreIds: z.array(z.number().int().nonnegative()),
    kind: z.literal('chart')
  }),
  /**
   * **Empty means every decade**, for the same reason the chart's is: picking
   * nothing already says everything.
   */
  z.object({
    decades: z.array(trackDecadeSchema),
    kind: z.literal('decade')
  }),
  /**
   * Film and series music, drawn from a table of **composers** and never from
   * the soundtrack charts. The distinction is the whole game: a song used in a
   * film is not a film's score, and *Shallow*, *Skyfall* and *Eye of the Tiger*
   * under this name would be a label the room catches out on its second round —
   * they are already playable under every other arm.
   *
   * It carries nothing, because there is nothing left to choose. Which
   * composers is a catalogue fact only `deezer-client.ts` may hold, and a
   * composer who scores a series does the same job under the same name, so
   * series ride along with no control of their own.
   */
  z.object({ kind: z.literal('film') }),
  z.object({ kind: z.literal('playlist'), playlistId: z.string().min(1) }),
  z.object({
    kind: z.literal('search'),
    query: z.string().trim().min(1).max(120)
  })
])

export const trackDifficulties = ['wellKnown', 'mixed', 'obscure'] as const

/**
 * How obscure a track may be and still be worth guessing. Deliberately named in
 * the room's vocabulary rather than in the catalogue's: a popularity score is a
 * Deezer fact, and only `deezer-client.ts` may know what number each of these
 * costs. A second catalogue with a different scale keeps these three words.
 */
export const trackDifficultySchema = z.enum(trackDifficulties)

export type TrackIdentity = z.infer<typeof trackIdentitySchema>
export type HostTrack = z.infer<typeof hostTrackSchema>
export type TrackDecade = z.infer<typeof trackDecadeSchema>
export type TrackSource = z.infer<typeof trackSourceSchema>
export type TrackDifficulty = z.infer<typeof trackDifficultySchema>
