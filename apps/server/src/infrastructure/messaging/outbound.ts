import { encodeChecked } from '@taverla/protocol/codec'
import type { ProtocolErrorCode } from '@taverla/protocol/error-code'
import type { SessionId } from '@taverla/protocol/identifiers'
import {
  hostServerMessageSchema,
  playerServerMessageSchema,
  protocolErrorMessageSchema,
  timePongMessageSchema
} from '@taverla/protocol/server-message'
import { PROTOCOL_VERSION } from '@taverla/protocol/version'

import type { Room } from '@/domain/room/room'
import { toHostView, toPlayerView } from '@/domain/room/room-view'
import {
  connectionsIn,
  isHostConnected
} from '@/infrastructure/messaging/connection-registry'

import type { Connection, Outbound } from './connection'

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

export const sendWelcome = (
  connection: Connection,
  {
    room,
    serverTime,
    sessionId
  }: { room: Room; serverTime: number; sessionId: SessionId }
): void => {
  const hostIsThere = isHostConnected(room.code)

  connection.send(
    connection.role === 'host'
      ? encodeChecked(hostServerMessageSchema, {
          protocolVersion: PROTOCOL_VERSION,
          serverTime,
          sessionId,
          type: 'welcome',
          view: toHostView({ isHostConnected: hostIsThere, room })
        })
      : encodeChecked(playerServerMessageSchema, {
          protocolVersion: PROTOCOL_VERSION,
          serverTime,
          sessionId,
          type: 'welcome',
          view: toPlayerView({
            isHostConnected: hostIsThere,
            room,
            youId: connection.playerId
          })
        })
  )
}

/**
 * Every state change ends here: each socket receives its whole role-scoped
 * view. Encoding runs through the role's schema, so a host-only field that
 * reached a player payload by mistake is stripped before it leaves the process
 * rather than shipped — see `encodeChecked`.
 */
export const broadcastRoom = (room: Room): void => {
  const hostIsThere = isHostConnected(room.code)

  for (const connection of connectionsIn(room.code)) {
    connection.send(
      connection.role === 'host'
        ? encodeChecked(hostServerMessageSchema, {
            type: 'room.updated',
            view: toHostView({ isHostConnected: hostIsThere, room })
          })
        : encodeChecked(playerServerMessageSchema, {
            type: 'room.updated',
            view: toPlayerView({
              isHostConnected: hostIsThere,
              room,
              youId: connection.playerId
            })
          })
    )
  }
}
