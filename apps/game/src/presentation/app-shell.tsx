import { RouterProvider as ReactAriaRouterProvider } from 'react-aria-components'
import { Outlet, useNavigate } from 'react-router'

import { AppMenu } from '@/presentation/components/app-menu'
import { ConnectionProvider } from '@/presentation/connection/connection-provider'
import { RoomExitsProvider } from '@/presentation/exits/room-exits-provider'

import './app-shell.sass'

/**
 * The react-aria provider is what makes an `href` on a `Link` a client-side
 * navigation. Without it the browser reloads the page, which on the player
 * screen means dropping the socket and re-claiming the seat.
 */
export const AppShell = () => {
  const navigate = useNavigate()

  return (
    <ReactAriaRouterProvider
      navigate={(path) => {
        void navigate(path)
      }}
    >
      <ConnectionProvider>
        <RoomExitsProvider>
          <div className='app-shell'>
            <AppMenu />
            <Outlet />
          </div>
        </RoomExitsProvider>
      </ConnectionProvider>
    </ReactAriaRouterProvider>
  )
}
