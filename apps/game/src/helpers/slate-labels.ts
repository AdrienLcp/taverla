import type { RoomSettings } from '@taverla/protocol/room'
import { slateItemLabel } from '@taverla/protocol/slate'

const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' })

/**
 * The slate's labels as the room holds them now. They live in the settings
 * rather than on the round because they are edited while the sheets are open.
 */
export const slateLabelsOf = (
  settings: RoomSettings
): readonly (string | null)[] =>
  settings.game?.kind === 'slate' ? settings.game.labels : []

/**
 * Whether a label draws like a number — up to three glyphs, so `12`, `🔴` or
 * `B2` — or needs the narrower lettering a word does. Counted in what the eye
 * sees, because a flag is one glyph and four UTF-16 units.
 */
export const isShortLabel = (label: string): boolean =>
  [...graphemes.segment(label)].length <= 3

export type SlateItemName = {
  /** What a tile or a heading draws. */
  label: string
  /** Whether it draws at a number's size. */
  isShort: boolean
}

export const slateItemName = ({
  itemIndex,
  labels
}: {
  itemIndex: number
  labels: readonly (string | null)[]
}): SlateItemName => {
  const label = slateItemLabel({ itemIndex, labels })

  return { isShort: isShortLabel(label), label }
}

/**
 * The labels with one position set, trimmed, and `null` where it is left empty
 * — and nothing past the sheet's last item. A label left there by a longer
 * sheet has no box to be read or changed in, and would otherwise refuse a
 * label the host can see nowhere else as a duplicate.
 */
export const withSlateLabel = ({
  itemCount,
  itemIndex,
  label,
  labels
}: {
  itemCount: number
  itemIndex: number
  label: string
  labels: readonly (string | null)[]
}): (string | null)[] => {
  const next = Array.from(
    { length: itemCount },
    (_, index) => labels[index] ?? null
  )
  const trimmed = label.trim()

  next[itemIndex] = trimmed === '' ? null : trimmed

  while (next.length > 0 && next.at(-1) === null) {
    next.pop()
  }

  return next
}

/** Every position of a sheet, for a list that draws one row per item. */
export const slateItemIndexes = (itemCount: number): number[] =>
  Array.from({ length: itemCount }, (_, itemIndex) => itemIndex)
