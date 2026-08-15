import { type ReactNode, useCallback, useEffect, useState } from 'react'

import { createSafeContext } from '@/helpers/contexts'

/**
 * The ways out of a room, offered upwards by the screen that is inside one. The
 * menu in the shell is the only chrome on every surface, so it is where a way
 * out has to be — and it holds no socket, so it cannot send one itself.
 *
 * Each is `null` on a screen that cannot offer it, and the menu shows what is
 * left. They are three different scopes on purpose: a seat, a game and a room
 * are not the same thing to leave.
 */
export type RoomExits = {
  /** Everyone out and the room gone for good. The host console's alone. */
  closeRoom: (() => void) | null
  /** Ends the game and puts the final board up. `null` while no game is in play. */
  endGame: (() => void) | null
  /** Gives the seat up, so the roster on the big screen is true at once. */
  leaveSeat: (() => void) | null
}

const NO_EXITS: RoomExits = {
  closeRoom: null,
  endGame: null,
  leaveSeat: null
}

type ExitChannel = {
  exits: RoomExits
  report: (exits: RoomExits) => void
}

const [ExitContext, useChannel] =
  createSafeContext<ExitChannel>('RoomExitsProvider')

export const RoomExitsProvider = ({ children }: { children: ReactNode }) => {
  const [exits, setExits] = useState<RoomExits>(NO_EXITS)

  // Stable, because it is a dependency of the effect that reports: rebuilt each
  // render, that effect would run on every one of them and set state from
  // inside itself.
  const report = useCallback((next: RoomExits) => {
    setExits(next)
  }, [])

  return <ExitContext value={{ exits, report }}>{children}</ExitContext>
}

/** Every entry `null` on a screen that is not inside a room. */
export const useRoomExits = (): RoomExits => useChannel().exits

/**
 * Whether the screen below is inside a room at all, which is what the menu asks
 * before offering a plain link out. Navigating away closes the socket, and the
 * server cannot tell that from a closed tab: a host who followed one would leave
 * the round frozen on every phone with their own screen saying nothing.
 *
 * Any one of the three answers it — a console always offers to close the room,
 * and a seated player always offers to leave.
 */
export const useIsInsideRoom = (): boolean => {
  const { closeRoom, endGame, leaveSeat } = useRoomExits()

  return closeRoom !== null || endGame !== null || leaveSeat !== null
}

/**
 * Each function has to keep its identity across renders or this reports on
 * every one of them — see the `useCallback` note in
 * `.claude/rules/react-components.md`, which is about exactly this case.
 */
export const useReportRoomExits = ({
  closeRoom,
  endGame,
  leaveSeat
}: RoomExits) => {
  const { report } = useChannel()

  useEffect(() => {
    report({ closeRoom, endGame, leaveSeat })

    return () => {
      report(NO_EXITS)
    }
  }, [closeRoom, endGame, leaveSeat, report])
}
