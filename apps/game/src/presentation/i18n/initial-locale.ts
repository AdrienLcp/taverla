import type { Locale } from '@taverla/protocol/locale'

import { pickLocale } from '@taverla/core/i18n/locale'

import { preferredLocales, servedPath } from '@/infrastructure/env'
import { localeInPath } from '@/infrastructure/router/navigation'
import {
  readStoredLocale,
  writeStoredLocale
} from '@/infrastructure/storage/preferences-storage'

/**
 * The locale the app opens on: the one its URL names, then the one this device
 * asked for last, then the one its browser asks for.
 *
 * The URL leads because it is the only one of the three that somebody else can
 * have chosen. A link shared in French would otherwise open in the language of
 * whoever followed it, which is the whole reason the languages have URLs. A
 * room's URL names none, so both fallbacks stay.
 *
 * `index.html` ships `lang="en"` because a crawler and a link unfurled in a
 * group chat read the served document, and that copy is English on purpose. A
 * browser that finds the attribute over French text offers to **translate the
 * page** — an Xbox did — and the i18n provider's effect arrives a paint too
 * late. Deciding and stamping are one call so the order cannot be got wrong.
 */
export const applyInitialLocale = (): Locale => {
  const inUrl = localeInPath(servedPath())
  const locale = inUrl ?? readStoredLocale() ?? pickLocale(preferredLocales())

  // Remembered only when the URL named it, because a room's URL cannot: a phone
  // that reached one from a link shared in English would otherwise come back in
  // French on the first reload. The negotiated fallback is deliberately *not*
  // written — "never chosen" is what keeps following the operating system.
  if (inUrl !== null) {
    writeStoredLocale(inUrl)
  }

  document.documentElement.lang = locale

  return locale
}
