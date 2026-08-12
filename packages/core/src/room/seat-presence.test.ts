import { describe, expect, it } from 'vitest'

import {
  ABANDONED_SEAT_MS,
  isAbandoned,
  isStillExpected,
  RECONNECT_GRACE_MS
} from './seat-presence'

const NOW = 1_700_000_000_000

const away = (forMs: number) => ({
  disconnectedAt: NOW - forMs,
  isConnected: false
})

const here = { disconnectedAt: null, isConnected: true }

describe('seat presence', () => {
  it('[seat] waits for a phone whose network blinked mid-round', () => {
    expect(isStillExpected(away(3_000), NOW)).toBe(true)
  })

  it('[seat] stops waiting once coming straight back is no longer plausible', () => {
    expect(isStillExpected(away(RECONNECT_GRACE_MS), NOW)).toBe(false)
  })

  it('[seat] always waits for a live socket', () => {
    expect(isStillExpected(here, NOW)).toBe(true)
  })

  /**
   * The two thresholds answer different questions, and a player who is merely
   * slow to come back must never meet the second one.
   */
  it('[seat] does not give up a seat it is still waiting for', () => {
    expect(isAbandoned(away(RECONNECT_GRACE_MS - 1), NOW)).toBe(false)
  })

  it('[seat] gives up a seat nobody has been behind for the whole window', () => {
    expect(isAbandoned(away(ABANDONED_SEAT_MS), NOW)).toBe(true)
  })

  /** A bathroom break with the phone in a pocket must not cost a score. */
  it('[seat] keeps a seat through a break long enough to miss a round', () => {
    expect(isAbandoned(away(90_000), NOW)).toBe(false)
  })

  it('[seat] never gives up a seat somebody is sitting in', () => {
    expect(isAbandoned(here, NOW)).toBe(false)
  })
})
