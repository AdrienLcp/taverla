import { describe, expect, it } from 'vitest'

import { FALSE_START_FLOOR_MS, isFalseStart, reactionMsOf } from './reaction'

const FLIPS_AT = 1_700_000_000_000

describe('measuring a reaction', () => {
  it('[reflex] measures from the flip rather than from the round', () => {
    expect(reactionMsOf({ flipsAt: FLIPS_AT, tappedAt: FLIPS_AT + 218 })).toBe(
      218
    )
  })

  it('[reflex] goes negative for a tap that beat the flip', () => {
    expect(reactionMsOf({ flipsAt: FLIPS_AT, tappedAt: FLIPS_AT - 40 })).toBe(
      -40
    )
  })
})

describe('the false-start floor', () => {
  it('[reflex] refuses a tap that came before the screen flipped', () => {
    expect(isFalseStart({ flipsAt: FLIPS_AT, tappedAt: FLIPS_AT - 1 })).toBe(
      true
    )
  })

  // The whole point of the floor: `flipsAt` travels in advance, so a scripted
  // tap can land on it exactly. That one has to lose.
  it('[reflex] refuses a tap scheduled for the flip itself', () => {
    expect(isFalseStart({ flipsAt: FLIPS_AT, tappedAt: FLIPS_AT })).toBe(true)
  })

  it('[reflex] refuses a tap one millisecond short of the floor', () => {
    expect(
      isFalseStart({
        flipsAt: FLIPS_AT,
        tappedAt: FLIPS_AT + FALSE_START_FLOOR_MS - 1
      })
    ).toBe(true)
  })

  it('[reflex] accepts a tap on the floor', () => {
    expect(
      isFalseStart({
        flipsAt: FLIPS_AT,
        tappedAt: FLIPS_AT + FALSE_START_FLOOR_MS
      })
    ).toBe(false)
  })

  // The floor is set under the fastest human reaction on purpose, so it costs
  // an honest player nothing. A test on the number itself would restate it;
  // this asserts the property that justifies it.
  it('[reflex] accepts the fastest reaction a human actually has', () => {
    expect(isFalseStart({ flipsAt: FLIPS_AT, tappedAt: FLIPS_AT + 150 })).toBe(
      false
    )
  })
})
