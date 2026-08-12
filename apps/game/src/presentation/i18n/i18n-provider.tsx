import { type ReactNode, useEffect, useState } from 'react'
import { I18nProvider as ReactAriaI18nProvider } from 'react-aria-components'

import type { Locale } from '@taverla/protocol/locale'

import { pickLocale } from '@taverla/core/i18n/locale'
import { createTranslator } from '@taverla/core/i18n/translator'

import { createSafeContext } from '@/helpers/contexts'
import { preferredLocales } from '@/infrastructure/env'
import {
  readStoredLocale,
  writeStoredLocale
} from '@/infrastructure/storage/preferences-storage'

import { EN_DICTIONARY } from './dictionary-en'
import { FR_DICTIONARY } from './dictionary-fr'
import type { Dictionary, Translate } from './translation'

const DICTIONARIES: Record<Locale, Dictionary> = {
  en: EN_DICTIONARY,
  fr: FR_DICTIONARY
}

/**
 * react-aria carries its own strings — press announcements, `FieldError`, the
 * live regions — and keys them by BCP-47 tag. `optimizeLocales` in
 * `vite.config.ts` bundles exactly these two, so adding a locale means editing
 * both lists.
 */
const REACT_ARIA_LOCALES: Record<Locale, string> = {
  en: 'en-US',
  fr: 'fr-FR'
}

type I18nContextValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  translate: Translate
}

export const [I18nContext, useI18n] =
  createSafeContext<I18nContextValue>('I18nProvider')

export const useTranslate = (): Translate => useI18n().translate

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [locale, setLocale] = useState<Locale>(
    () => readStoredLocale() ?? pickLocale(preferredLocales())
  )

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const chooseLocale = (next: Locale): void => {
    setLocale(next)
    writeStoredLocale(next)
  }

  return (
    <I18nContext
      value={{
        locale,
        setLocale: chooseLocale,
        translate: createTranslator<typeof EN_DICTIONARY>({
          locale,
          translations: DICTIONARIES[locale]
        })
      }}
    >
      <ReactAriaI18nProvider locale={REACT_ARIA_LOCALES[locale]}>
        {children}
      </ReactAriaI18nProvider>
    </I18nContext>
  )
}
