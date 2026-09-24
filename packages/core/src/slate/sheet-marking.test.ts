import { describe, expect, it } from 'vitest'

import {
  filledLineCount,
  type ItemMarking,
  lineVerdict,
  sheetPoints,
  UNMARKED_ITEM
} from './sheet-marking'

const marked = ({
  judged,
  passed = false
}: {
  judged: Record<string, boolean>
  passed?: boolean
}): ItemMarking => ({ judged: new Map(Object.entries(judged)), passed })

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
        markings: [
          marked({ judged: { sel: true } }),
          marked({ judged: { paprika: false } }),
          marked({ judged: { oignon: true } })
        ],
        sheet
      })
    ).toBe(2)
  })

  // Recomputed rather than accumulated: a verdict taken back takes its point
  // with it.
  it('[slate] follows a verdict the host changed', () => {
    const sheet = new Map([[0, 'sel']])

    expect(
      sheetPoints({ markings: [marked({ judged: { sel: true } })], sheet })
    ).toBe(1)
    expect(
      sheetPoints({ markings: [marked({ judged: { sel: false } })], sheet })
    ).toBe(0)
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
