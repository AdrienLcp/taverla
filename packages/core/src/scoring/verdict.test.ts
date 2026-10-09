import { describe, expect, it } from 'vitest'

import { POINT, type Verdict } from '@taverla/protocol/scoring'

import {
  isFullyBanked,
  isMiss,
  nothingScored,
  pointsFor,
  pointsForSimultaneousAnswer,
  verdictKindFor
} from './verdict'

describe('verdictKindFor', () => {
  // The whole reason the verdict is a union. A bare claim judged as halves pays
  // two points for guessing one charade, which is the blind test's price for an
  // answer that has two parts to get.
  it('[verdict] judges a game with nothing to split as one claim', () => {
    expect(verdictKindFor('buzzer')).toBe('single')
    expect(verdictKindFor('blindtest')).toBe('halves')
  })
})

const halves = (titleCorrect: boolean, artistCorrect: boolean): Verdict => ({
  artistCorrect,
  kind: 'halves',
  titleCorrect
})

describe('pointsFor', () => {
  it.each([
    [halves(true, true), 2 * POINT],
    [halves(true, false), POINT],
    [halves(false, true), POINT],
    [halves(false, false), 0]
  ])(
    '[verdict] scores each half of the answer independently',
    (given, expected) => {
      expect(pointsFor(given)).toBe(expected)
    }
  )

  // A charade is one thing to guess. Judging it in halves would pay it twice,
  // which is what the union exists to make impossible.
  it('[verdict] pays a bare claim once', () => {
    expect(pointsFor({ isCorrect: true, kind: 'single' })).toBe(POINT)
    expect(pointsFor({ isCorrect: false, kind: 'single' })).toBe(0)
  })
})

describe('isMiss', () => {
  it('[verdict] reads a scoreless verdict of either shape as the lockout', () => {
    expect(isMiss(nothingScored('buzzer'))).toBe(true)
    expect(isMiss(nothingScored('blindtest'))).toBe(true)
    expect(isMiss({ isCorrect: true, kind: 'single' })).toBe(false)
  })
})

describe('isFullyBanked', () => {
  // What closes typed mode for a player. Half an answer leaves the round open
  // to them, and one claim is finished the moment it is right.
  it('[verdict] wants both halves, and one claim only once', () => {
    expect(isFullyBanked(halves(true, true))).toBe(true)
    expect(isFullyBanked(halves(true, false))).toBe(false)
    expect(isFullyBanked({ isCorrect: true, kind: 'single' })).toBe(true)
    expect(isFullyBanked({ isCorrect: false, kind: 'single' })).toBe(false)
  })
})

describe('pointsForSimultaneousAnswer', () => {
  /**
   * The gap the two modes exist to open, and it has to read the same in every
   * game: producing the answer from nothing is not the act of recognising it
   * among four. A room paid the same for both stops using the hard one.
   */
  it('[verdict] pays a typed claim three where a pick pays one', () => {
    const verdict = { isCorrect: true, kind: 'single' } as const

    expect(pointsForSimultaneousAnswer({ mode: 'typed', verdict })).toBe(
      3 * POINT
    )
    expect(pointsForSimultaneousAnswer({ mode: 'choice', verdict })).toBe(POINT)
  })

  it('[verdict] pays a wrong claim nothing, whichever way it was given', () => {
    const verdict = { isCorrect: false, kind: 'single' } as const

    expect(pointsForSimultaneousAnswer({ mode: 'typed', verdict })).toBe(0)
    expect(pointsForSimultaneousAnswer({ mode: 'choice', verdict })).toBe(0)
  })

  // The blind test arrives at the same three by another road, which is the
  // point: a point per half, and one more for holding the pair.
  it('[verdict] pays the pair three, and half of it one', () => {
    expect(
      pointsForSimultaneousAnswer({
        mode: 'typed',
        verdict: halves(true, true)
      })
    ).toBe(3 * POINT)
    expect(
      pointsForSimultaneousAnswer({
        mode: 'typed',
        verdict: halves(true, false)
      })
    ).toBe(POINT)
  })

  // A pick is the whole answer or nothing, so half-credit has no meaning there.
  it('[verdict] pays a right pick one, and never half of it', () => {
    expect(
      pointsForSimultaneousAnswer({
        mode: 'choice',
        verdict: halves(true, true)
      })
    ).toBe(POINT)
    expect(
      pointsForSimultaneousAnswer({
        mode: 'choice',
        verdict: halves(false, false)
      })
    ).toBe(0)
  })
})
