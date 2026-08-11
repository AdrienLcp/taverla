import { createBrowserRouter } from 'react-router'

import { NotFoundPage } from '@/features/not-found/not-found-page'
import { AppShell } from '@/presentation/app-shell'
import { ErrorScreen } from '@/presentation/error-screen'

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
      {
        lazy: async () => ({
          Component: (await import('@/features/shelf/game-home-page'))
            .GameHomePage
        }),
        path: ':game'
      },
      {
        lazy: async () => ({
          Component: (await import('@/features/host/host-console-page'))
            .HostConsolePage
        }),
        path: 'host/:roomCode'
      },
      {
        lazy: async () => ({
          Component: (await import('@/features/player/player-page')).PlayerPage
        }),
        path: 'play/:roomCode'
      },
      { Component: NotFoundPage, path: '*' }
    ],
    // On the root, so a throw anywhere below replaces the shell instead of
    // rendering a fallback inside chrome that may be part of what broke.
    ErrorBoundary: ErrorScreen
  }
])
