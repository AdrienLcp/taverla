import { createNodeWebSocket } from '@hono/node-ws'
import { Hono } from 'hono'

import { ROOM_SOCKET_ROUTE } from '@taverla/protocol/routes'

import { registerHttpRoutes } from '@/infrastructure/http/routes'
import { registerStaticSite } from '@/infrastructure/http/static-site'
import { createRoomSocketEvents } from '@/infrastructure/messaging/socket-handler'

/**
 * Returned rather than served: `injectWebSocket` needs the Node server the app
 * is later handed to, and a test wants the same wiring on an ephemeral port
 * without the process-level concerns `index.ts` owns.
 */
export const createApp = () => {
  const app = new Hono()
  const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app })

  app.get(
    ROOM_SOCKET_ROUTE,
    upgradeWebSocket((context) =>
      createRoomSocketEvents(context.req.param('code'))
    )
  )

  registerHttpRoutes(app)
  registerStaticSite(app)

  return { app, injectWebSocket }
}
