import type { ClockEstimate } from '@taverla/core/time/clock-sync'

import type { SocketStatus } from '@/infrastructure/messaging/use-room-socket'
import { useTranslate } from '@/presentation/i18n/i18n-provider'
import type { TranslationKey } from '@/presentation/i18n/translation'

import './connection-status.sass'

/**
 * A literal template rather than a lookup, for the same reason as
 * `protocolErrorKey`: adding a state to `SocketStatus` fails to compile until
 * every locale has named it.
 */
export const connectionStatusKey = (status: SocketStatus): TranslationKey =>
  `connection.${status}`

type ConnectionDotProps = {
  /** Told apart by shape and motion — a hue that reads on one field vanishes on another. */
  status: SocketStatus
}

/** Decorative alone: whatever renders it also renders the word beside it. */
export const ConnectionDot = ({ status }: ConnectionDotProps) => (
  <span aria-hidden='true' className={`connection-dot ${status}`} />
)

type ConnectionStatusProps = {
  /** `null` until the first exchange completes; the offset is shown once it lands. */
  clock: ClockEstimate | null
  status: SocketStatus
}

export const ConnectionStatus = ({ clock, status }: ConnectionStatusProps) => {
  const translate = useTranslate()

  return (
    <p className='connection-status'>
      <ConnectionDot status={status} />
      {translate(connectionStatusKey(status))}
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
