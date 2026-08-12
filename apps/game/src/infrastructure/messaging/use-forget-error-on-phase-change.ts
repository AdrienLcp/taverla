import { useEffect, useRef } from 'react'

import type { RoomPhase } from '@taverla/protocol/room'

/**
 * A refusal is about the moment it happened, and the socket keeps its last one
 * until it reconnects — which is far too long a life for a message about
 * something the room has stopped doing.
 *
 * Le Fake is what made it matter. Its round has two collection phases, so "that
 * is the real answer", refused while the room was writing, would still be on
 * screen under the board a minute later, where it reads as a refused vote.
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
