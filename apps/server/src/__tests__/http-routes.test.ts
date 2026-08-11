import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ApiErrorResponse } from '@taverla/protocol/http'

import { type RoomHarness, startRoomHarness } from './room-harness'

vi.mock('@/infrastructure/music/deezer-client', async () => {
  const { deezerClientStub } = await import('./room-harness')

  return deezerClientStub()
})

/**
 * One over the window's allowance. The limiter counts per process, so this file
 * spends the whole budget on purpose and must stay the only suite that does.
 */
const ATTEMPTS = 31

describe('http routes', () => {
  let harness: RoomHarness

  beforeEach(async () => {
    harness = await startRoomHarness()
  })

  afterEach(async () => {
    await harness.stop()
  })

  it('[rate-limit] stops one address from draining the room codes', async () => {
    const statuses: number[] = []
    let lastBody: ApiErrorResponse | null = null

    for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
      const response = await fetch(`http://${harness.origin}/api/rooms`, {
        method: 'POST'
      })

      statuses.push(response.status)

      if (response.status === 429) {
        lastBody = (await response.json()) as ApiErrorResponse
      }
    }

    expect(statuses.filter((status) => status === 201)).toHaveLength(30)
    expect(statuses.at(-1)).toBe(429)
    expect(lastBody?.code).toBe('rate_limited')
  })
})
