import { describe, expect, it } from 'vitest'

import { isGameInPlay, isRoundInPlay } from './room-phase'

describe('isRoundInPlay', () => {
  it('[room-phase] counts the countdown, because the round is already built', () => {
    expect(isRoundInPlay('countdown')).toBe(true)
    expect(isRoundInPlay('playing')).toBe(true)
    expect(isRoundInPlay('buzzed')).toBe(true)
  })

  // The slate's scores still move while it is corrected, so a game switched
  // under the correction would leave the wall marking a sheet nobody holds.
  it('[room-phase] counts the correction, whose scores are still moving', () => {
    expect(isRoundInPlay('correcting')).toBe(true)
  })

  it('[room-phase] leaves the gaps a host may change things in', () => {
    expect(isRoundInPlay('lobby')).toBe(false)
    expect(isRoundInPlay('revealed')).toBe(false)
    expect(isRoundInPlay('finished')).toBe(false)
  })
})

describe('isGameInPlay', () => {
  it('[room-phase] counts a reveal, which is a game with a round left to open', () => {
    expect(isGameInPlay('countdown')).toBe(true)
    expect(isGameInPlay('playing')).toBe(true)
    expect(isGameInPlay('buzzed')).toBe(true)
    expect(isGameInPlay('voting')).toBe(true)
    expect(isGameInPlay('revealed')).toBe(true)
  })

  it('[room-phase] leaves the two phases with no game to end', () => {
    expect(isGameInPlay('lobby')).toBe(false)
    expect(isGameInPlay('finished')).toBe(false)
  })
})
