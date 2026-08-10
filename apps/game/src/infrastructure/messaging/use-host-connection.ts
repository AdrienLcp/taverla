import { useCallback, useState } from 'react'

import { decodeMessage } from '@taverla/protocol/codec'
import type { RoomCode } from '@taverla/protocol/identifiers'
import type { HostRoomView } from '@taverla/protocol/room'
import { hostServerMessageSchema } from '@taverla/protocol/server-message'

import { type RoomSocket, useRoomSocket } from './use-room-socket'

export type HostConnection = RoomSocket & {
  view: HostRoomView | null
}

/**
 * A nickname takes a seat as well as the room: the same socket carries both,
 * which is what lets the server withhold the answer from a host who is playing.
 * It is part of the connection rather than a later message because the seat has
 * to survive a reconnect the same way a player's does.
 */
export const useHostConnection = (
  roomCode: RoomCode,
  nickname: string | null
): HostConnection => {
  const [view, setView] = useState<HostRoomView | null>(null)

  const onFrame = useCallback((raw: string) => {
    const decoded = decodeMessage(hostServerMessageSchema, raw)

    if (decoded.status === 'success' && 'view' in decoded.message) {
      setView(decoded.message.view)
    }
  }, [])

  const socket = useRoomSocket({
    enabled: true,
    nickname,
    onFrame,
    role: 'host',
    roomCode
  })

  return { ...socket, view }
}
