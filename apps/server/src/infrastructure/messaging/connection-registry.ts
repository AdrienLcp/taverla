import type { RoomCode } from '@blindtest/protocol/identifiers'

import type { Connection } from './connection'

const connectionsByRoom = new Map<RoomCode, Set<Connection>>()

export const registerConnection = (
  code: RoomCode,
  connection: Connection
): void => {
  const existing = connectionsByRoom.get(code)

  if (existing === undefined) {
    connectionsByRoom.set(code, new Set([connection]))

    return
  }

  existing.add(connection)
}

export const unregisterConnection = (
  code: RoomCode,
  connection: Connection
): void => {
  const existing = connectionsByRoom.get(code)

  if (existing === undefined) {
    return
  }

  existing.delete(connection)

  if (existing.size === 0) {
    connectionsByRoom.delete(code)
  }
}

export const connectionsIn = (code: RoomCode): Connection[] => [
  ...(connectionsByRoom.get(code) ?? [])
]

export const hasConnections = (code: RoomCode): boolean =>
  connectionsByRoom.has(code)

/**
 * The room keeps its `hostSessionId` after the host closes their tab, so this
 * is what separates "the host is reloading and may come back" from "a second
 * screen is trying to take the room over".
 */
export const isHostConnected = (code: RoomCode): boolean =>
  connectionsIn(code).some((connection) => connection.role === 'host')
