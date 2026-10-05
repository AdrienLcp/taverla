import { useEffect } from 'react'

import type { RoomPhase } from '@taverla/protocol/room'

/**
 * Publishes the room's phase on the root element, where the tokens turn it into
 * `--phase-ink` — the colour of the score track around the console. The board
 * itself never repaints; the attribute sits on the root so the track, which
 * renders beside `<main>`, reads the same value as everything inside it.
 *
 * `lobby` is the token default, so a first paint that happens before this has
 * run is already the right colour and there is no flash to avoid.
 */
export const usePhaseField = (phase: RoomPhase | null): void => {
  useEffect(() => {
    if (phase === null) {
      delete document.documentElement.dataset.phase

      return
    }

    document.documentElement.dataset.phase = phase

    return () => {
      delete document.documentElement.dataset.phase
    }
  }, [phase])
}
