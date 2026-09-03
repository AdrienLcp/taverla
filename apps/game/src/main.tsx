import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'

import { router } from '@/infrastructure/router/routes'
import { I18nProvider } from '@/presentation/i18n/i18n-provider'
import { applyInitialLocale } from '@/presentation/i18n/initial-locale'
import { ThemeProvider } from '@/presentation/theme/theme-provider'

import '@/presentation/styles/globals.sass'

// Before `root.render`, because the attribute has to be right before there is
// any text on the page for a browser to sniff.
const initialLocale = applyInitialLocale()

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
