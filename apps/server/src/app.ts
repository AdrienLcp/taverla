import { upgradeWebSocket } from '@hono/node-server'
import { Hono } from 'hono'
import { WebSocketServer } from 'ws'

import { ROOM_SOCKET_ROUTE } from '@taverla/protocol/routes'

import { normalizeRoomCode } from '@taverla/core/room/room-code'

import { limitRoomCreation } from '@/infrastructure/http/rate-limit'
import { registerHttpRoutes } from '@/infrastructure/http/routes'
import { registerStaticSite } from '@/infrastructure/http/static-site'
import { createRoomSocketEvents } from '@/infrastructure/messaging/socket-handler'
import {
  findRoomEngine,
  inProcessRoomDoor
} from '@/infrastructure/node/in-process-rooms'
import { inProcessWallPairings } from '@/infrastructure/node/in-process-wall-pairings'

/**
 * Returned rather than served: `serve` needs the WebSocket server alongside
 * the app's fetch, and a test wants the same wiring on an ephemeral port
 * without the process-level concerns `index.ts` owns.
 */
export const createApp = () => {
  const app = new Hono()
  const websocket = { server: new WebSocketServer({ noServer: true }) }

  app.get(
    ROOM_SOCKET_ROUTE,
    upgradeWebSocket((context) =>
      createRoomSocketEvents(() => {
        const raw = context.req.param('code')
        const code = raw === undefined ? null : normalizeRoomCode(raw)

        return code === null ? null : findRoomEngine(code)
      })
    )
  )

  registerHttpRoutes({
    app,
    limitRoomCreation,
    rooms: inProcessRoomDoor,
    walls: inProcessWallPairings
  })
  registerStaticSite(app)

  return { app, websocket }
}
