import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'

import { pickLocale } from '@taverla/core/i18n/locale'

import { preferredLocales } from '@/infrastructure/env'
import { router } from '@/infrastructure/router/routes'
import { readStoredLocale } from '@/infrastructure/storage/preferences-storage'
import { I18nProvider } from '@/presentation/i18n/i18n-provider'
import { ThemeProvider } from '@/presentation/theme/theme-provider'

import '@/presentation/styles/globals.sass'

/**
 * `index.html` ships `lang="en"` because a crawler and a link unfurled in a
 * group chat read the served document, and that copy is English on purpose. A
 * browser that finds the attribute over French text offers to **translate the
 * page** — an Xbox did — so the negotiated locale is stamped here, before React
 * renders a word. The provider's effect is too late by a paint: by then the
 * browser has already sniffed a French page claiming to be English.
 */
const initialLocale = readStoredLocale() ?? pickLocale(preferredLocales())

document.documentElement.lang = initialLocale

const container = document.getElementById('root')

if (container == null) {
  throw new Error('Missing #root in index.html')
}

const root = createRoot(container)

const App: React.FC = () => (
  <StrictMode>
    <ThemeProvider>
      <I18nProvider locale={initialLocale}>
        <RouterProvider router={router} />
      </I18nProvider>
    </ThemeProvider>
  </StrictMode>
)

root.render(<App />)
