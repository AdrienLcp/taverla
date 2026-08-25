import type { ReactNode } from 'react'

import type { ProtocolErrorMessage } from '@taverla/protocol/server-message'

import { paths } from '@/infrastructure/router/navigation'
import { useTranslate } from '@/presentation/i18n/i18n-provider'
import { protocolErrorKey } from '@/presentation/i18n/translation'

import { Link } from './link'

import './connection-refused.sass'

type ConnectionRefusedProps = {
  /**
   * What this screen can still do about it, between the reason and the way out.
   * A console that holds the room's own token is not at the same dead end as a
   * phone whose room has closed, and only the console's own page knows that.
   */
  children?: ReactNode
  /** `null` when the socket died without the server naming a reason. */
  error: ProtocolErrorMessage | null
}

/**
 * The end of the line: the server has said why, and the client has stopped
 * retrying. What the screen was showing is stale from here on, so it is
 * replaced rather than annotated — a scoreboard left under a dead socket
 * invites pressing buttons whose frames go nowhere.
 */
export const ConnectionRefused = ({
  children,
  error
}: ConnectionRefusedProps) => {
  const translate = useTranslate()

  return (
    <section className='connection-refused'>
      <h2>
        {translate(
          error === null ? 'connection.refused' : protocolErrorKey(error.code)
        )}
      </h2>
      {children}
      <Link href={paths.home} size='large' variant='outlined'>
        {translate('navigation.back')}
      </Link>
    </section>
  )
}
