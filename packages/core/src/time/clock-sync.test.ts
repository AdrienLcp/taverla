import { describe, expect, it } from 'vitest'

import { estimateClockOffset, millisecondsUntil, serverNow } from './clock-sync'

/**
 * Builds the sample a device would record for a known truth: the server clock
 * runs `offsetMs` ahead of this device, and the round trip took `roundTripMs`
 * split evenly. Deriving the fixture from the answer is what makes the
 * assertions meaningful rather than restating the implementation.
 */
const sampleFor = ({
  clientSentAt,
  offsetMs,
  roundTripMs
}: {
  clientSentAt: number
  offsetMs: number
  roundTripMs: number
}) => ({
  clientReceivedAt: clientSentAt + roundTripMs,
  clientSentAt,
  serverTime: clientSentAt + roundTripMs / 2 + offsetMs
})

describe('estimateClockOffset', () => {
  it('[clock] recovers a known offset from a symmetric round trip', () => {
    const sample = sampleFor({
      clientSentAt: 1000,
      offsetMs: 4_500,
      roundTripMs: 40
    })

    expect(estimateClockOffset([sample])).toEqual({
      offsetMs: 4_500,
      roundTripMs: 40
    })
  })

  it('[clock] handles a device whose clock runs ahead of the server', () => {
    const sample = sampleFor({
      clientSentAt: 1000,
      offsetMs: -2_000,
      roundTripMs: 20
    })

    expect(estimateClockOffset([sample])?.offsetMs).toBe(-2_000)
  })

  // The reason the estimator picks a minimum instead of averaging: a congested
  // sample is asymmetric, and its error is larger than the fast sample's.
  it('[clock] keeps the fastest sample and ignores the congested ones', () => {
    const fast = sampleFor({
      clientSentAt: 1000,
      offsetMs: 500,
      roundTripMs: 12
    })
    const congested = {
      clientReceivedAt: 3_400,
      clientSentAt: 3_000,
      serverTime: 3_050
    }

    expect(estimateClockOffset([congested, fast, congested])).toEqual({
      offsetMs: 500,
      roundTripMs: 12
    })
  })

  it('[clock] discards a sample whose round trip went backwards', () => {
    const timeTravelled = {
      clientReceivedAt: 900,
      clientSentAt: 1000,
      serverTime: 1000
    }

    expect(estimateClockOffset([timeTravelled])).toBeNull()
  })

  it('[clock] reports nothing before the first exchange completes', () => {
    expect(estimateClockOffset([])).toBeNull()
  })
})

describe('serverNow', () => {
  it('[clock] shifts the local clock by the estimated offset', () => {
    expect(serverNow({ offsetMs: 250, roundTripMs: 10 }, 1_000)).toBe(1_250)
  })

  // Before the handshake lands, showing local time is the honest degradation:
  // countdowns are a few hundred milliseconds out instead of frozen.
  it('[clock] falls back to the local clock with no estimate yet', () => {
    expect(serverNow(null, 1_000)).toBe(1_000)
  })
})

describe('millisecondsUntil', () => {
  it('[clock] converts a server deadline into a local wait', () => {
    const estimate = { offsetMs: 5_000, roundTripMs: 10 }

    expect(millisecondsUntil(estimate, 9_000, 1_000)).toBe(3_000)
  })

  it('[clock] never asks a caller to wait a negative duration', () => {
    expect(
      millisecondsUntil({ offsetMs: 0, roundTripMs: 10 }, 500, 1_000)
    ).toBe(0)
  })
})
