import type { ClockEstimate } from '@blindtest/core/time/clock-sync'

import type { SocketStatus } from '@/infrastructure/messaging/use-room-socket'
import { useTranslate } from '@/presentation/i18n/i18n-provider'
import type { TranslationKey } from '@/presentation/i18n/translation'

import './connection-status.sass'

const STATUS_KEYS: Record<SocketStatus, TranslationKey> = {
  closed: 'connection.closed',
  connecting: 'connection.connecting',
  open: 'connection.open'
}

type ConnectionStatusProps = {
  /** `null` until the first exchange completes; the offset is shown once it lands. */
  clock: ClockEstimate | null
  status: SocketStatus
}

/**
 * A `role="status"` region rather than decoration: on a phone in a dark room,
 * "did it drop?" is the first question, and a silent reconnect is worse than a
 * visible one.
 */
export const ConnectionStatus = ({ clock, status }: ConnectionStatusProps) => {
  const translate = useTranslate()

  return (
    <p className={`connection-status ${status}`} role='status'>
      <span aria-hidden='true' className='dot' />
      {translate(STATUS_KEYS[status])}
      {clock !== null && (
        <span className='clock'>
          {translate('connection.clock', {
            milliseconds: Math.round(clock.roundTripMs / 2)
          })}
        </span>
      )}
    </p>
  )
}
