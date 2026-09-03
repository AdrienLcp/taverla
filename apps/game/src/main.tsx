import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'

import { routes } from '@/infrastructure/router/routes'
import { AppProviders } from '@/presentation/app-providers'
import { applyInitialLocale } from '@/presentation/i18n/initial-locale'

import '@/presentation/styles/globals.sass'

// Before `root.render`, because the attribute has to be right before there is
// any text on the page for a browser to sniff.
const initialLocale = applyInitialLocale()

const container = document.getElementById('root')

if (container == null) {
  throw new Error('Missing #root in index.html')
}

const router = createBrowserRouter(routes)

/**
 * `createRoot` over the prerendered markup rather than `hydrateRoot`, and that
 * is a decision rather than an oversight. The document is written at build time
 * and cannot know this device's theme, which is read from storage at first
 * render — hydrating would either mismatch on every load or push the theme into
 * an effect, which is a flash of the wrong palette on every page instead of
 * none. Nothing on these pages comes from a loader, so hydration would buy the
 * reuse of a few dozen nodes and nothing else.
 */
const root = createRoot(container)

const App: React.FC = () => (
  <StrictMode>
    <AppProviders locale={initialLocale}>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>
)

/**
 * A prerendered document is already showing this page, and React's first commit
 * cannot: every route is `lazy`, so until the chunk resolves the router is
 * uninitialized and `RouterProvider` renders `RouteFallback` over it. Measured
 * on the home page at 200 ms of loader replacing a page painted at 456 ms —
 * throwing away the paint the document was written to make.
 *
 * Waiting costs nothing here, because what it waits behind is the screen being
 * rendered. A room is the other case and needs the opposite: `/host/:code` and
 * the `/play/:code` a QR code lands on are served the empty SPA fallback, so
 * `#root` has no children, and the loader is the only thing that screen has to
 * show. That is the whole of the condition.
 */
if (container.hasChildNodes() && !router.state.initialized) {
  const unsubscribe = router.subscribe((state) => {
    if (state.initialized) {
      unsubscribe()
      root.render(<App />)
    }
  })
} else {
  root.render(<App />)
}
