import { createI18n, type Dictionary } from '@adrienlcp/i18n'

import { DEFAULT_LOCALE, type Locale } from '@taverla/protocol/locale'

import { EN_DICTIONARY } from './dictionary-en'
import { FR_DICTIONARY } from './dictionary-fr'

/**
 * Where this app's locales meet this app's dictionaries, once. Everything past
 * here passes a locale and nothing else.
 *
 * `satisfies` rather than an annotation: it holds the registry to the contract's
 * `LOCALES` — adding one there stops compiling here until a dictionary exists —
 * while leaving the keys as literals, which is what `createI18n` reads to decide
 * what `translator` and `negotiate` accept.
 */
export const i18n = createI18n({
  defaultLocale: DEFAULT_LOCALE,
  dictionaries: { en: EN_DICTIONARY, fr: FR_DICTIONARY } satisfies Record<
    Locale,
    Dictionary
  >
})
