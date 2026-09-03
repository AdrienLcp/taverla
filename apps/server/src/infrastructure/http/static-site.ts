import { serveStatic } from '@hono/node-server/serve-static'
import type { Context, Hono } from 'hono'
import { compress } from 'hono/compress'

import { env } from '@/env'

/** Where Vite writes every content-hashed file, and nothing else. */
const HASHED_ASSETS = '/assets/'

const ONE_YEAR_SECONDS = 31_536_000

/**
 * A name carrying its own content hash can be kept forever, because changing
 * the file changes the name. Everything else is revalidated: `index.html` is
 * the one file that must never be stale — it is what names the hashed bundle,
 * so a cached copy pins a phone to the previous deployment's JavaScript — and
 * the fonts and icons beside it are served under fixed names a build replaces
 * in place.
 *
 * The URL rather than the path on disk, which `join` builds with whichever
 * separator the machine uses.
 */
const cacheStaticFile = (_path: string, c: Context): void => {
  c.header(
    'Cache-Control',
    c.req.path.startsWith(HASHED_ASSETS)
      ? `public, max-age=${ONE_YEAR_SECONDS}, immutable`
      : 'no-cache'
  )
}

/**
 * Both surfaces from one origin, which is not a deployment convenience but the
 * thing the QR code depends on: it encodes `location.origin`, so the phone that
 * scans it must land on the host's own host. Two deployments would mean CORS, a
 * second domain and an environment variable pointing one at the other.
 *
 * Registered last, after the API and the socket upgrade, because the SPA
 * fallback answers everything and would otherwise swallow them.
 */
export const registerStaticSite = (app: Hono): void => {
  const root = env.SERVE_GAME_FROM

  if (root === undefined) {
    return
  }

  // Here rather than on the whole app, so the socket upgrade and the API keep
  // the frames they already send. Uncompressed, the bundle is 370 KiB of text
  // over the phone network of whichever flat the party is in.
  app.use('*', compress())

  app.use('*', serveStatic({ onFound: cacheStaticFile, root }))
  app.get(
    '*',
    serveStatic({ onFound: cacheStaticFile, path: `${root}/index.html` })
  )
}
