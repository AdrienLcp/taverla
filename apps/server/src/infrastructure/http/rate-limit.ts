import type { MiddlewareHandler } from 'hono'

import type { ApiErrorResponse } from '@taverla/protocol/http'

/** The shape of the Workers Rate Limiting binding, so a test can stand in for it. */
export type RoomCreationLimiter = {
  limit: (options: { key: string }) => Promise<{ success: boolean }>
}

const tooManyRooms: ApiErrorResponse = {
  code: 'rate_limited',
  message: 'Too many rooms created from this address'
}

/**
 * The platform's counter rather than one process's: an isolate holds nothing
 * between two requests. Its window is a minute at most, so the limit is set in
 * `wrangler.jsonc` per minute rather than per ten.
 */
export const limitRoomCreationWith =
  (limiter: RoomCreationLimiter): MiddlewareHandler =>
  async (context, next) => {
    const { success } = await limiter.limit({
      key: context.req.header('CF-Connecting-IP') ?? 'unknown'
    })

    if (!success) {
      return context.json(tooManyRooms, 429)
    }

    await next()
  }
