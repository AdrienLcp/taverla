import type { PlayerId } from '@taverla/protocol/identifiers'
import type { SlateItemState } from '@taverla/protocol/slate'

import { pointsFor } from '../scoring/verdict'
import { answerGroupKey, isBlankAnswer } from './answer-groups'

/**
 * How far one item's marking has gone. `judged` holds the host's verdicts by
 * group key, and `passed` is whether the wall has moved off the item at least
 * once — which is the moment an answer nobody validated becomes wrong.
 */
export type ItemMarking = {
  judged: ReadonlyMap<string, boolean>
  passed: boolean
}

/**
 * One item of the sheet. A closed item carries who held a seat when it
 * closed: they are the ones marked on it, and a player seated later was never
 * asked it.
 */
export type SheetItem =
  | { state: 'open' }
  | { marking: ItemMarking; roster: ReadonlySet<PlayerId>; state: 'closed' }

export const UNMARKED_ITEM: ItemMarking = { judged: new Map(), passed: false }

export const OPEN_ITEM: SheetItem = { state: 'open' }

export const closedItem = (roster: ReadonlySet<PlayerId>): SheetItem => ({
  marking: UNMARKED_ITEM,
  roster,
  state: 'closed'
})

export const slateItemStateOf = (item: SheetItem): SlateItemState => {
  if (item.state === 'open') {
    return 'open'
  }

  return item.marking.passed ? 'marked' : 'closed'
}

/**
 * One line's verdict, and `null` while it is still owed one: its group has not
 * been judged and the wall is still on its item, or has not reached it yet.
 * A blank is never right — it is wrong the moment its item is passed.
 */
export const lineVerdict = ({
  answer,
  marking
}: {
  answer: string | null
  marking: ItemMarking
}): boolean | null => {
  const judged =
    answer === null || isBlankAnswer(answer)
      ? undefined
      : marking.judged.get(answerGroupKey(answer))

  if (judged !== undefined) {
    return judged
  }

  return marking.passed ? false : null
}

/** `null` on an item still open, and on one the player was not seated for when it closed. */
export const itemVerdictFor = ({
  answer,
  item,
  playerId
}: {
  answer: string | null
  item: SheetItem
  playerId: PlayerId
}): boolean | null =>
  item.state === 'closed' && item.roster.has(playerId)
    ? lineVerdict({ answer, marking: item.marking })
    : null

/**
 * What a sheet has earned so far: one claim per validated line, priced as a
 * `single` verdict is everywhere else on the shelf. It is recomputed rather
 * than accumulated, because a verdict can be taken back.
 */
export const sheetPoints = ({
  items,
  playerId,
  sheet
}: {
  items: readonly SheetItem[]
  playerId: PlayerId
  sheet: ReadonlyMap<number, string>
}): number =>
  items.reduce(
    (total, item, itemIndex) =>
      total +
      pointsFor({
        isCorrect:
          itemVerdictFor({
            answer: sheet.get(itemIndex) ?? null,
            item,
            playerId
          }) === true,
        kind: 'single'
      }),
    0
  )

/** Lines with something in them — the count the wall may show of a sheet still being written. */
export const filledLineCount = (sheet: ReadonlyMap<number, string>): number =>
  [...sheet.values()].filter((answer) => !isBlankAnswer(answer)).length

/**
 * How many sheets have something on each item — what tells the host an item
 * everyone has answered is ready to close, without saying what anyone wrote.
 */
export const filledCountsPerItem = ({
  itemCount,
  sheets
}: {
  itemCount: number
  sheets: Iterable<ReadonlyMap<number, string>>
}): number[] => {
  const counts = Array.from({ length: itemCount }, () => 0)

  for (const sheet of sheets) {
    for (const [itemIndex, answer] of sheet) {
      if (itemIndex < itemCount && !isBlankAnswer(answer)) {
        counts[itemIndex] = (counts[itemIndex] ?? 0) + 1
      }
    }
  }

  return counts
}
