import { getConnInfo } from '@hono/node-server/conninfo'
import type { Context } from 'hono'
import { rateLimiter } from 'hono-rate-limiter'

import type { ApiErrorResponse } from '@taverla/protocol/http'

/**
 * Wide enough that a household hosting game after game never meets it, narrow
 * enough that one address cannot drain the code space: a room nobody joins is
 * swept ten minutes after it is made, so this bounds how many can pile up
 * inside that window. `drawUnusedCode` giving up is the failure being avoided,
 * not the memory.
 */
const ROOM_CREATION_WINDOW_MS = 10 * 60 * 1000
const ROOMS_PER_WINDOW = 30

const tooManyRooms: ApiErrorResponse = {
  code: 'rate_limited',
  message: 'Too many rooms created from this address'
}

/**
 * A proxied deployment has nothing better than `x-forwarded-for`, and a client
 * writes whatever it likes into it — so this counts accidents and loops, not
 * somebody who means it. The sweeper is the real bound.
 */
const clientAddress = (context: Context): string => {
  const [forwarded] = context.req.header('x-forwarded-for')?.split(',') ?? []
  const forwardedClient = forwarded?.trim()

  if (forwardedClient !== undefined && forwardedClient.length > 0) {
    return forwardedClient
  }

  return getConnInfo(context).remote.address ?? 'unknown'
}

export const limitRoomCreation = rateLimiter({
  keyGenerator: clientAddress,
  limit: ROOMS_PER_WINDOW,
  message: tooManyRooms,
  standardHeaders: 'draft-7',
  statusCode: 429,
  windowMs: ROOM_CREATION_WINDOW_MS
})
