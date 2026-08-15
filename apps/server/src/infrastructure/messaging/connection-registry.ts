import type { PlayerId, RoomCode } from '@taverla/protocol/identifiers'

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
 * Where a failure the host has to see goes when nobody asked for it — a track
 * the catalogue would not serve while the room was advancing on its own.
 */
export const hostConnectionIn = (code: RoomCode): Connection | null =>
  connectionsIn(code).find((connection) => connection.role === 'host') ?? null

/**
 * The room keeps its `hostSessionId` after the host closes their tab, so this
 * is what separates "the host is reloading and may come back" from "a second
 * screen is trying to take the room over".
 */
export const isHostConnected = (code: RoomCode): boolean =>
  connectionsIn(code).some((connection) => connection.role === 'host')

/**
 * The same question for a seat, and a seated host holds one too. Two sockets on
 * one seat is ordinary rather than a fault: `seatPlayer` reclaims by
 * `sessionId`, so a phone that switched network is welcomed back before the
 * socket it left behind is known to be dead.
 */
export const isSeatConnected = (code: RoomCode, playerId: PlayerId): boolean =>
  connectionsIn(code).some((connection) => connection.playerId === playerId)
