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

/**
 * A label names an item on a tile, where a number would otherwise be drawn —
 * `🔴`, `B`, `Glass 3` — not a description. Counted in UTF-16 units, so one
 * flag or joined emoji spends several of them.
 */
export const SLATE_LABEL_MAX_LENGTH = 12

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

export const slateLabelSchema = z
  .string()
  .trim()
  .min(1)
  .max(SLATE_LABEL_MAX_LENGTH)

/** What a screen draws for an item: its label, or its 1-based number. */
export const slateItemLabel = ({
  itemIndex,
  labels
}: {
  itemIndex: number
  labels: readonly (string | null)[]
}): string => labels[itemIndex] ?? String(itemIndex + 1)

const labelIdentity = (label: string): string =>
  label.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ')

/**
 * The first position whose label, drawn, reads the same as an earlier one —
 * `null` when every item can be told apart. Checked over every position a
 * sheet may grow to, so an item added mid-sheet cannot arrive as the number
 * another item was labelled with.
 */
export const duplicateSlateLabelIndex = (
  labels: readonly (string | null)[]
): number | null => {
  const seen = new Set<string>()

  for (let itemIndex = 0; itemIndex < MAX_SLATE_ITEMS; itemIndex += 1) {
    const identity = labelIdentity(slateItemLabel({ itemIndex, labels }))

    if (seen.has(identity)) {
      return itemIndex
    }

    seen.add(identity)
  }

  return null
}

/**
 * One label per item index, `null` for an item drawn as its number. Public —
 * players need it to know what they are answering — so it travels in the
 * settings rather than beside the host's key. Defaults to none, which is also
 * what a setup stored before labels existed parses to.
 */
export const slateLabelsSchema = z
  .array(slateLabelSchema.nullable())
  .max(MAX_SLATE_ITEMS)
  .default([])
  .refine((labels) => duplicateSlateLabelIndex(labels) === null, {
    message: 'Two items would be drawn with the same label'
  })

/**
 * Where an item stands. `open` is writable on every sheet; `closed` is locked
 * and its answers are the wall's to judge; `marked` is closed and passed by
 * the wall at least once, which is when an answer nobody validated is wrong.
 */
export const slateItemStates = ['open', 'closed', 'marked'] as const
export const slateItemStateSchema = z.enum(slateItemStates)

/**
 * One line of the reader's own sheet. `verdict` is `null` until that line is
 * marked — its group judged, or the wall having moved past its item, which is
 * when an answer nobody validated becomes a wrong one — and stays `null` on an
 * item that closed before the reader held a seat.
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

/** Answers per player, as a count — the only thing the wall shows of an item still open. */
export const slateProgressSchema = z.object({
  filledCount: z.number().int().nonnegative(),
  playerId: playerIdSchema
})

export type SlateItemState = z.infer<typeof slateItemStateSchema>
export type SlateLine = z.infer<typeof slateLineSchema>
export type SlateAnswerGroup = z.infer<typeof slateAnswerGroupSchema>
export type SlateProgress = z.infer<typeof slateProgressSchema>
