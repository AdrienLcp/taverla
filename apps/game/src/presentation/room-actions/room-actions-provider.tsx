import { type ReactNode, useCallback, useEffect, useState } from 'react'

import { createSafeContext } from '@/helpers/contexts'

/**
 * What a screen inside a room offers the menu above it. The menu in the shell is
 * the only chrome on every surface, so anything that has to be reachable at
 * every phase belongs there — and it holds no socket, so it cannot send a frame
 * on its own.
 *
 * Each entry is `null` on a screen that cannot offer it, and the menu shows what
 * is left. The three exits are three different scopes on purpose: a seat, a game
 * and a room are not the same thing to leave.
 */
export type RoomActions = {
  /** Everyone out and the room gone for good. The host console's alone. */
  closeRoom: (() => void) | null
  /** Ends the game and puts the final board up. `null` while no game is in play. */
  endGame: (() => void) | null
  /** Gives the seat up, so the roster on the big screen is true at once. */
  leaveSeat: (() => void) | null
  /**
   * The name the last rename was refused for, so the menu can hold its field
   * invalid for exactly that draft and let anything else through. A controlled
   * `isInvalid` that outlives its reason makes the native submit a silent no-op.
   */
  refusedNickname: string | null
  /** Changes the name the seat is held under, socket and round untouched. */
  rename: ((nickname: string) => void) | null
  /** What the room calls this screen right now. `null` where no seat is held. */
  seatNickname: string | null
}

const NO_ACTIONS: RoomActions = {
  closeRoom: null,
  endGame: null,
  leaveSeat: null,
  refusedNickname: null,
  rename: null,
  seatNickname: null
}

type ActionChannel = {
  actions: RoomActions
  report: (actions: RoomActions) => void
}

const [ActionContext, useChannel] = createSafeContext<ActionChannel>(
  'RoomActionsProvider'
)

export const RoomActionsProvider = ({ children }: { children: ReactNode }) => {
  const [actions, setActions] = useState<RoomActions>(NO_ACTIONS)

  // Stable, because it is a dependency of the effect that reports: rebuilt each
  // render, that effect would run on every one of them and set state from
  // inside itself.
  const report = useCallback((next: RoomActions) => {
    setActions(next)
  }, [])

  return <ActionContext value={{ actions, report }}>{children}</ActionContext>
}

/** Every entry `null` on a screen that is not inside a room. */
export const useRoomActions = (): RoomActions => useChannel().actions

/**
 * Whether the screen below is inside a room at all, which is what the menu asks
 * before offering a plain link out. Navigating away closes the socket, and the
 * server cannot tell that from a closed tab: a host who followed one would leave
 * the round frozen on every phone with their own screen saying nothing.
 *
 * Any one of the three exits answers it — a console always offers to close the
 * room, and a seated player always offers to leave.
 */
export const useIsInsideRoom = (): boolean => {
  const { closeRoom, endGame, leaveSeat } = useRoomActions()

  return closeRoom !== null || endGame !== null || leaveSeat !== null
}

/**
 * Each function has to keep its identity across renders or this reports on
 * every one of them — see the `useCallback` note in
 * `.claude/rules/react-components.md`, which is about exactly this case. The
 * two names are plain strings for the same reason: an object built here would
 * be a fresh dependency on every render.
 */
export const useReportRoomActions = ({
  closeRoom,
  endGame,
  leaveSeat,
  refusedNickname,
  rename,
  seatNickname
}: RoomActions) => {
  const { report } = useChannel()

  useEffect(() => {
    report({
      closeRoom,
      endGame,
      leaveSeat,
      refusedNickname,
      rename,
      seatNickname
    })

    return () => {
      report(NO_ACTIONS)
    }
  }, [
    closeRoom,
    endGame,
    leaveSeat,
    refusedNickname,
    rename,
    report,
    seatNickname
  ])
}
