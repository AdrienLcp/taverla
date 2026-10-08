import { createServer } from 'node:http'

import { serve } from '@hono/node-server'

import { createApp } from '@/infrastructure/node/node-app'

import { harnessAt, type RoomHarness } from './room-harness'

/**
 * A process's first HTTP request through `fetch` or `WebSocket` sets up their
 * client — a second or more on an idle machine, every later one costs
 * milliseconds. Paid here, it falls on no test's clock.
 */
const warmHttpClient = async () => {
  const server = createServer((_request, response) => {
    response.end()
  })

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve)
  })

  const address = server.address()

  if (address === null || typeof address === 'string') {
    throw new Error('The warm-up server did not report a port')
  }

  await (await fetch(`http://127.0.0.1:${address.port}`)).arrayBuffer()
  server.closeAllConnections()
  await new Promise<void>((resolve) => {
    server.close(() => {
      resolve()
    })
  })
}

await warmHttpClient()

/**
 * The app is imported statically and the client warmed at the top level, so
 * both happen while vitest collects the suite, which no timeout covers. Paid
 * inside the first test's `beforeEach` and body instead, they took that test
 * past its budget whenever several suites booted on a busy machine.
 *
 * It lives apart from `room-harness.ts` because every `vi.mock` factory imports
 * the stubs from there: an app import in that file would load the mocked module
 * while its own factory waits on the harness, a cycle.
 */
export const startRoomHarness = async (): Promise<RoomHarness> => {
  const { app, websocket } = createApp()

  const started = await new Promise<ReturnType<typeof serve>>((resolve) => {
    const server = serve({ fetch: app.fetch, port: 0, websocket }, () => {
      resolve(server)
    })
  })

  const address = started.address()

  if (address === null || typeof address === 'string') {
    throw new Error('The test server did not report a port')
  }

  return harnessAt({
    origin: `localhost:${address.port}`,
    shutDown: async () => {
      if ('closeAllConnections' in started) {
        started.closeAllConnections()
      }

      await new Promise<void>((resolve) => {
        started.close(() => {
          resolve()
        })
      })
    }
  })
}
