import { describe, expect, it } from 'vitest'

import { isRoundInPlay } from './room-phase'

describe('isRoundInPlay', () => {
  it('[room-phase] counts the countdown, because the round is already built', () => {
    expect(isRoundInPlay('countdown')).toBe(true)
    expect(isRoundInPlay('playing')).toBe(true)
    expect(isRoundInPlay('buzzed')).toBe(true)
  })

  it('[room-phase] leaves the gaps a host may change things in', () => {
    expect(isRoundInPlay('lobby')).toBe(false)
    expect(isRoundInPlay('revealed')).toBe(false)
    expect(isRoundInPlay('finished')).toBe(false)
  })
})
