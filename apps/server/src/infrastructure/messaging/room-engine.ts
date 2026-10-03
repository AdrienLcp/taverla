import type { Room } from '@/domain/room/room'
import {
  earliestDeadline,
  type RoomDeadline,
  roomDeadlines
} from '@/domain/room/room-deadlines'

import type { Connection } from './connection'
import { broadcastRoom } from './outbound'
import { isHostConnected } from './room-connections'

/**
 * What a room needs from the process keeping it. Nothing here is global: two
 * rooms sharing a process — or a runtime evicting one and keeping the other —
 * must never see each other's sockets, clock or deadlines.
 */
export type RoomPorts = {
  connections: {
    add: (connection: Connection) => void
    all: () => Connection[]
    remove: (connection: Connection) => void
  }
  /** The room is over: whatever holds it lets it go, and its code stops resolving. */
  discard: () => void
  now: () => number
  /** Called after every accepted change, with the whole room — rule 3 applies to storage too. */
  persist: (room: Room) => void
  /** One wake at a time, replacing the last; `null` cancels it. */
  wakeAt: (at: number | null) => void
}

export type RoomEngine = RoomPorts & {
  isClosed: boolean
  /** Not persisted: a draw is an `await` in flight, and nothing outlives one. */
  isDrawing: boolean
  room: Room
}

export const createRoomEngine = (room: Room, ports: RoomPorts): RoomEngine => ({
  ...ports,
  isClosed: false,
  isDrawing: false,
  room
})

export const deadlinesOf = (engine: RoomEngine): RoomDeadline[] =>
  roomDeadlines({
    hasConnections: engine.connections.all().length > 0,
    isDrawing: engine.isDrawing,
    isHostConnected: isHostConnected(engine),
    now: engine.now(),
    room: engine.room
  })

export const commitRoom = (engine: RoomEngine): void => {
  if (engine.isClosed) {
    return
  }

  engine.persist(engine.room)
  engine.wakeAt(earliestDeadline(deadlinesOf(engine))?.at ?? null)
}

/** Where every state change ends: each socket is sent its view, then the room is kept. */
export const publishRoom = (engine: RoomEngine): void => {
  broadcastRoom(engine)
  commitRoom(engine)
}

export const closeRoomEngine = (engine: RoomEngine): void => {
  engine.isClosed = true
  engine.wakeAt(null)
  engine.discard()
}
