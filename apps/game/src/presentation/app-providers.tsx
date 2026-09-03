import type { ReactNode } from 'react'

import type { Locale } from '@taverla/protocol/locale'

import { I18nProvider } from '@/presentation/i18n/i18n-provider'
import { ThemeProvider } from '@/presentation/theme/theme-provider'

type AppProvidersProps = {
  /** The router the app is rendered under — a browser one, or a static one. */
  children: ReactNode
  /**
   * Settled before this mounts: in the browser by `applyInitialLocale`, at build
   * time by which of the two documents is being written.
   */
  locale: Locale
}

/**
 * Everything above the router, so the document written at build time and the one
 * the browser renders come out of the same stack. A page prerendered under a
 * different set of providers is a page nobody has tested.
 */
export const AppProviders = ({ children, locale }: AppProvidersProps) => (
  <ThemeProvider>
    <I18nProvider locale={locale}>{children}</I18nProvider>
  </ThemeProvider>
)
