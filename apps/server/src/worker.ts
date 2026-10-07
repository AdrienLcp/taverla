import { env } from 'cloudflare:workers'

import { ROOM_SOCKET_ROUTE } from '@taverla/protocol/routes'

import { normalizeRoomCode } from '@taverla/core/room/room-code'

import { createHttpApp } from '@/infrastructure/http/http-app'
import { limitRoomCreationWith } from '@/infrastructure/http/rate-limit'
import { registerHttpRoutes } from '@/infrastructure/http/routes'
import {
  PRERENDER_MANIFEST,
  prerenderManifestSchema,
  robotsTxt,
  sitemapXml
} from '@/infrastructure/http/site-index'
import {
  durableRoomDoor,
  durableWallPairings,
  roomObjectFor
} from '@/infrastructure/worker/durable-ports'

export { RoomObject } from '@/infrastructure/worker/room-object'
export { WallPairingObject } from '@/infrastructure/worker/wall-pairing-object'

const app = createHttpApp()

registerHttpRoutes({
  app,
  limitRoomCreation: limitRoomCreationWith(env.ROOM_CREATION_LIMITER),
  rooms: durableRoomDoor,
  walls: durableWallPairings
})

app.get(ROOM_SOCKET_ROUTE, async (context) => {
  const code = normalizeRoomCode(context.req.param('code'))

  return code === null
    ? context.text('No room behind this address', 404)
    : await roomObjectFor(code).fetch(context.req.raw)
})

const readAsset = async (url: URL, path: string): Promise<string | null> => {
  const response = await env.ASSETS.fetch(new URL(path, url))

  return response.ok ? response.text() : null
}

app.get('/sitemap.xml', async (context) => {
  const url = new URL(context.req.url)
  const manifest = await readAsset(url, `/${PRERENDER_MANIFEST}`)
  const documents =
    manifest === null ? [] : prerenderManifestSchema.parse(JSON.parse(manifest))

  return context.body(sitemapXml({ documents, origin: url.origin }), 200, {
    'Cache-Control': 'no-cache',
    'Content-Type': 'application/xml'
  })
})

app.get('/robots.txt', async (context) => {
  const url = new URL(context.req.url)
  const rules = (await readAsset(url, '/robots.txt')) ?? ''

  return context.text(robotsTxt({ origin: url.origin, rules }))
})

export default app
