import { createBrowserRouter, type RouteObject } from 'react-router'

import { NotFoundPage } from '@/features/not-found/not-found-page'
import {
  LocalePrefixedRoutes,
  NegotiatedLocaleRedirect
} from '@/infrastructure/router/locale-prefix'
import {
  localizedPaths,
  paths,
  roomPaths
} from '@/infrastructure/router/navigation'
import { AppShell } from '@/presentation/app-shell'
import { ErrorScreen } from '@/presentation/error-screen'
import { RouteFallback } from '@/presentation/route-fallback'

/**
 * Every path that is reached by matching it, which is all of them but `root` —
 * that one is the layout's index route, and matches by being nowhere.
 */
type RoutedPath = Exclude<(typeof paths)[keyof typeof paths], typeof paths.root>

/**
 * Keyed by path so the table cannot lose one or answer the same one twice.
 * Both shipped: `paths.game` was once given to the player screen as well as the
 * shelf, which left `/play/XXXX` on the 404 and PlayerPage unreachable, with
 * build and lint green and only an e2e journey to say so. A missing key is now
 * a compile error, and a repeated one has nowhere to go.
 *
 * The host console and the player screen are lazily loaded, which is the whole
 * reason one app can serve both: a phone joining a game downloads the buzzer,
 * not the QR code renderer and the audio player it will never run.
 */
const lazyPageFor = {
  [paths.credits]: async () => ({
    Component: (await import('@/features/credits/credits-page')).CreditsPage
  }),
  [paths.game]: async () => ({
    Component: (await import('@/features/shelf/game-home-page')).GameHomePage
  }),
  [paths.home]: async () => ({
    Component: (await import('@/features/home/home-page')).HomePage
  }),
  [paths.host]: async () => ({
    Component: (await import('@/features/host/host-console-page'))
      .HostConsolePage
  }),
  [paths.play]: async () => ({
    Component: (await import('@/features/player/player-page')).PlayerPage
  })
} satisfies Record<RoutedPath, RouteObject['lazy']>

const routeFor = (path: RoutedPath): RouteObject => ({
  lazy: lazyPageFor[path],
  path
})

/**
 * Which branch a path hangs from is read off the path itself, so putting a page
 * under a locale is what puts it behind the prefix guard — there is no second
 * list to keep in step.
 */
export const router = createBrowserRouter([
  {
    Component: AppShell,
    children: [
      { Component: NegotiatedLocaleRedirect, index: true },
      {
        Component: LocalePrefixedRoutes,
        children: Object.values(localizedPaths).map(routeFor)
      },
      ...Object.values(roomPaths).map(routeFor),
      { Component: NotFoundPage, path: '*' }
    ],
    // On the root, so a throw anywhere below replaces the shell instead of
    // rendering a fallback inside chrome that may be part of what broke.
    ErrorBoundary: ErrorScreen,
    // Honoured on the root route alone, and only on a cold load — a navigation
    // already made keeps the screen it is leaving until the chunk resolves.
    HydrateFallback: RouteFallback
  }
])
