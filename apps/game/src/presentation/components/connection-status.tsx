import type { ClockEstimate } from '@blindtest/core/time/clock-sync'

import type { SocketStatus } from '@/infrastructure/messaging/use-room-socket'

import './connection-status.sass'

const LABELS: Record<SocketStatus, string> = {
  closed: 'Reconnecting',
  connecting: 'Connecting',
  open: 'Live'
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
export const ConnectionStatus = ({ clock, status }: ConnectionStatusProps) => (
  <p className={`connection-status ${status}`} role='status'>
    <span aria-hidden='true' className='dot' />
    {LABELS[status]}
    {clock !== null && (
      <span className='clock'>
        · clock ±{Math.round(clock.roundTripMs / 2)} ms
      </span>
    )}
  </p>
)
