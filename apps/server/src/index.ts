import { serve } from '@hono/node-server'

import { createApp } from '@/app'
import { startRoomSweeper } from '@/domain/room/room-store'
import { env } from '@/env'
import { logger } from '@/infrastructure/logging/logger'
import { hasConnections } from '@/infrastructure/messaging/connection-registry'
import { startSeatSweeper } from '@/infrastructure/messaging/round-conductor'

const { app, injectWebSocket } = createApp()

const server = serve({ fetch: app.fetch, port: env.PORT }, ({ port }) => {
  logger.info(`Taverla server listening on http://localhost:${port}`)
})

injectWebSocket(server)
startRoomSweeper(hasConnections)
startSeatSweeper()
