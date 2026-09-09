import type React from 'react'
import { RouterProvider as ReactAriaRouterProvider } from 'react-aria-components'
import { Outlet, useNavigate } from 'react-router'

import { AppMenu } from '@/presentation/components/app-menu'
import { ConnectionProvider } from '@/presentation/connection/connection-provider'
import { RoomActionsProvider } from '@/presentation/room-actions/room-actions-provider'

import './app-shell.sass'

/**
 * The react-aria provider is what makes an `href` on a `Link` a client-side
 * navigation. Without it the browser reloads the page, which on the player
 * screen means dropping the socket and re-claiming the seat.
 */
export const AppShell: React.FC = () => {
  const navigate = useNavigate()

  return (
    <ReactAriaRouterProvider navigate={navigate}>
      <ConnectionProvider>
        <RoomActionsProvider>
          <div className='app-shell'>
            <AppMenu />
            <Outlet />
          </div>
        </RoomActionsProvider>
      </ConnectionProvider>
    </ReactAriaRouterProvider>
  )
}
