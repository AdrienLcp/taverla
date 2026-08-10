import { z } from 'zod'

import { playerIdSchema } from './identifiers'

export const POINTS_PER_TITLE = 1
export const POINTS_PER_ARTIST = 1

/**
 * Typed mode only, and deliberately more generous than the buzzer's flat pair:
 * typing both against a clock on a phone is harder than saying them out loud,
 * so holding the whole answer is worth more than the sum of its halves.
 */
export const POINTS_FOR_TITLE_AND_ARTIST = 1

/**
 * Awarded on arrival order among the players who scored this round — the first
 * of them, then the second, then nobody. A rank bonus rather than a curve
 * because a player can compute it from what they watched happen, and arguing
 * about it out loud is most of what a party game is for.
 */
export const SPEED_BONUS_BY_RANK = [2, 1] as const

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
