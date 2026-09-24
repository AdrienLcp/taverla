import { pointsFor } from '../scoring/verdict'
import { answerGroupKey, isBlankAnswer } from './answer-groups'

/**
 * How far one item's correction has gone. `judged` holds the host's verdicts
 * by group key, and `passed` is whether the wall has moved off the item at
 * least once — which is the moment an answer nobody validated becomes wrong.
 */
export type ItemMarking = {
  judged: ReadonlyMap<string, boolean>
  passed: boolean
}

export const UNMARKED_ITEM: ItemMarking = { judged: new Map(), passed: false }

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

/**
 * What a sheet has earned so far: one claim per validated line, priced as a
 * `single` verdict is everywhere else on the shelf. It is recomputed rather
 * than accumulated, because a verdict can be taken back.
 */
export const sheetPoints = ({
  markings,
  sheet
}: {
  markings: readonly ItemMarking[]
  sheet: ReadonlyMap<number, string>
}): number =>
  markings.reduce(
    (total, marking, itemIndex) =>
      total +
      pointsFor({
        isCorrect:
          lineVerdict({ answer: sheet.get(itemIndex) ?? null, marking }) ===
          true,
        kind: 'single'
      }),
    0
  )

/** Lines with something in them — the count the wall may show while the sheets are open. */
export const filledLineCount = (sheet: ReadonlyMap<number, string>): number =>
  [...sheet.values()].filter((answer) => !isBlankAnswer(answer)).length
