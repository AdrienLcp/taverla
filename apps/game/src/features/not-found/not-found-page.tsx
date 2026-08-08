import { Link } from 'react-router'

import { joinPath } from '@/infrastructure/router/navigation'

import './not-found-page.sass'

/**
 * Rendered in place, never navigated to, so the URL survives: a mistyped room
 * code stays visible and correctable in the address bar.
 */
export const NotFoundPage = () => (
  <main className='not-found-page'>
    <h1>Nothing here</h1>
    <p>That game is over, or the code was mistyped.</p>
    <Link to={joinPath}>Back to the start</Link>
  </main>
)
