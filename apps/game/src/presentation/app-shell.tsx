import { RouterProvider as ReactAriaRouterProvider } from 'react-aria-components'
import { Outlet, useNavigate } from 'react-router'

import { PreferencesBar } from '@/presentation/components/preferences-bar'

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
      <div className='app-shell'>
        <Outlet />
        <PreferencesBar />
      </div>
    </ReactAriaRouterProvider>
  )
}
