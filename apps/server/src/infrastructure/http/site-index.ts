import { z } from 'zod'

/** Written by the game's build, beside the documents it lists. */
export const PRERENDER_MANIFEST = 'prerendered.json'

export const prerenderManifestSchema = z.array(
  z.object({ file: z.string(), url: z.string() })
)

export type PrerenderedDocument = z.infer<
  typeof prerenderManifestSchema
>[number]

/**
 * The prerendered documents, listed for a crawler. It exists because the front
 * door stopped linking to them: a shelf card opens a room now rather than going
 * to that game's page, and a page nothing points at is a page nobody finds.
 * Built from the manifest — a list kept by hand goes stale the day a game
 * reaches the shelf.
 */
export const sitemapXml = ({
  documents,
  origin
}: {
  documents: readonly PrerenderedDocument[]
  origin: string
}): string => {
  const entries = documents
    .map(({ url }) => `  <url><loc>${origin}${url}</loc></url>`)
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`
}

/**
 * The file keeps its own prose; only the one line that needs an absolute URL
 * is added, because a static file cannot know which origin it was asked for.
 */
export const robotsTxt = ({
  origin,
  rules
}: {
  origin: string
  rules: string
}): string => `${rules.trimEnd()}\n\nSitemap: ${origin}/sitemap.xml\n`
