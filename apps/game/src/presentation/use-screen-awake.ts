import { useEffect } from 'react'

import { keepScreenAwake } from '@/infrastructure/env'

/**
 * A phone here is held one-handed and looked at rarely, which is the exact
 * condition under which it locks its own screen: the product's best moment and
 * its worst failure have the same cause.
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
