import { encodeChecked } from '@taverla/protocol/codec'
import type { ProtocolErrorCode } from '@taverla/protocol/error-code'
import type { SessionId } from '@taverla/protocol/identifiers'
import {
  hostServerMessageSchema,
  playerServerMessageSchema,
  protocolErrorMessageSchema,
  timePongMessageSchema,
  wallServerMessageSchema
} from '@taverla/protocol/server-message'
import { PROTOCOL_VERSION } from '@taverla/protocol/version'

import type { Room } from '@/domain/room/room'
import { toHostView, toPlayerView, toWallView } from '@/domain/room/room-view'

import type { Connection, Outbound } from './connection'
import { isHostConnected, isWallConnected } from './room-connections'
import type { RoomEngine } from './room-engine'

export const sendError = (
  outbound: Outbound,
  {
    code,
    fatal,
    message
  }: { code: ProtocolErrorCode; fatal: boolean; message: string }
): void => {
  outbound.send(
    encodeChecked(protocolErrorMessageSchema, {
      code,
      fatal,
      message,
      type: 'error'
    })
  )
}

export const sendPong = (
  outbound: Outbound,
  { clientSentAt, serverTime }: { clientSentAt: number; serverTime: number }
): void => {
  outbound.send(
    encodeChecked(timePongMessageSchema, {
      clientSentAt,
      serverTime,
      type: 'time.pong'
    })
  )
}

/**
 * The one place a connection's role picks its view, for the welcome and every
 * update alike. Encoding runs through the role's own schema, so a field that
 * reached the wrong projection by mistake is stripped before it leaves the
 * process rather than shipped — see `encodeChecked`.
 */
const encodeViewFor = (
  connection: Connection,
  {
    envelope,
    isHostThere,
    isWallThere,
    now,
    room
  }: {
    envelope:
      | {
          protocolVersion: number
          serverTime: number
          sessionId: SessionId
          type: 'welcome'
        }
      | { type: 'room.updated' }
    isHostThere: boolean
    isWallThere: boolean
    now: number
    room: Room
  }
): string => {
  switch (connection.role) {
    case 'host': {
      return encodeChecked(hostServerMessageSchema, {
        ...envelope,
        view: toHostView({
          isHostConnected: isHostThere,
          isWallConnected: isWallThere,
          now,
          room,
          seatId: connection.playerId
        })
      })
    }

    case 'player': {
      return encodeChecked(playerServerMessageSchema, {
        ...envelope,
        view: toPlayerView({
          isHostConnected: isHostThere,
          now,
          room,
          youId: connection.playerId
        })
      })
    }

    case 'wall': {
      return encodeChecked(wallServerMessageSchema, {
        ...envelope,
        view: toWallView({ isHostConnected: isHostThere, now, room })
      })
    }
  }
}

export const sendWelcome = (
  connection: Connection,
  { engine, sessionId }: { engine: RoomEngine; sessionId: SessionId }
): void => {
  const now = engine.now()

  connection.send(
    encodeViewFor(connection, {
      envelope: {
        protocolVersion: PROTOCOL_VERSION,
        serverTime: now,
        sessionId,
        type: 'welcome'
      },
      isHostThere: isHostConnected(engine),
      isWallThere: isWallConnected(engine),
      now,
      room: engine.room
    })
  )
}

/** Each socket receives its whole role-scoped view, never a delta. */
export const broadcastRoom = (engine: RoomEngine): void => {
  const isHostThere = isHostConnected(engine)
  const isWallThere = isWallConnected(engine)
  const now = engine.now()

  for (const connection of engine.connections.all()) {
    connection.send(
      encodeViewFor(connection, {
        envelope: { type: 'room.updated' },
        isHostThere,
        isWallThere,
        now,
        room: engine.room
      })
    )
  }
}
