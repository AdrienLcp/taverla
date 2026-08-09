import { serveStatic } from '@hono/node-server/serve-static'
import type { Hono } from 'hono'

import { env } from '@/env'

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

  app.use('*', serveStatic({ root }))
  app.get('*', serveStatic({ path: `${root}/index.html` }))
}
