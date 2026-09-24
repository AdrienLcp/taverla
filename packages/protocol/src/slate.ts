import { z } from 'zod'

import { playerIdSchema } from './identifiers'

export const MIN_SLATE_ITEMS = 1

/** Twenty-six is the chip tasting that asked for the game; sixty leaves room for a quiz on paper. */
export const MAX_SLATE_ITEMS = 60

/**
 * One line of a sheet is something written about a cup in the hand, not an
 * essay, and it is read back off the wall at the correction.
 */
export const SLATE_ANSWER_MAX_LENGTH = 80

/** A memo for the host, read on the wall at that item's correction. */
export const SLATE_KEY_MAX_LENGTH = 80

export const slateItemCountSchema = z
  .number()
  .int()
  .min(MIN_SLATE_ITEMS)
  .max(MAX_SLATE_ITEMS)

/** 0-based; a screen adds one to draw the number on the cup. */
export const slateItemIndexSchema = z
  .number()
  .int()
  .nonnegative()
  .max(MAX_SLATE_ITEMS - 1)

/**
 * What a line says, or what a key says. Trimmed on arrival, and empty is not
 * refused: an empty line is how a player takes an answer back, and an empty key
 * is how the host clears a memo.
 */
export const slateAnswerSchema = z.string().trim().max(SLATE_ANSWER_MAX_LENGTH)

export const slateKeySchema = z.string().trim().max(SLATE_KEY_MAX_LENGTH)

/**
 * One line of the reader's own sheet. `verdict` is `null` until that line is
 * marked — its group judged, or the correction having moved past its item,
 * which is when an answer nobody validated becomes a wrong one.
 */
export const slateLineSchema = z.object({
  answer: z.string().nullable(),
  verdict: z.boolean().nullable()
})

/**
 * Every player who wrote the same thing on one item, after the shared
 * normalisation — so one tap validates every *paprika*. `key` is that
 * normalised form and is what `host.judgeGroup` names; `text` is the spelling
 * most of them used, for the wall.
 *
 * A blank line is never a group: it cannot be validated, so there is nothing
 * to name.
 */
export const slateAnswerGroupSchema = z.object({
  isCorrect: z.boolean().nullable(),
  key: z.string().min(1),
  playerIds: z.array(playerIdSchema),
  text: z.string()
})

/** Answers per player, as a count — the only thing the wall may show before the sheets are collected. */
export const slateProgressSchema = z.object({
  filledCount: z.number().int().nonnegative(),
  playerId: playerIdSchema
})

export type SlateLine = z.infer<typeof slateLineSchema>
export type SlateAnswerGroup = z.infer<typeof slateAnswerGroupSchema>
export type SlateProgress = z.infer<typeof slateProgressSchema>
