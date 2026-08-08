import { createBrowserRouter } from 'react-router'

import { NotFoundPage } from '@/features/not-found/not-found-page'

/**
 * The host console and the player screen are lazily loaded, which is the whole
 * reason one app can serve both: a phone joining a game downloads the buzzer,
 * not the QR code renderer and the audio player it will never run.
 */
export const router = createBrowserRouter([
  {
    index: true,
    lazy: async () => ({
      Component: (await import('@/features/join/join-page')).JoinPage
    })
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
])
