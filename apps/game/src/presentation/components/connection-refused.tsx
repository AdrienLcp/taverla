import type { ProtocolErrorMessage } from '@taverla/protocol/server-message'

import { joinPath } from '@/infrastructure/router/navigation'
import { useTranslate } from '@/presentation/i18n/i18n-provider'
import { protocolErrorKey } from '@/presentation/i18n/translation'

import { Link } from './link'

import './connection-refused.sass'

type ConnectionRefusedProps = {
  /** `null` when the socket died without the server naming a reason. */
  error: ProtocolErrorMessage | null
}

/**
 * The end of the line: the server has said why, and the client has stopped
 * retrying. What the screen was showing is stale from here on, so it is
 * replaced rather than annotated — a scoreboard left under a dead socket
 * invites pressing buttons whose frames go nowhere.
 */
export const ConnectionRefused = ({ error }: ConnectionRefusedProps) => {
  const translate = useTranslate()

  return (
    <section className='connection-refused'>
      <h2>
        {translate(
          error === null ? 'connection.refused' : protocolErrorKey(error.code)
        )}
      </h2>
      <Link href={joinPath} size='large' variant='outlined'>
        {translate('notFound.back')}
      </Link>
    </section>
  )
}
