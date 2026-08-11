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
 * Choice mode is worth a single point, where typing the whole thing is worth
 * three. Picking one of four is a different act from producing the answer from
 * nothing — paying them the same makes the easy mode the optimal one, and a
 * room that notices stops using the hard one.
 */
export const POINTS_FOR_A_RIGHT_CHOICE = 1

/**
 * The other side of that pair, for a game whose answer is one claim rather than
 * two halves. It matches what the blind test's pair is worth by another road —
 * a point per half and one more for holding both — because the ratio is the
 * point and it has to read the same in every game on the shelf.
 */
export const POINTS_FOR_A_TYPED_ANSWER = 3

/**
 * What a bare claim is worth. It is not a scale the host can tune, and that is
 * on purpose: the room already owns the question, so letting it own the price
 * too turns every round into a negotiation.
 */
export const POINTS_FOR_A_CLAIM = 1

/**
 * Awarded on arrival order among the players who scored this round — the first
 * of them, then the second, then nobody. A rank bonus rather than a curve
 * because a player can compute it from what they watched happen, and arguing
 * about it out loud is most of what a party game is for.
 */
export const SPEED_BONUS_BY_RANK = [2, 1] as const

/**
 * What the host granted, in the vocabulary of the game they were judging — the
 * same seam as `round.content`, one layer down.
 *
 * A blind test answer is two independent claims, so `halves` judges them
 * separately and half a guess still scores. Everything else is one claim: a
 * charade is guessed or it is not, and there is no half of it to award.
 *
 * Either way, a verdict worth nothing is what locks the player out and hands
 * the floor back to the room.
 */
export const halvesVerdictSchema = z.object({
  artistCorrect: z.boolean(),
  kind: z.literal('halves'),
  titleCorrect: z.boolean()
})

export const singleVerdictSchema = z.object({
  isCorrect: z.boolean(),
  kind: z.literal('single')
})

export const verdictSchema = z.discriminatedUnion('kind', [
  halvesVerdictSchema,
  singleVerdictSchema
])

export const awardSchema = z.object({
  playerId: playerIdSchema,
  points: z.number().int().nonnegative(),
  verdict: verdictSchema
})

export type Verdict = z.infer<typeof verdictSchema>
export type HalvesVerdict = z.infer<typeof halvesVerdictSchema>
export type SingleVerdict = z.infer<typeof singleVerdictSchema>
export type Award = z.infer<typeof awardSchema>
