import type { WSContext, WSEvents } from 'hono/ws'
import { nanoid } from 'nanoid'

import {
  type ClientMessage,
  clientMessageSchema,
  type HelloMessage,
  HOST_ONLY_MESSAGE_TYPES
} from '@blindtest/protocol/client-message'
import { decodeMessage } from '@blindtest/protocol/codec'
import type { RoomCode } from '@blindtest/protocol/identifiers'
import { PROTOCOL_VERSION } from '@blindtest/protocol/version'

import { normalizeRoomCode } from '@blindtest/core/room/room-code'

import type { Room } from '@/domain/room/room'
import {
  claimHost,
  joinAsPlayer,
  markPlayerDisconnected
} from '@/domain/room/room-service'
import { findRoom } from '@/domain/room/room-store'
import { logger } from '@/infrastructure/logging/logger'

import type { Connection, Outbound } from './connection'
import {
  isHostConnected,
  registerConnection,
  unregisterConnection
} from './connection-registry'
import { broadcastRoom, sendError, sendPong, sendWelcome } from './outbound'

/** Policy violation. The client shows the error it was just sent and stops retrying. */
const CLOSE_CODE_POLICY = 1008

/**
 * One of these exists per socket, and the closure is the connection's state:
 * `connection` is `null` until `hello` lands, which is what makes "the first
 * frame must introduce you" enforceable without a side table keyed on the
 * socket.
 */
export const createRoomSocketEvents = (
  rawRoomCode: string | undefined
): WSEvents => {
  let connection: Connection | null = null
  let roomCode: RoomCode | null = null

  const reject = (
    outbound: Outbound,
    ws: WSContext,
    code: Parameters<typeof sendError>[1]['code'],
    message: string
  ): void => {
    sendError(outbound, { code, fatal: true, message })
    ws.close(CLOSE_CODE_POLICY, code)
  }

  const introduce = (
    message: HelloMessage,
    outbound: Outbound,
    ws: WSContext
  ): void => {
    if (message.protocolVersion !== PROTOCOL_VERSION) {
      reject(
        outbound,
        ws,
        'protocol_version_mismatch',
        'Reload the page to get the current build'
      )

      return
    }

    const code =
      rawRoomCode === undefined ? null : normalizeRoomCode(rawRoomCode)
    const room = code === null ? null : findRoom(code)

    if (code === null || room === null) {
      reject(
        outbound,
        ws,
        'room_not_found',
        'That room does not exist, or the game is over'
      )

      return
    }

    const sessionId = message.sessionId ?? nanoid(16)
    const seated =
      message.role === 'host'
        ? seatHost({ code, outbound, room, sessionId, ws })
        : seatPlayer({ message, outbound, room, sessionId })

    if (seated === null) {
      return
    }

    connection = seated
    roomCode = code
    registerConnection(code, seated)
    sendWelcome(seated, { room, serverTime: Date.now(), sessionId })
    broadcastRoom(room)
    logger.info('Socket joined', { code, role: seated.role })
  }

  const seatHost = ({
    code,
    outbound,
    room,
    sessionId,
    ws
  }: {
    code: RoomCode
    outbound: Outbound
    room: Room
    sessionId: string
    ws: WSContext
  }): Connection | null => {
    const claimed = claimHost({
      isHostConnected: isHostConnected(code),
      now: Date.now(),
      room,
      sessionId
    })

    if (claimed.status === 'failure') {
      reject(
        outbound,
        ws,
        'host_already_connected',
        'This room is already being hosted'
      )

      return null
    }

    return { playerId: null, role: 'host', send: outbound.send, sessionId }
  }

  /**
   * A refused join is deliberately non-fatal: the socket stays open so the join
   * form can send another `hello` with a different nickname, instead of making
   * the phone reconnect to be told the same thing.
   */
  const seatPlayer = ({
    message,
    outbound,
    room,
    sessionId
  }: {
    message: HelloMessage
    outbound: Outbound
    room: Room
    sessionId: string
  }): Connection | null => {
    if (message.nickname === undefined) {
      sendError(outbound, {
        code: 'invalid_message',
        fatal: false,
        message: 'Choose a nickname to join'
      })

      return null
    }

    const joined = joinAsPlayer({
      nickname: message.nickname,
      now: Date.now(),
      room,
      sessionId
    })

    if (joined.status === 'failure') {
      sendError(outbound, {
        code: joined.error,
        fatal: false,
        message:
          joined.error === 'room_full'
            ? 'This room is full'
            : 'Someone already took that name'
      })

      return null
    }

    return {
      playerId: joined.data.id,
      role: 'player',
      send: outbound.send,
      sessionId
    }
  }

  const dispatch = (
    message: ClientMessage,
    active: Connection,
    outbound: Outbound
  ): void => {
    if (HOST_ONLY_MESSAGE_TYPES.has(message.type) && active.role !== 'host') {
      sendError(outbound, {
        code: 'host_only_action',
        fatal: false,
        message: 'Only the host can do that'
      })

      return
    }

    // The round engine lands in docs/plans/02-round-engine.md. Answering
    // `not_implemented` keeps a half-built stage honest rather than borrowing a
    // code that means something else.
    sendError(outbound, {
      code: 'not_implemented',
      fatal: false,
      message: `"${message.type}" is not served yet`
    })
  }

  return {
    onClose() {
      if (connection === null || roomCode === null) {
        return
      }

      unregisterConnection(roomCode, connection)

      const room = findRoom(roomCode)

      if (room === null) {
        return
      }

      if (connection.role === 'player') {
        markPlayerDisconnected(room, connection.playerId, Date.now())
      }

      broadcastRoom(room)
    },

    onMessage(event, ws) {
      const outbound: Outbound = {
        send: (payload) => {
          ws.send(payload)
        }
      }

      if (typeof event.data !== 'string') {
        sendError(outbound, {
          code: 'invalid_message',
          fatal: false,
          message: 'Only text frames are accepted'
        })

        return
      }

      const decoded = decodeMessage(clientMessageSchema, event.data)

      if (decoded.status === 'failure') {
        logger.warn('Rejected a socket frame', { reason: decoded.reason })
        sendError(outbound, {
          code: 'invalid_message',
          fatal: false,
          message: decoded.reason
        })

        return
      }

      const message = decoded.message

      // Answered before the handshake too, so a client can start estimating the
      // clock offset while the player is still typing their nickname.
      if (message.type === 'time.ping') {
        sendPong(outbound, {
          clientSentAt: message.clientSentAt,
          serverTime: Date.now()
        })

        return
      }

      if (connection === null) {
        if (message.type !== 'hello') {
          reject(
            outbound,
            ws,
            'invalid_message',
            'The first frame must be a hello'
          )

          return
        }

        introduce(message, outbound, ws)

        return
      }

      if (message.type === 'hello') {
        sendError(outbound, {
          code: 'invalid_message',
          fatal: false,
          message: 'This socket has already introduced itself'
        })

        return
      }

      dispatch(message, connection, outbound)
    }
  }
}
