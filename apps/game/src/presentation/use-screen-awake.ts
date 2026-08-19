import { useEffect } from 'react'

import { keepScreenAwake } from '@/infrastructure/env'

/**
 * A phone here carries the whole state of the game and is pressed a handful of
 * times a round, and a screen lock counts presses rather than attention — so
 * the screen a player is reading goes dark while they read it.
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
