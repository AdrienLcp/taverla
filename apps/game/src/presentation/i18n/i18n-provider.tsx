import { type ReactNode, useEffect, useState } from 'react'
import { I18nProvider as ReactAriaI18nProvider } from 'react-aria-components'

import type { Locale } from '@taverla/protocol/locale'

import { createSafeContext } from '@/helpers/contexts'
import { writeStoredLocale } from '@/infrastructure/storage/preferences-storage'

import { i18n } from './i18n'
import type { Translate } from './translation'

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

type I18nProviderProps = {
  children: ReactNode
  /**
   * Negotiated in `main.tsx` and already on `<html lang>` by the time this
   * renders — which is the point, and why it is not read again here.
   */
  locale: Locale
}

export const I18nProvider = ({
  children,
  locale: initialLocale
}: I18nProviderProps) => {
  const [locale, setLocale] = useState<Locale>(initialLocale)

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
        translate: i18n.translator(locale)
      }}
    >
      <ReactAriaI18nProvider locale={REACT_ARIA_LOCALES[locale]}>
        {children}
      </ReactAriaI18nProvider>
    </I18nContext>
  )
}
