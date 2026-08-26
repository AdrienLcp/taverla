import { createBrowserRouter } from 'react-router'

import { NotFoundPage } from '@/features/not-found/not-found-page'
import { paths } from '@/infrastructure/router/navigation'
import { AppShell } from '@/presentation/app-shell'
import { ErrorScreen } from '@/presentation/error-screen'
import { RouteFallback } from '@/presentation/route-fallback'

/**
 * The host console and the player screen are lazily loaded, which is the whole
 * reason one app can serve both: a phone joining a game downloads the buzzer,
 * not the QR code renderer and the audio player it will never run.
 */
export const router = createBrowserRouter([
  {
    Component: AppShell,
    children: [
      {
        index: true,
        lazy: async () => ({
          Component: (await import('@/features/home/home-page')).HomePage
        })
      },
      // Before `:game` to read in the order it resolves, though the ranking
      // does not depend on it: react-router prefers a static segment to a
      // dynamic one wherever it is declared.
      {
        lazy: async () => ({
          Component: (await import('@/features/credits/credits-page'))
            .CreditsPage
        }),
        path: paths.credits
      },
      {
        lazy: async () => ({
          Component: (await import('@/features/shelf/game-home-page'))
            .GameHomePage
        }),
        path: paths.game
      },
      {
        lazy: async () => ({
          Component: (await import('@/features/host/host-console-page'))
            .HostConsolePage
        }),
        path: paths.host
      },
      {
        lazy: async () => ({
          Component: (await import('@/features/player/player-page')).PlayerPage
        }),
        path: paths.play
      },
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
