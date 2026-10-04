import { existsSync, readFileSync } from 'node:fs'

import { serveStatic } from '@hono/node-server/serve-static'
import type { Context, Hono } from 'hono'
import { compress } from 'hono/compress'

import { env } from '@/env'
import {
  PRERENDER_MANIFEST,
  type PrerenderedDocument,
  prerenderManifestSchema,
  robotsTxt,
  sitemapXml
} from '@/infrastructure/http/site-index'
import { logger } from '@/infrastructure/logging/logger'

/** Where Vite writes every content-hashed file, and nothing else. */
const HASHED_ASSETS = '/assets/'

const ONE_YEAR_SECONDS = 31_536_000

/**
 * A name carrying its own content hash can be kept forever, because changing
 * the file changes the name. Everything else is revalidated: `index.html` is
 * the one file that must never be stale — it is what names the hashed bundle,
 * so a cached copy pins a screen to the previous deployment's JavaScript — and
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
 * One route per prerendered URL, taken from what the build actually wrote
 * rather than from a list this file keeps in step. A directory index would
 * answer some of them, but only by whichever rule a given static server applies
 * to a folder — and `/en` is a document while `/en/credits` sits under one, so
 * there is no single folder shape to lean on.
 *
 * Absent is a legitimate state: a client-only build, or a deployment from
 * before this existed. It is also the exact shape of the bug this stage was
 * opened for — every language served one English document — so it is said out
 * loud rather than falling through in silence. A manifest that is present and
 * unreadable stops the server instead, because that is a broken build.
 */
const registerPrerenderedPages = ({
  app,
  root
}: {
  app: Hono
  root: string
}): PrerenderedDocument[] => {
  const path = `${root}/${PRERENDER_MANIFEST}`

  if (!existsSync(path)) {
    logger.warn('No prerendered documents; every language shares one head', {
      expected: path
    })

    return []
  }

  const documents = prerenderManifestSchema.parse(
    JSON.parse(readFileSync(path, 'utf8'))
  )

  for (const { file, url } of documents) {
    app.get(
      url,
      serveStatic({ onFound: cacheStaticFile, path: `${root}/${file}` })
    )
  }

  logger.info('Serving prerendered documents', { count: documents.length })

  return documents
}

/**
 * The origin a crawler actually reached us on. Render terminates TLS in front
 * of the process, so the request's own URL says `http` on a site served over
 * `https` — and a sitemap listing the wrong scheme lists URLs that redirect,
 * which is the one thing a sitemap must not do.
 */
const originOf = (c: Context): string => {
  const { host, protocol } = new URL(c.req.url)
  const forwarded = c.req.header('x-forwarded-proto')?.split(',')[0]?.trim()

  return `${forwarded ?? protocol.replace(':', '')}://${host}`
}

const registerSitemap = ({
  app,
  documents,
  root
}: {
  app: Hono
  documents: readonly PrerenderedDocument[]
  root: string
}): void => {
  app.get('/sitemap.xml', (c) =>
    c.body(sitemapXml({ documents, origin: originOf(c) }), 200, {
      'Cache-Control': 'no-cache',
      'Content-Type': 'application/xml'
    })
  )

  app.get('/robots.txt', (c) => {
    const path = `${root}/robots.txt`
    const rules = existsSync(path) ? readFileSync(path, 'utf8') : ''

    return c.text(robotsTxt({ origin: originOf(c), rules }))
  })
}

/**
 * Both surfaces from one origin, which is not a deployment convenience but the
 * thing the QR code depends on: it encodes `location.origin`, so the player
 * who scans it must land on the host's own host. Two deployments would mean
 * CORS, a second domain and an environment variable pointing one at the other.
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
  // over the network of whichever flat the party is in.
  app.use('*', compress())

  registerSitemap({
    app,
    documents: registerPrerenderedPages({ app, root }),
    root
  })

  app.use('*', serveStatic({ onFound: cacheStaticFile, root }))
  app.get(
    '*',
    serveStatic({ onFound: cacheStaticFile, path: `${root}/index.html` })
  )
}
