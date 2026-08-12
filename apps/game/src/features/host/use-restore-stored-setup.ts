import { useEffect, useRef } from 'react'

import type { HostRoomView, RoomSettings } from '@taverla/protocol/room'

import {
  type HostPreferences,
  restoredSettings
} from '@taverla/core/room/host-preferences'

/**
 * A room is created by the server, on the server's defaults, so what this host
 * last set is applied from here — one frame, in the lobby, and never again for
 * this room.
 *
 * Only the *first* view counts, whatever phase it arrives in. A console that
 * reloaded mid-game must not re-apply anything: the server would refuse the
 * three settings a round is built on, and the rest would be somebody's evening
 * rearranged under them between two rounds.
 */
export const useRestoreStoredSetup = ({
  onRestore,
  preferences,
  view
}: {
  /** Must be stable — it is an effect's dependency. */
  onRestore: (settings: RoomSettings) => void
  preferences: HostPreferences | null
  view: HostRoomView | null
}): void => {
  const hasSeenRoom = useRef(false)

  useEffect(() => {
    if (view === null || hasSeenRoom.current) {
      return
    }

    hasSeenRoom.current = true

    if (view.phase === 'lobby' && preferences !== null) {
      onRestore(restoredSettings({ preferences, settings: view.settings }))
    }
  }, [onRestore, preferences, view])
}
