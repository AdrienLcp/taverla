import { describe, expect, it } from 'vitest'

import {
  closedItem,
  filledCountsPerItem,
  filledLineCount,
  type ItemMarking,
  itemVerdictFor,
  lineVerdict,
  OPEN_ITEM,
  type SheetItem,
  sheetPoints,
  slateItemStateOf,
  UNMARKED_ITEM
} from './sheet-marking'

const ANA = 'ana'
const BO = 'bo'

const marked = ({
  judged,
  passed = false
}: {
  judged: Record<string, boolean>
  passed?: boolean
}): ItemMarking => ({ judged: new Map(Object.entries(judged)), passed })

const closedFor = (
  marking: ItemMarking,
  roster: readonly string[] = [ANA]
): SheetItem => ({ marking, roster: new Set(roster), state: 'closed' })

describe('lineVerdict', () => {
  it('[slate] owes no verdict before the host has said anything', () => {
    expect(lineVerdict({ answer: 'sel', marking: UNMARKED_ITEM })).toBeNull()
  })

  it('[slate] takes the verdict of the group the line falls in', () => {
    const marking = marked({ judged: { paprika: true } })

    expect(lineVerdict({ answer: 'Le Paprika', marking })).toBe(true)
  })

  it('[slate] marks an answer nobody validated wrong once the wall moves on', () => {
    const marking = marked({ judged: { paprika: true }, passed: true })

    expect(lineVerdict({ answer: 'sel', marking })).toBe(false)
    expect(lineVerdict({ answer: null, marking })).toBe(false)
  })

  // Nothing forged on a host socket can pay a blank: it has no group key for a
  // verdict to be filed under in the first place.
  it('[slate] never pays a blank, whatever is filed under an empty key', () => {
    const marking = marked({ judged: { '': true }, passed: true })

    expect(lineVerdict({ answer: '  ', marking })).toBe(false)
  })
})

describe('sheetPoints', () => {
  it('[slate] pays one point per validated line', () => {
    const sheet = new Map([
      [0, 'sel'],
      [1, 'paprika'],
      [2, 'oignon']
    ])

    expect(
      sheetPoints({
        items: [
          closedFor(marked({ judged: { sel: true } })),
          closedFor(marked({ judged: { paprika: false } })),
          closedFor(marked({ judged: { oignon: true } }))
        ],
        playerId: ANA,
        sheet
      })
    ).toBe(2)
  })

  // Recomputed rather than accumulated: a verdict taken back takes its point
  // with it.
  it('[slate] follows a verdict the host changed', () => {
    const sheet = new Map([[0, 'sel']])

    expect(
      sheetPoints({
        items: [closedFor(marked({ judged: { sel: true } }))],
        playerId: ANA,
        sheet
      })
    ).toBe(1)
    expect(
      sheetPoints({
        items: [closedFor(marked({ judged: { sel: false } }))],
        playerId: ANA,
        sheet
      })
    ).toBe(0)
  })

  // A latecomer's line on an item that closed before they sat down was never
  // on the wall, whatever the group it would have fallen in was paid.
  it('[slate] pays only the items the player was seated for when they closed', () => {
    const sheet = new Map([
      [0, 'sel'],
      [1, 'sel']
    ])
    const items = [
      closedFor(marked({ judged: { sel: true } }), [ANA]),
      closedFor(marked({ judged: { sel: true } }), [ANA, BO])
    ]

    expect(sheetPoints({ items, playerId: BO, sheet })).toBe(1)
    expect(sheetPoints({ items, playerId: ANA, sheet })).toBe(2)
  })
})

describe('itemVerdictFor', () => {
  it('[slate] owes no verdict on an item still open', () => {
    expect(
      itemVerdictFor({ answer: 'sel', item: OPEN_ITEM, playerId: ANA })
    ).toBeNull()
  })

  it('[slate] owes none to a player seated after the item closed', () => {
    const item = closedFor(marked({ judged: {}, passed: true }), [ANA])

    expect(itemVerdictFor({ answer: null, item, playerId: BO })).toBeNull()
    expect(itemVerdictFor({ answer: null, item, playerId: ANA })).toBe(false)
  })
})

describe('slateItemStateOf', () => {
  it('[slate] reads open, closed, then marked once the wall has passed it', () => {
    expect(slateItemStateOf(OPEN_ITEM)).toBe('open')
    expect(slateItemStateOf(closedItem(new Set([ANA])))).toBe('closed')
    expect(
      slateItemStateOf(closedFor(marked({ judged: {}, passed: true })))
    ).toBe('marked')
  })
})

describe('filledLineCount', () => {
  it('[slate] counts the lines with something in them', () => {
    expect(
      filledLineCount(
        new Map([
          [0, 'sel'],
          [3, '  '],
          [7, 'oignon']
        ])
      )
    ).toBe(2)
  })
})

describe('filledCountsPerItem', () => {
  it('[slate] counts, per item, the sheets with something written on it', () => {
    expect(
      filledCountsPerItem({
        itemCount: 3,
        sheets: [
          new Map([
            [0, 'sel'],
            [2, ' ']
          ]),
          new Map([
            [0, 'poivre'],
            [1, 'oignon'],
            [5, 'hors feuille']
          ])
        ]
      })
    ).toEqual([2, 1, 0])
  })
})
