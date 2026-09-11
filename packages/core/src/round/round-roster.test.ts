import { describe, expect, it } from 'vitest'

import type { PlayerId } from '@taverla/protocol/identifiers'

import { RECONNECT_GRACE_MS } from '../room/seat-presence'
import { hasJoinedAfterStart, isExpectedInRound } from './round-roster'

const NOW = 1_700_000_000_000

const ANNA = 'anna' as PlayerId
const LATECOMER = 'latecomer' as PlayerId

const opened = new Set([ANNA])

const seated = (id: PlayerId) => ({
  disconnectedAt: null,
  id,
  isConnected: true
})

const away = (id: PlayerId, forMs: number) => ({
  disconnectedAt: NOW - forMs,
  id,
  isConnected: false
})

describe('round roster', () => {
  it('[roster] counts a player who arrived after the clip started as late', () => {
    expect(
      hasJoinedAfterStart({
        openedWithPlayerIds: opened,
        playerId: LATECOMER
      })
    ).toBe(true)
  })

  it('[roster] counts nobody as late while the countdown is still running', () => {
    expect(
      hasJoinedAfterStart({
        openedWithPlayerIds: null,
        playerId: LATECOMER
      })
    ).toBe(false)
  })

  it('[roster] does not hold the round open for a latecomer', () => {
    expect(
      isExpectedInRound({
        now: NOW,
        openedWithPlayerIds: opened,
        participant: seated(LATECOMER)
      })
    ).toBe(false)
  })

  it('[roster] waits for a player the round opened on', () => {
    expect(
      isExpectedInRound({
        now: NOW,
        openedWithPlayerIds: opened,
        participant: seated(ANNA)
      })
    ).toBe(true)
  })

  /**
   * The two reasons to stop waiting are independent, and a round that dropped
   * the roster check would still look right on a table where nobody's Wi-Fi
   * blinked.
   */
  it('[roster] stops waiting for a player of its own whose socket has gone', () => {
    expect(
      isExpectedInRound({
        now: NOW,
        openedWithPlayerIds: opened,
        participant: away(ANNA, RECONNECT_GRACE_MS)
      })
    ).toBe(false)
  })

  it('[roster] waits for everyone seated while the countdown is still running', () => {
    expect(
      isExpectedInRound({
        now: NOW,
        openedWithPlayerIds: null,
        participant: seated(LATECOMER)
      })
    ).toBe(true)
  })
})
