import type { PlayerId } from '@taverla/protocol/identifiers'

import type { Connection } from './connection'
import type { RoomEngine } from './room-engine'

/**
 * Where a failure the host has to see goes when nobody asked for it — a track
 * the catalogue would not serve while the room was advancing on its own.
 */
export const hostConnectionIn = (engine: RoomEngine): Connection | null =>
  engine.connections.all().find((connection) => connection.role === 'host') ??
  null

/**
 * The room keeps its `hostSessionId` after the host closes their tab, so this
 * is what separates "the host is reloading and may come back" from "a second
 * screen is trying to take the room over".
 */
export const isHostConnected = (engine: RoomEngine): boolean =>
  engine.connections.all().some((connection) => connection.role === 'host')

/** Read by the console, which leaves the clip to a wall whenever one is there. */
export const isWallConnected = (engine: RoomEngine): boolean =>
  engine.connections.all().some((connection) => connection.role === 'wall')

/**
 * The same question for a seat, and a seated host holds one too. Two sockets on
 * one seat is ordinary rather than a fault: `seatPlayer` reclaims by
 * `sessionId`, so a player who switched network is welcomed back before the
 * socket it left behind is known to be dead.
 */
export const isSeatConnected = (
  engine: RoomEngine,
  playerId: PlayerId
): boolean =>
  engine.connections
    .all()
    .some((connection) => connection.playerId === playerId)

/**
 * A host is the one socket that outlives its own seat — a player closes theirs
 * — so the seat has to be taken off the connection wherever the roster loses
 * it, not only on the exit that screen chose. `toHostView` reads the seat from
 * here, and a console still naming a departed player is served the round with
 * the answer withheld and nothing left to judge with.
 */
export const forgetSeat = (engine: RoomEngine, playerId: PlayerId): void => {
  for (const connection of engine.connections.all()) {
    if (connection.role === 'host' && connection.playerId === playerId) {
      connection.playerId = null
    }
  }
}
