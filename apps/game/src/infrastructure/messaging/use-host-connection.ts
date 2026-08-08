import { useCallback, useState } from 'react'

import { decodeMessage } from '@blindtest/protocol/codec'
import type { RoomCode } from '@blindtest/protocol/identifiers'
import type { HostRoomView } from '@blindtest/protocol/room'
import { hostServerMessageSchema } from '@blindtest/protocol/server-message'

import { type RoomSocket, useRoomSocket } from './use-room-socket'

export type HostConnection = RoomSocket & {
  view: HostRoomView | null
}

export const useHostConnection = (roomCode: RoomCode): HostConnection => {
  const [view, setView] = useState<HostRoomView | null>(null)

  const onFrame = useCallback((raw: string) => {
    const decoded = decodeMessage(hostServerMessageSchema, raw)

    if (decoded.status === 'success' && 'view' in decoded.message) {
      setView(decoded.message.view)
    }
  }, [])

  const socket = useRoomSocket({
    enabled: true,
    nickname: null,
    onFrame,
    role: 'host',
    roomCode
  })

  return { ...socket, view }
}
