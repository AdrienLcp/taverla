import { createSafeContext } from '@adrienlcp/react'
import type React from 'react'
import { useEffect, useState } from 'react'

import type { ClockEstimate } from '@taverla/core/time/clock-sync'

import type { SocketStatus } from '@/infrastructure/messaging/use-room-socket'

export type ScreenConnection = {
  clock: ClockEstimate | null
  status: SocketStatus
}

type ConnectionChannel = {
  connection: ScreenConnection | null
  report: (connection: ScreenConnection | null) => void
}

const [ConnectionContext, useChannel] =
  createSafeContext<ConnectionChannel>('ConnectionProvider')

/**
 * The socket belongs to a screen, and the chrome that displays its state
 * belongs to the shell above it — so the state travels up rather than the menu
 * travelling down into three pages that would each mount their own.
 */
export const ConnectionProvider: React.FC<{ children: React.ReactNode }> = ({
  children
}) => {
  const [connection, setConnection] = useState<ScreenConnection | null>(null)

  return (
    <ConnectionContext value={{ connection, report: setConnection }}>
      {children}
    </ConnectionContext>
  )
}

/** `null` on a screen that holds no socket — the home page, a bad room code. */
export const useConnection = (): ScreenConnection | null =>
  useChannel().connection

export const useReportConnection = ({ clock, status }: ScreenConnection) => {
  const { report } = useChannel()

  useEffect(() => {
    report({ clock, status })

    return () => {
      report(null)
    }
  }, [clock, report, status])
}
