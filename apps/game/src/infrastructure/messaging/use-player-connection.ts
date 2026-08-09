import { useCallback, useState } from 'react'

import { decodeMessage } from '@taverla/protocol/codec'
import type { RoomCode } from '@taverla/protocol/identifiers'
import type { PlayerRoomView } from '@taverla/protocol/room'
import { playerServerMessageSchema } from '@taverla/protocol/server-message'

import { type RoomSocket, useRoomSocket } from './use-room-socket'

export type PlayerConnection = RoomSocket & {
  view: PlayerRoomView | null
}

/**
 * Stays disconnected until the player has named themselves — the server rejects
 * a nameless `hello`, so opening the socket earlier would only produce an error
 * frame the join form would have to hide.
 */
export const usePlayerConnection = ({
  nickname,
  roomCode
}: {
  nickname: string | null
  roomCode: RoomCode
}): PlayerConnection => {
  const [view, setView] = useState<PlayerRoomView | null>(null)

  const onFrame = useCallback((raw: string) => {
    const decoded = decodeMessage(playerServerMessageSchema, raw)

    if (decoded.status === 'success' && 'view' in decoded.message) {
      setView(decoded.message.view)
    }
  }, [])

  const socket = useRoomSocket({
    enabled: nickname !== null,
    nickname,
    onFrame,
    role: 'player',
    roomCode
  })

  return { ...socket, view }
}
