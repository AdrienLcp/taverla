import { type ReactNode, useCallback, useEffect, useState } from 'react'

import { createSafeContext } from '@/helpers/contexts'

/** Gives the seat up on the server, so the roster on the big screen is true at once. */
export type LeaveSeat = () => void

type SeatChannel = {
  leave: LeaveSeat | null
  report: (leave: LeaveSeat | null) => void
}

const [SeatContext, useChannel] = createSafeContext<SeatChannel>('SeatProvider')

/**
 * The same direction as the connection channel, and for the same reason: the
 * seat belongs to the player screen, while the only way *off* that screen is the
 * menu in the shell above it. So the screen offers how to leave and the menu
 * calls it, rather than the menu learning what a seat is.
 *
 * A host screen offers nothing, which is right — a host leaving is a host who
 * can come back to the room they are still running.
 */
export const SeatProvider = ({ children }: { children: ReactNode }) => {
  const [leave, setLeave] = useState<LeaveSeat | null>(null)

  // Stable, because it is a dependency of the effect that reports: rebuilt each
  // render, that effect would run on every one of them and set state from
  // inside itself. `setState` also *calls* a function argument rather than
  // storing it, so the updater form is what puts a callback into state.
  const report = useCallback((next: LeaveSeat | null) => {
    setLeave(() => next)
  }, [])

  return <SeatContext value={{ leave, report }}>{children}</SeatContext>
}

/** `null` on every screen that holds no seat. */
export const useLeaveSeat = (): LeaveSeat | null => useChannel().leave

/**
 * The argument has to keep its identity across renders or this reports on every
 * one of them — see the `useCallback` note in `.claude/rules/react-components.md`,
 * which is about exactly this case.
 */
export const useReportSeat = (leave: LeaveSeat | null) => {
  const { report } = useChannel()

  useEffect(() => {
    report(leave)

    return () => {
      report(null)
    }
  }, [leave, report])
}
