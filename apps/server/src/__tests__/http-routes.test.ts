import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ApiErrorResponse } from '@taverla/protocol/http'
import { API_ROUTES } from '@taverla/protocol/routes'

import { ROOMS_BEFORE_RATE_LIMIT } from '@/infrastructure/node/node-app'

import { type RoomHarness, startRoomHarness } from './room-harness'

vi.mock('@/infrastructure/music/deezer-client', async () => {
  const { deezerClientStub } = await import('./room-harness')

  return deezerClientStub()
})

/** One over the allowance, which this file spends to the last room. */
const ATTEMPTS = ROOMS_BEFORE_RATE_LIMIT + 1

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
      const response = await fetch(
        `http://${harness.origin}${API_ROUTES.rooms}`,
        {
          body: JSON.stringify({ game: 'blindtest' }),
          headers: { 'content-type': 'application/json' },
          method: 'POST'
        }
      )

      statuses.push(response.status)

      if (response.status === 429) {
        lastBody = (await response.json()) as ApiErrorResponse
      }
    }

    expect(statuses.filter((status) => status === 201)).toHaveLength(
      ROOMS_BEFORE_RATE_LIMIT
    )
    expect(statuses.at(-1)).toBe(429)
    expect(lastBody?.code).toBe('rate_limited')
  })
})
