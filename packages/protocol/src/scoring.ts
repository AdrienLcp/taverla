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
 * The most the clock pays, at nought seconds, falling linearly to nothing when
 * the round runs out. It replaced a rank table of `[2, 1]` — the first scorer,
 * then the second, then nobody — and the argument that table carried is worth
 * keeping, because it is the reason somebody will want to restore it: a rank is
 * a thing a player computes from what they watched happen, and arguing about it
 * out loud is most of what a party game is for.
 *
 * It lost on the case it could not price. If the first answers at one second
 * and the second answers at twenty-nine, a rank pays them 2 and 1; the gap the
 * room actually saw was the whole round. **Do not put the table back.**
 *
 * Two consequences that are not incidental. Two players landing in the same
 * second now score the same, where the table always separated them by arrival —
 * more honest, and a real change in how a board reads. And the bonus is no
 * longer scarce: on a thirty-second round everyone who answers inside
 * twenty-five takes something, where before it was two players or nobody.
 *
 * Three is a ceiling, not the amplitude: `speedBonusForElapsed` takes the lower
 * of it and what the answer itself paid, so the clock can double a score and
 * never more. That held for a typed answer already, and the argument that it
 * did not need to hold for a pick — the mode is the *room's*, so the two are
 * never scored in the same game — was wrong twice over. `mode.kind` is
 * changeable between two rounds, so both rates do land on one board; and 4
 * against 1 inside one choice round reads as rounding rather than as a rule.
 *
 * Le Fake pays no such bonus, and it is the only game on the shelf that does
 * not: voting quickly is voting without reading the board, which is the half of
 * that round worth having. The bare buzzer pays none either, and cannot — it
 * has no round clock at all, because the host brings the content and eight
 * seconds into a charade is not eight seconds into a riddle.
 */
export const MOST_A_SPEED_BONUS_PAYS = 3

/**
 * Picking the truth out of a board of lies. Twice what a right pick is worth in
 * every other game, because the wrong answers here were written by people in the
 * room trying to catch you rather than authored to be plausible.
 */
export const POINTS_FOR_FINDING_THE_TRUTH = 2

/**
 * Per player who voted for your lie — and the first thing on the shelf that pays
 * for a wrong answer. It is deliberately not capped: a lie the whole table fell
 * for is the round everyone remembers, and shaving it would be scoring against
 * the point of the game.
 */
export const POINTS_PER_PLAYER_FOOLED = 1

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
  /** Everything the round paid, the speed bonus included. */
  points: z.number().int().nonnegative(),
  /**
   * How much of `points` the clock paid, so a screen can say why two players
   * who both got it right did not get the same. A curve is less visible than
   * the rank table it replaced — the room watched the order happen and could
   * count it — so the breakdown travels rather than being inferred.
   */
  speedBonus: z.number().int().nonnegative(),
  verdict: verdictSchema
})

export type Verdict = z.infer<typeof verdictSchema>
export type HalvesVerdict = z.infer<typeof halvesVerdictSchema>
export type SingleVerdict = z.infer<typeof singleVerdictSchema>
export type Award = z.infer<typeof awardSchema>
