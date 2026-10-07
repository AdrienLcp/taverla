import { upgradeWebSocket } from '@hono/node-server'
import { WebSocketServer } from 'ws'

import { ROOM_SOCKET_ROUTE } from '@taverla/protocol/routes'

import { normalizeRoomCode } from '@taverla/core/room/room-code'

import { createHttpApp } from '@/infrastructure/http/http-app'
import { limitRoomCreationWith } from '@/infrastructure/http/rate-limit'
import { registerHttpRoutes } from '@/infrastructure/http/routes'
import { createRoomSocketEvents } from '@/infrastructure/messaging/socket-handler'
import { inProcessRoomCreationLimiter } from '@/infrastructure/node/in-process-rate-limit'
import {
  findRoomEngine,
  inProcessRoomDoor
} from '@/infrastructure/node/in-process-rooms'
import { inProcessWallPairings } from '@/infrastructure/node/in-process-wall-pairings'

/** What `http-routes.test.ts` spends to the last room before it is refused. */
export const ROOMS_BEFORE_RATE_LIMIT = 30

/**
 * The engine on one Node process, which is what the socket suites run: their
 * `vi.mock` of the music client and the question bank only reaches code in the
 * test's own process. Nothing deploys it — production is `worker.ts`.
 */
export const createApp = () => {
  const app = createHttpApp()
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
    limitRoomCreation: limitRoomCreationWith(
      inProcessRoomCreationLimiter(ROOMS_BEFORE_RATE_LIMIT)
    ),
    rooms: inProcessRoomDoor,
    walls: inProcessWallPairings
  })

  return { app, websocket }
}
