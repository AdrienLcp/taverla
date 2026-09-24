import { describe, expect, it } from 'vitest'

import { gameSettingsSchema } from './game'
import { duplicateSlateLabelIndex, slateLabelsSchema } from './slate'

describe('duplicateSlateLabelIndex', () => {
  it('[slate-labels] tells apart numbers, letters and emoji', () => {
    expect(duplicateSlateLabelIndex([])).toBeNull()
    expect(duplicateSlateLabelIndex(['🔴', 'B', null, 'Glass 3'])).toBeNull()
  })

  it('[slate-labels] reads case and spacing as the same label', () => {
    expect(duplicateSlateLabelIndex(['Glass 3', 'glass  3'])).toBe(1)
  })

  // A tile drawn "2" must be item 2, or a room reading the tiles aloud has
  // two of them.
  it('[slate-labels] refuses a number that another item is drawn as', () => {
    expect(duplicateSlateLabelIndex(['2'])).toBe(1)
    expect(duplicateSlateLabelIndex([null, '2'])).toBeNull()
  })
})

describe('slateLabelsSchema', () => {
  it('[slate-labels] refuses a label too long for a tile, and a blank one', () => {
    expect(slateLabelsSchema.safeParse(['x'.repeat(13)]).success).toBe(false)
    expect(slateLabelsSchema.safeParse(['   ']).success).toBe(false)
  })

  it('[slate-labels] parses a setup stored before labels existed', () => {
    expect(gameSettingsSchema.parse({ itemCount: 26, kind: 'slate' })).toEqual({
      itemCount: 26,
      kind: 'slate',
      labels: []
    })
  })
})
