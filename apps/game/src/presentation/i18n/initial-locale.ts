import type { Locale } from '@taverla/protocol/locale'

import { pickLocale } from '@taverla/core/i18n/locale'

import { preferredLocales } from '@/infrastructure/env'
import { readStoredLocale } from '@/infrastructure/storage/preferences-storage'

/**
 * The locale the app opens on: what this device asked for last, and what its
 * browser asks for otherwise.
 *
 * `index.html` ships `lang="en"` because a crawler and a link unfurled in a
 * group chat read the served document, and that copy is English on purpose. A
 * browser that finds the attribute over French text offers to **translate the
 * page** — an Xbox did — and the i18n provider's effect arrives a paint too
 * late. Deciding and stamping are one call so the order cannot be got wrong.
 */
export const applyInitialLocale = (): Locale => {
  const locale = readStoredLocale() ?? pickLocale(preferredLocales())

  document.documentElement.lang = locale

  return locale
}
