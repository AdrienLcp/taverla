import { serve } from '@hono/node-server'
import { createNodeWebSocket } from '@hono/node-ws'
import { Hono } from 'hono'

import { startRoomSweeper } from '@/domain/room/room-store'
import { env } from '@/env'
import { registerHttpRoutes } from '@/infrastructure/http/routes'
import { logger } from '@/infrastructure/logging/logger'
import { hasConnections } from '@/infrastructure/messaging/connection-registry'
import { createRoomSocketEvents } from '@/infrastructure/messaging/socket-handler'

const app = new Hono()

// `createNodeWebSocket` needs the app to register its upgrade middleware, and
// `injectWebSocket` needs the server the app is later served with — which is
// why the wiring lives here rather than inside either module.
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app })

app.get(
  '/ws/rooms/:code',
  upgradeWebSocket((context) =>
    createRoomSocketEvents(context.req.param('code'))
  )
)

registerHttpRoutes(app)

const server = serve({ fetch: app.fetch, port: env.PORT }, ({ port }) => {
  logger.info(`Blind test server listening on http://localhost:${port}`)
})

injectWebSocket(server)
startRoomSweeper(hasConnections)
