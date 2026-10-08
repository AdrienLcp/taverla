import type { Plugin } from 'vite'

import { DEFAULT_LOCALE } from '@taverla/protocol/locale'

import {
  IMAGE_ALTS,
  OPEN_GRAPH_LOCALES,
  PAGE_HEADS
} from '../src/presentation/head/document-head.ts'

const escapeAttribute = (value: string): string =>
  value.replaceAll('&', '&amp;').replaceAll('"', '&quot;')

const escapeText = (value: string): string =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;')

const fillOnce = ({
  html,
  pattern,
  replacement
}: {
  html: string
  pattern: RegExp
  replacement: string
}): string => {
  if (
    html.match(new RegExp(pattern.source, `${pattern.flags}g`))?.length !== 1
  ) {
    throw new Error(
      `shell head: ${String(pattern)} must match exactly once in index.html`
    )
  }

  return html.replace(pattern, () => replacement)
}

const fillMeta = (html: string, key: string, value: string): string =>
  fillOnce({
    html,
    pattern: new RegExp(String.raw`<meta\s+content=""\s+${key}\s*/>`),
    replacement: `<meta content="${escapeAttribute(value)}" ${key} />`
  })

/**
 * Fills the copy `index.html` leaves empty with the default page's head — the
 * home page in the default language — so the shell `pnpm dev` and the SPA
 * fallback serve never drifts from the copy the prerender writes.
 */
export const shellHeadPlugin = (): Plugin => ({
  name: 'taverla-shell-head',
  transformIndexHtml: {
    handler: (html) => {
      const { description, title } = PAGE_HEADS[DEFAULT_LOCALE].home

      return [
        (current: string) =>
          fillOnce({
            html: current,
            pattern: /<title><\/title>/,
            replacement: `<title>${escapeText(title)}</title>`
          }),
        (current: string) =>
          fillMeta(current, 'name="description"', description),
        (current: string) => fillMeta(current, 'property="og:title"', title),
        (current: string) =>
          fillMeta(current, 'property="og:description"', description),
        (current: string) =>
          fillMeta(
            current,
            'property="og:image:alt"',
            IMAGE_ALTS[DEFAULT_LOCALE]
          ),
        (current: string) =>
          fillMeta(
            current,
            'property="og:locale"',
            OPEN_GRAPH_LOCALES[DEFAULT_LOCALE]
          )
      ].reduce((current, fill) => fill(current), html)
    },
    order: 'pre'
  }
})
