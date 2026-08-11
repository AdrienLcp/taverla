import { describe, expect, it } from 'vitest'

import type { Verdict } from '@taverla/protocol/scoring'

import { isMiss, nothingScored, pointsFor, verdictKindFor } from './verdict'

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
    [halves(true, true), 2],
    [halves(true, false), 1],
    [halves(false, true), 1],
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
    expect(pointsFor({ isCorrect: true, kind: 'single' })).toBe(1)
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
