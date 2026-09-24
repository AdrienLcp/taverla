import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import type { Locale } from '@taverla/protocol/locale'

import type { PrerenderedPage, RenderedPage } from '../src/entry-server'
import type { IndexedPage } from '../src/presentation/head/document-head'

type EntryServer = {
  imageAlts: Record<Locale, string>
  openGraphLocales: Record<Locale, string>
  prerenderedPages: PrerenderedPage[]
  renderPage: (page: PrerenderedPage) => Promise<RenderedPage>
}

const GAME_ROOT = resolve(import.meta.dirname, '..')
const CLIENT_DIR = join(GAME_ROOT, 'dist')
const SERVER_ENTRY = join(GAME_ROOT, 'dist-ssr', 'entry-server.js')

/**
 * What the server reads to learn which URL is answered by which file. A
 * manifest rather than a shared list, because the build is the only thing that
 * knows what it actually wrote: a page that failed to render cannot leave a
 * route behind pointing at a file that is not there.
 */
const MANIFEST_FILE = 'prerendered.json'

/**
 * Vite's own, which answers a different question: what the build emitted for a
 * given source module. It is what lets a document inline the stylesheet its
 * page's chunk carries instead of linking it.
 */
const VITE_MANIFEST_FILE = '.vite/manifest.json'

type BuildChunk = {
  css?: string[]
  file: string
  imports?: string[]
}

/**
 * Every replacement is required to match exactly once. `index.html` stays a
 * valid standalone document — it is what `pnpm dev` serves — so there are no
 * placeholders to key off, and a tag that is edited out of it would otherwise
 * leave sixteen documents quietly carrying the wrong head.
 */
const replaceOnce = ({
  html,
  pattern,
  replacement
}: {
  html: string
  pattern: RegExp
  replacement: string
}): string => {
  let matched = 0
  const next = html.replace(
    new RegExp(pattern.source, `${pattern.flags}g`),
    () => {
      matched += 1

      return replacement
    }
  )

  if (matched !== 1) {
    throw new Error(
      `prerender: ${String(pattern)} matched ${matched} times in index.html, expected 1`
    )
  }

  return next
}

const escapeAttribute = (value: string): string =>
  value.replaceAll('&', '&amp;').replaceAll('"', '&quot;')

const escapeText = (value: string): string =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;')

const setMeta = ({
  html,
  key,
  value
}: {
  html: string
  /** The attribute that identifies the tag — `name="description"`, `property="og:title"`. */
  key: string
  value: string
}): string =>
  replaceOnce({
    html,
    pattern: new RegExp(String.raw`<meta\s+content="[^"]*"\s+${key}\s*/>`),
    replacement: `<meta content="${escapeAttribute(value)}" ${key} />`
  })

const CANONICAL = /<link\s+href="[^"]*"\s+rel="canonical"\s*\/>/

/**
 * The deployment's origin, taken from the canonical link the template already
 * carries rather than from a second constant. `index.html` says it is the one
 * place a host is written down, and this keeps that true.
 */
const originOf = (template: string): string => {
  const canonical = CANONICAL.exec(template)
  const origin =
    canonical === null ? undefined : /href="([^"]*)"/.exec(canonical[0])?.[1]

  if (origin === undefined) {
    throw new Error(
      'prerender: index.html carries no canonical link to read the origin from'
    )
  }

  return new URL(origin).origin
}

/** `/en` → `en.html`, `/fr/credits` → `fr/credits.html`. */
const fileFor = (path: string): string => `${path.slice(1)}.html`

/**
 * Every `<link rel="stylesheet">` the build emitted, matched as one run so a
 * single `<style>` can take their place. They are removed rather than
 * reordered: the three of them are 16 KB behind 550 KB of JavaScript and a
 * 90 KB font, all requested in the same breath, and priority does not preempt
 * on a shared connection — measured at 1.28 s of pure queue.
 */
const LINKED_STYLESHEETS =
  /<link[^>]*rel="stylesheet"[^>]*>(?:\s*<link[^>]*rel="stylesheet"[^>]*>)*/

const linkedStylesheetsOf = (html: string): string[] => {
  const run = LINKED_STYLESHEETS.exec(html)?.[0]

  if (run === undefined) {
    throw new Error(
      'prerender: index.html links no stylesheet, so there is nothing to inline and nothing would paint'
    )
  }

  return [...run.matchAll(/href="([^"]*)"/g)].flatMap(([, href]) => href ?? [])
}

/**
 * A chunk and everything it statically imports, imports first. The walk rather
 * than the chunk alone, because a page is painted and run by both — and a
 * shared chunk the bundler splits off tomorrow would otherwise drop off the
 * first paint with nothing to say so.
 */
const chunksFor = ({
  module,
  seen
}: {
  module: string
  seen: Set<string>
}): BuildChunk[] => {
  if (seen.has(module)) {
    return []
  }

  seen.add(module)

  const chunk = buildManifest[module]

  if (chunk === undefined) {
    throw new Error(
      `prerender: ${module} is not in Vite's manifest — routes.tsx names a module this build did not emit`
    )
  }

  return [
    ...(chunk.imports ?? []).flatMap((imported) =>
      chunksFor({ module: imported, seen })
    ),
    chunk
  ]
}

const stylesheets = new Map<string, string>()

const readStylesheet = async (href: string): Promise<string> => {
  const cached = stylesheets.get(href)

  if (cached !== undefined) {
    return cached
  }

  const css = await readFile(join(CLIENT_DIR, href.slice(1)), 'utf8')

  if (css.includes('</style')) {
    throw new Error(
      `prerender: ${href} would close the <style> tag it is inlined into`
    )
  }

  stylesheets.set(href, css)

  return css
}

/**
 * What the template links — the entry's sheet and every shared chunk it pulls
 * in — plus the ones belonging to the page's own chunk, which the template
 * cannot name because the router loads it lazily. Both halves or neither: the
 * document carries the whole page's markup, so inlining only the first would
 * paint it stripped of a third of its styles for as long as the bundle takes.
 */
const inlineStylesFor = async (module: string): Promise<string> => {
  const hrefs = [
    ...new Set([
      ...templateStylesheets,
      ...chunksFor({ module, seen: new Set() }).flatMap((chunk) =>
        (chunk.css ?? []).map((file) => `/${file}`)
      )
    ])
  ]

  return (await Promise.all(hrefs.map(readStylesheet))).join('\n')
}

/**
 * Every `<link rel="modulepreload">` the build emitted, as one run — matched
 * the way the stylesheets are, and for the same exactly-once guard.
 */
const PRELOADED_MODULES =
  /<link[^>]*rel="modulepreload"[^>]*>(?:\s*<link[^>]*rel="modulepreload"[^>]*>)*/

const preloadedModulesOf = (html: string): string => {
  const run = PRELOADED_MODULES.exec(html)?.[0]

  if (run === undefined) {
    throw new Error(
      'prerender: index.html preloads no module, so there is no run to add a page chunk to'
    )
  }

  return run
}

const entryScriptOf = (html: string): string => {
  const src = /<script[^>]*type="module"[^>]*src="([^"]*)"/.exec(html)?.[1]

  if (src === undefined) {
    throw new Error('prerender: index.html carries no module entry script')
  }

  return src
}

/**
 * The chunk this page's route lives in, and its static imports. The router
 * reaches it through a dynamic import, so nothing names it until the entry has
 * been downloaded, parsed and run — a serial round trip behind 550 KB of
 * bundle, measured at 870 ms, for which the route fallback holds the screen and
 * the paint the document already made is thrown away. Named here, it is in
 * flight with everything else from the first response.
 */
const preloadsFor = (module: string): string =>
  chunksFor({ module, seen: new Set() })
    .map((chunk) => `/${chunk.file}`)
    .filter((href) => !alreadyRequested.has(href))
    .map(
      (href) => `\n    <link rel="modulepreload" crossorigin href="${href}">`
    )
    .join('')

const documentFor = ({
  origin,
  page,
  preloads,
  rendered,
  siblings,
  styles,
  template
}: {
  origin: string
  page: PrerenderedPage
  /** `<link rel="modulepreload">` for this page's own chunk, which the template cannot name. */
  preloads: string
  rendered: RenderedPage
  /** The same page in every language, this one included — `hreflang` must be reciprocal. */
  siblings: PrerenderedPage[]
  /** Every stylesheet this page paints under, so the document links none. */
  styles: string
  template: string
}): string => {
  const url = `${origin}${page.path}`

  const alternates = [
    ...siblings.map(
      (sibling) =>
        `<link href="${origin}${sibling.path}" hreflang="${sibling.locale}" rel="alternate" />`
    ),
    // The root negotiates and redirects, which is exactly what `x-default` is
    // for: a crawler that finds no reciprocal match has somewhere to be sent.
    `<link href="${origin}/" hreflang="x-default" rel="alternate" />`
  ].join('\n    ')

  return [
    (html: string) =>
      replaceOnce({
        html,
        pattern: /<html lang="[^"]*">/,
        replacement: `<html lang="${page.locale}">`
      }),
    (html: string) =>
      replaceOnce({
        html,
        pattern: /<title>[^<]*<\/title>/,
        replacement: `<title>${escapeText(rendered.title)}</title>`
      }),
    (html: string) =>
      setMeta({ html, key: 'name="description"', value: rendered.description }),
    (html: string) =>
      replaceOnce({
        html,
        pattern: CANONICAL,
        replacement: `<link href="${url}" rel="canonical" />\n    ${alternates}`
      }),
    (html: string) =>
      setMeta({ html, key: 'property="og:title"', value: rendered.title }),
    (html: string) =>
      setMeta({
        html,
        key: 'property="og:description"',
        value: rendered.description
      }),
    (html: string) => setMeta({ html, key: 'property="og:url"', value: url }),
    (html: string) =>
      setMeta({
        html,
        key: 'property="og:image:alt"',
        value: imageAlts[page.locale]
      }),
    (html: string) =>
      setMeta({
        html,
        key: 'property="og:locale"',
        value: openGraphLocales[page.locale]
      }),
    (html: string) =>
      replaceOnce({
        html,
        pattern:
          /<meta\s+content="[^"]*"\s+property="og:locale:alternate"\s*\/>/,
        replacement: alternateOpenGraphLocales({ page, siblings })
      }),
    (html: string) =>
      replaceOnce({
        html,
        pattern: PRELOADED_MODULES,
        replacement: `${preloadedModules}${preloads}`
      }),
    (html: string) =>
      replaceOnce({
        html,
        pattern: LINKED_STYLESHEETS,
        replacement: `<style>${styles}</style>`
      }),
    (html: string) =>
      replaceOnce({
        html,
        pattern: /<div id="root"><\/div>/,
        replacement: `<div id="root">${rendered.html}</div>`
      })
  ].reduce((html, step) => step(html), template)
}

const alternateOpenGraphLocales = ({
  page,
  siblings
}: {
  page: PrerenderedPage
  siblings: PrerenderedPage[]
}): string =>
  siblings
    .filter((sibling) => sibling.locale !== page.locale)
    .map(
      (sibling) =>
        `<meta content="${OPEN_GRAPH_TAGS[sibling.locale]}" property="og:locale:alternate" />`
    )
    .join('\n    ')

/**
 * Duplicated from `document-head.ts` on purpose: this file is the only one that
 * needs a *sibling's* tag, and importing the app's module into a plain Node
 * script would pull the whole graph — sass, aliases and react — outside the
 * bundle Vite built for exactly that.
 */
const OPEN_GRAPH_TAGS: Record<Locale, string> = {
  en: 'en_US',
  fr: 'fr_FR'
}

const template = await readFile(join(CLIENT_DIR, 'index.html'), 'utf8')
const origin = originOf(template)
const templateStylesheets = linkedStylesheetsOf(template)
const preloadedModules = preloadedModulesOf(template)

const alreadyRequested = new Set([
  entryScriptOf(template),
  ...[...preloadedModules.matchAll(/href="([^"]*)"/g)].flatMap(
    ([, href]) => href ?? []
  )
])

const buildManifest: Record<string, BuildChunk> = JSON.parse(
  await readFile(join(CLIENT_DIR, VITE_MANIFEST_FILE), 'utf8')
)

const {
  imageAlts,
  openGraphLocales,
  prerenderedPages,
  renderPage
}: EntryServer = await import(pathToFileURL(SERVER_ENTRY).href)

const siblingsOf = (page: IndexedPage): PrerenderedPage[] =>
  prerenderedPages.filter((candidate) => candidate.page === page)

const manifest: { file: string; url: string }[] = []

for (const page of prerenderedPages) {
  const rendered = await renderPage(page)
  const file = fileFor(page.path)
  const destination = join(CLIENT_DIR, file)

  await mkdir(dirname(destination), { recursive: true })
  await writeFile(
    destination,
    documentFor({
      origin,
      page,
      preloads: preloadsFor(page.module),
      rendered,
      siblings: siblingsOf(page.page),
      styles: await inlineStylesFor(page.module),
      template
    }),
    'utf8'
  )

  manifest.push({ file, url: page.path })
}

await writeFile(
  join(CLIENT_DIR, MANIFEST_FILE),
  `${JSON.stringify(manifest, null, 2)}\n`,
  'utf8'
)

console.info(
  `prerendered ${manifest.length} documents into ${CLIENT_DIR} at ${origin}`
)
