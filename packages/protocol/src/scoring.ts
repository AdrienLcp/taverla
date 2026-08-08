import { z } from 'zod'

import { playerIdSchema } from './identifiers'

export const POINTS_PER_TITLE = 1
export const POINTS_PER_ARTIST = 1

/**
 * A blind test answer is two independent claims, so the host judges them
 * separately: half a guess still scores. Both false is what triggers the
 * buzzer's penalty — the player sits out the rest of the round and the track
 * resumes for everyone else.
 */
export const verdictSchema = z.object({
  artistCorrect: z.boolean(),
  titleCorrect: z.boolean()
})

export const awardSchema = z.object({
  playerId: playerIdSchema,
  points: z.number().int().nonnegative(),
  verdict: verdictSchema
})

export type Verdict = z.infer<typeof verdictSchema>
export type Award = z.infer<typeof awardSchema>
