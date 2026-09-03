import type { RouteObject } from 'react-router'

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
type LazyPage = {
  lazy: RouteObject['lazy']
  /**
   * The same module the import beside it names, spelled the way Vite's build
   * manifest keys it. The prerender walks that manifest to inline the
   * stylesheet a page's chunk carries, and cannot read a specifier back out of
   * a closure — so the two are written on adjacent lines rather than in two
   * tables that can drift apart.
   */
  module: string
}

const pageFor = {
  [paths.credits]: {
    lazy: async () => ({
      Component: (await import('@/features/credits/credits-page')).CreditsPage
    }),
    module: 'src/features/credits/credits-page.tsx'
  },
  [paths.game]: {
    lazy: async () => ({
      Component: (await import('@/features/shelf/game-home-page')).GameHomePage
    }),
    module: 'src/features/shelf/game-home-page.tsx'
  },
  [paths.home]: {
    lazy: async () => ({
      Component: (await import('@/features/home/home-page')).HomePage
    }),
    module: 'src/features/home/home-page.tsx'
  },
  [paths.host]: {
    lazy: async () => ({
      Component: (await import('@/features/host/host-console-page'))
        .HostConsolePage
    }),
    module: 'src/features/host/host-console-page.tsx'
  },
  [paths.play]: {
    lazy: async () => ({
      Component: (await import('@/features/player/player-page')).PlayerPage
    }),
    module: 'src/features/player/player-page.tsx'
  }
} satisfies Record<RoutedPath, LazyPage>

const routeFor = (path: RoutedPath): RouteObject => ({
  lazy: pageFor[path].lazy,
  path
})

export const pageModuleFor = (path: RoutedPath): string => pageFor[path].module

/**
 * Which branch a path hangs from is read off the path itself, so putting a page
 * under a locale is what puts it behind the prefix guard — there is no second
 * list to keep in step.
 *
 * The tree rather than a router, because it is mounted twice: `main.tsx` hands
 * it to `createBrowserRouter`, and the build-time prerender hands it to
 * `createStaticHandler`, which is also what resolves every `lazy` above before
 * anything is rendered. A browser router cannot be built in Node at all, so
 * exporting one here would put the whole route tree out of the prerender's
 * reach.
 */
export const routes: RouteObject[] = [
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
]
