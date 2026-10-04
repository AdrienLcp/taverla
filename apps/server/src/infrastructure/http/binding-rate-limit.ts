import { env } from 'cloudflare:workers'
import type { MiddlewareHandler } from 'hono'

import type { ApiErrorResponse } from '@taverla/protocol/http'

const tooManyRooms: ApiErrorResponse = {
  code: 'rate_limited',
  message: 'Too many rooms created from this address'
}

/**
 * The platform's counter rather than one process's: an isolate holds nothing
 * between two requests. Its window is a minute at most, so the limit is set in
 * `wrangler.jsonc` per minute rather than per ten.
 */
export const limitRoomCreationByBinding: MiddlewareHandler = async (
  context,
  next
) => {
  const { success } = await env.ROOM_CREATION_LIMITER.limit({
    key: context.req.header('CF-Connecting-IP') ?? 'unknown'
  })

  if (!success) {
    return context.json(tooManyRooms, 429)
  }

  await next()
}
