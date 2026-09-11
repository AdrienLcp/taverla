import { useEffect } from 'react'

import { keepScreenAwake } from '@/infrastructure/browser'

/**
 * A player's screen here is read far more often than it is pressed — it is the
 * one screen a player is sure to have — and a screen lock counts presses rather
 * than attention, so the screen they are reading goes dark while they read it.
 *
 * Held for as long as a game is running rather than for the round in play — a
 * screen that sleeps during the lobby misses the countdown, which is the moment
 * it most needs to be awake. What ends it is an exit, not a phase: a seat given
 * up, a room closed, or a game whose board is now final and may sit on a table
 * for the rest of the evening.
 */
export const useScreenAwake = (isWanted: boolean): void => {
  useEffect(() => {
    if (!isWanted) {
      return
    }

    return keepScreenAwake()
  }, [isWanted])
}
