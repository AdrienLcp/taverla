import { useEffect, useRef } from 'react'

import type { RoomPhase } from '@taverla/protocol/room'

/**
 * A refusal is about the moment it happened, and the socket keeps its last one
 * until it reconnects — which is far too long a life for a message about
 * something the room has stopped doing: left on screen into the next phase, it
 * reads as a refusal of whatever that phase is asking.
 */
export const useForgetErrorOnPhaseChange = ({
  clearError,
  view
}: {
  clearError: () => void
  view: { phase: RoomPhase } | null
}): void => {
  const phase = view?.phase ?? null
  const clearedFor = useRef<RoomPhase | null>(null)

  useEffect(() => {
    if (clearedFor.current === phase) {
      return
    }

    clearedFor.current = phase
    clearError()
  }, [clearError, phase])
}
