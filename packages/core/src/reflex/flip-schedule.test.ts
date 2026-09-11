import { describe, expect, it } from 'vitest'

import {
  drawFlipDelayMs,
  MAX_FLIP_DELAY_MS,
  MIN_FLIP_DELAY_MS,
  PRESS_WINDOW_MS,
  reflexRoundDurationMs
} from './flip-schedule'

describe('drawing the wait before the flip', () => {
  const draws = Array.from({ length: 500 }, drawFlipDelayMs)

  it('[reflex] never draws outside the window', () => {
    expect(Math.min(...draws)).toBeGreaterThanOrEqual(MIN_FLIP_DELAY_MS)
    expect(Math.max(...draws)).toBeLessThanOrEqual(MAX_FLIP_DELAY_MS)
  })

  // A fixed wait is one a table counts out loud by the third round, so the
  // spread is the rule rather than an implementation detail of the draw.
  it('[reflex] spreads across the window rather than settling on one wait', () => {
    expect(new Set(draws).size).toBeGreaterThan(100)
  })
})

describe('how long a reflex round runs', () => {
  it('[reflex] gives the room the press window on top of its own wait', () => {
    expect(reflexRoundDurationMs(MIN_FLIP_DELAY_MS)).toBe(
      MIN_FLIP_DELAY_MS + PRESS_WINDOW_MS
    )
  })
})
