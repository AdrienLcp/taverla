import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  apiErrorResponseSchema,
  createRoomResponseSchema
} from '@taverla/protocol/http'
import { API_ROUTES } from '@taverla/protocol/routes'

import { createHttpApp } from '@/infrastructure/http/http-app'
import {
  createApp,
  ROOMS_BEFORE_RATE_LIMIT
} from '@/infrastructure/node/node-app'

/** One over the allowance, which the rate-limit test spends to the last room. */
const ATTEMPTS = ROOMS_BEFORE_RATE_LIMIT + 1

const postJson = (body: string) => ({
  body,
  headers: { 'content-type': 'application/json' },
  method: 'POST'
})

describe('http routes', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('[http] opens a room for a valid request', async () => {
    const { app } = createApp()

    const response = await app.request(
      API_ROUTES.rooms,
      postJson(JSON.stringify({ game: 'blindtest' }))
    )

    expect(response.status).toBe(201)
    expect(
      createRoomResponseSchema.safeParse(await response.json()).success
    ).toBe(true)
  })

  it('[http] refuses a body its schema rejects with invalid_input', async () => {
    const { app } = createApp()

    const response = await app.request(
      API_ROUTES.rooms,
      postJson(JSON.stringify({ game: 'chess' }))
    )

    expect(response.status).toBe(400)
    expect(apiErrorResponseSchema.parse(await response.json()).code).toBe(
      'invalid_input'
    )
  })

  it('[http] refuses a body that is not JSON with invalid_input', async () => {
    const { app } = createApp()

    const response = await app.request(API_ROUTES.rooms, postJson('{"game":'))

    expect(response.status).toBe(400)
    expect(apiErrorResponseSchema.parse(await response.json()).code).toBe(
      'invalid_input'
    )
  })

  it('[http] answers an unknown path with not_found', async () => {
    const { app } = createApp()

    const response = await app.request('/api/nothing-here')

    expect(response.status).toBe(404)
    expect(apiErrorResponseSchema.parse(await response.json()).code).toBe(
      'not_found'
    )
  })

  it('[http] answers a throw with internal_error and logs it once', async () => {
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {})
    const app = createHttpApp()

    app.get('/throws', () => {
      throw new Error('The handler broke')
    })

    const response = await app.request('/throws')

    expect(response.status).toBe(500)
    expect(apiErrorResponseSchema.parse(await response.json()).code).toBe(
      'internal_error'
    )
    expect(errorLog).toHaveBeenCalledTimes(1)
    expect(String(errorLog.mock.calls[0]?.[0])).toContain('The handler broke')
  })

  it('[rate-limit] stops one address from draining the room codes', async () => {
    const { app } = createApp()
    const responses: Response[] = []

    for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
      responses.push(
        await app.request(
          API_ROUTES.rooms,
          postJson(JSON.stringify({ game: 'blindtest' }))
        )
      )
    }

    const statuses = responses.map((response) => response.status)
    const refused = responses.at(-1)

    expect(statuses.filter((status) => status === 201)).toHaveLength(
      ROOMS_BEFORE_RATE_LIMIT
    )
    expect(refused?.status).toBe(429)
    expect(apiErrorResponseSchema.parse(await refused?.json()).code).toBe(
      'rate_limited'
    )
  })
})
