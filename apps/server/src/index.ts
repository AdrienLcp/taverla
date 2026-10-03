/**
 * First, and before every other import: the compiler is installed on Zod's
 * global config, so only the schemas constructed after it runs are compiled.
 *
 * The browser deliberately does not get it. `broadcastRoom` encodes the room
 * view once per connection, which is where 15 microseconds a frame becoming 3
 * is worth having; a player's screen decodes one frame per state change, and
 * the compiler costs 8 KB gzipped on the chunk that gates joining a room.
 */
import 'zod/compile'

import { serve } from '@hono/node-server'

import { createApp } from '@/app'
import { env } from '@/env'
import { logger } from '@/infrastructure/logging/logger'

const { app, websocket } = createApp()

serve({ fetch: app.fetch, port: env.PORT, websocket }, ({ port }) => {
  logger.info(`Taverla server listening on http://localhost:${port}`)
})
