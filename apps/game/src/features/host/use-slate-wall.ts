import { useState } from 'react'

import type { HostRoomView } from '@taverla/protocol/room'

import { slateContent } from '@/helpers/round-content'

export type SlateWall = {
  /** The console is showing the item on the wall, rather than the sheets being written. */
  isOnWall: boolean
  showSheets: () => void
  showWall: () => void
}

/**
 * Which half of the slate the console shows. The server's cursor says which
 * item the wall is on; whether the room is looking at it or back at the
 * sheets is the host's to say, and a cursor that moves — an item closed, the
 * rest collected, the next one shown — brings the wall back on its own.
 */
export const useSlateWall = (view: HostRoomView | null): SlateWall => {
  const [isShowingSheets, setIsShowingSheets] = useState(false)
  const [seenCursor, setSeenCursor] = useState<string | null>(null)
  const round = view?.round ?? null
  const itemIndex = slateContent(round)?.currentItemIndex ?? null
  const cursor =
    round === null || itemIndex === null ? null : `${round.id}:${itemIndex}`

  // Reset during render rather than in an effect, so the frame that moves the
  // cursor is already drawn on the wall. Compared against the last cursor seen
  // and not the one the sheets were opened over: the wall can come back to
  // that very item by stepping through the others.
  if (cursor !== seenCursor) {
    setSeenCursor(cursor)
    setIsShowingSheets(false)
  }

  return {
    isOnWall: cursor !== null && !isShowingSheets,
    showSheets: () => setIsShowingSheets(true),
    showWall: () => setIsShowingSheets(false)
  }
}
