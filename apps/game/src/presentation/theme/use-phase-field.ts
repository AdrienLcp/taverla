import { useEffect } from 'react'

import type { RoomPhase } from '@blindtest/protocol/room'

/**
 * The phase is the design. Each one owns a field colour, and the whole document
 * is repainted when it changes — which is why the attribute goes on the root
 * element rather than on a component: the field has to survive an overscroll
 * bounce, where what shows is the document's own background and not any div.
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
