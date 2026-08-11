import type { WSContext, WSEvents } from 'hono/ws'
import { nanoid } from 'nanoid'

import {
  type ClientMessage,
  clientMessageSchema,
  type HelloMessage,
  HOST_ONLY_MESSAGE_TYPES
} from '@taverla/protocol/client-message'
import { decodeMessage } from '@taverla/protocol/codec'
import type { PlayerId, RoomCode, RoundId } from '@taverla/protocol/identifiers'
import type { RoomSettings } from '@taverla/protocol/room'
import { PROTOCOL_VERSION } from '@taverla/protocol/version'

import { normalizeRoomCode } from '@taverla/core/room/room-code'

import type { Room } from '@/domain/room/room'
import {
  claimHost,
  joinAsPlayer,
  markPlayerDisconnected,
  removePlayer,
  updateSettings
} from '@/domain/room/room-service'
import { findRoom } from '@/domain/room/room-store'
import {
  applyVerdict,
  everyoneIsDone,
  finishGame,
  isFinalRound,
  registerAnswer,
  registerBuzz,
  releaseBuzz,
  restartGame,
  revealRound,
  settleSimultaneousRound,
  type VerdictOutcome
} from '@/domain/round/round-service'
import { discardPoolIfStale } from '@/domain/round/track-pool'
import { logger } from '@/infrastructure/logging/logger'

import type { Connection, Outbound } from './connection'
import {
  isHostConnected,
  registerConnection,
  unregisterConnection
} from './connection-registry'
import { broadcastRoom, sendError, sendPong, sendWelcome } from './outbound'
import {
  abandonRound,
  armAutoAdvance,
  armPlaybackTimeout,
  beginRound,
  holdPlaybackTimeout,
  holdRoundWhileHostIsAway,
  resumeRoundForHost
} from './round-conductor'

/** Everything `dispatch` can see: `hello` and `time.ping` are answered before it. */
type RoomActionMessage = Exclude<
  ClientMessage,
  { type: 'hello' } | { type: 'time.ping' }
>

const PHASES_A_HOST_MAY_CUT_SHORT = new Set<Room['phase']>([
  'countdown',
  'playing',
  'buzzed'
])

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
        ? seatHost({ code, message, outbound, room, sessionId, ws })
        : seatPlayer({ message, outbound, room, sessionId })

    if (seated === null) {
      return
    }

    connection = seated
    roomCode = code
    registerConnection(code, seated)

    // After registering, never before: the resumed round is broadcast with
    // `isHostConnected` already true, so no socket sees a frame saying the room
    // is running and the host is gone.
    if (seated.role === 'host') {
      resumeRoundForHost(room)
    }

    sendWelcome(seated, { room, serverTime: Date.now(), sessionId })
    broadcastRoom(room)
    logger.info('Socket joined', { code, role: seated.role })
  }

  /**
   * A host who names themselves takes a seat as well as the room. One phone in
   * the middle of a table is both the speaker and a player, and doing it on one
   * socket is what lets the server know — which is what makes withholding the
   * answer from them enforceable rather than a promise.
   */
  const seatHost = ({
    code,
    message,
    outbound,
    room,
    sessionId,
    ws
  }: {
    code: RoomCode
    message: HelloMessage
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

    const seat =
      message.nickname === undefined
        ? null
        : joinAsPlayer({
            nickname: message.nickname,
            now: Date.now(),
            room,
            sessionId
          })

    if (seat?.status === 'failure') {
      sendError(outbound, {
        code: seat.error,
        fatal: false,
        message: 'That seat could not be taken'
      })
    }

    // The registration that makes `isHostConnected` true happens after this
    // returns, so the round is put back on the clock by the caller rather than
    // here — see where the connection is registered.
    return {
      playerId: seat?.status === 'success' ? seat.data.id : null,
      role: 'host',
      send: outbound.send,
      sessionId
    }
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
    message: RoomActionMessage,
    active: Connection,
    outbound: Outbound,
    ws: WSContext
  ): void => {
    if (HOST_ONLY_MESSAGE_TYPES.has(message.type) && active.role !== 'host') {
      sendError(outbound, {
        code: 'host_only_action',
        fatal: false,
        message: 'Only the host can do that'
      })

      return
    }

    const room = roomCode === null ? null : findRoom(roomCode)

    if (room === null) {
      reject(outbound, ws, 'room_not_found', 'The room is gone')

      return
    }

    switch (message.type) {
      case 'player.buzz': {
        buzz(message.roundId, active, outbound, room)
        break
      }
      case 'player.answer': {
        answer(message, active, outbound, room)
        break
      }
      case 'host.startRound': {
        start(outbound, room)
        break
      }
      case 'host.judge': {
        judge(message, outbound, room)
        break
      }
      case 'host.reveal': {
        reveal(message.roundId, outbound, room)
        break
      }
      case 'host.nextRound': {
        advance(outbound, room)
        break
      }
      case 'host.endGame': {
        end(room)
        break
      }
      case 'host.playAgain': {
        replay(outbound, room)
        break
      }
      case 'host.removePlayer': {
        evict(message.playerId, room)
        break
      }
      case 'host.updateSettings': {
        reconfigure(message.settings, room)
        break
      }
    }
  }

  const buzz = (
    roundId: RoundId,
    active: Connection,
    outbound: Outbound,
    room: Room
  ): void => {
    // The seat, not the role: a host running the room from the phone in the
    // middle of the table holds both.
    if (active.playerId === null) {
      sendError(outbound, {
        code: 'invalid_message',
        fatal: false,
        message: 'Only a seated player holds a buzzer'
      })

      return
    }

    const registered = registerBuzz({
      now: Date.now(),
      playerId: active.playerId,
      room,
      roundId
    })

    if (registered.status === 'failure') {
      sendError(outbound, {
        code: registered.error,
        fatal: false,
        message: 'That buzz was not accepted'
      })

      return
    }

    holdPlaybackTimeout(room.code)
    broadcastRoom(room)
  }

  const start = (outbound: Outbound, room: Room): void => {
    if (room.phase !== 'lobby') {
      sendError(outbound, {
        code: 'wrong_phase',
        fatal: false,
        message: 'The game has already started'
      })

      return
    }

    void beginRound(room)
  }

  const judge = (
    message: Extract<RoomActionMessage, { type: 'host.judge' }>,
    outbound: Outbound,
    room: Room
  ): void => {
    const judged = applyVerdict({
      now: Date.now(),
      playerId: message.playerId,
      room,
      roundId: message.roundId,
      verdict: message.verdict
    })

    if (judged.status === 'failure') {
      sendError(outbound, {
        code: judged.error,
        fatal: false,
        message: 'That verdict does not apply any more'
      })

      return
    }

    settle(judged.data, room)
  }

  const reveal = (roundId: RoundId, outbound: Outbound, room: Room): void => {
    if (room.round?.id !== roundId) {
      sendError(outbound, {
        code: 'stale_round',
        fatal: false,
        message: 'That round has already moved on'
      })

      return
    }

    if (!PHASES_A_HOST_MAY_CUT_SHORT.has(room.phase)) {
      sendError(outbound, {
        code: 'wrong_phase',
        fatal: false,
        message: 'There is nothing left to reveal'
      })

      return
    }

    abandonRound(room.code)
    closeRound(room)
    broadcastRoom(room)
    armAutoAdvance(room)
  }

  /**
   * A simultaneous round is scored on the way out rather than as answers land:
   * the speed bonus is a rank among everyone who got it right, and nobody knows
   * that rank until the last of them has spoken or the clip has run out.
   */
  const closeRound = (room: Room): void => {
    if (room.settings.answerMode === 'buzzer') {
      revealRound(room, Date.now())

      return
    }

    settleSimultaneousRound(room, Date.now())
  }

  const answer = (
    message: Extract<ClientMessage, { type: 'player.answer' }>,
    active: Connection,
    outbound: Outbound,
    room: Room
  ): void => {
    if (active.playerId === null) {
      sendError(outbound, {
        code: 'invalid_message',
        fatal: false,
        message: 'Only a seated player answers'
      })

      return
    }

    const registered = registerAnswer({
      attempt: message.answer,
      now: Date.now(),
      playerId: active.playerId,
      room,
      roundId: message.roundId
    })

    if (registered.status === 'failure') {
      sendError(outbound, {
        code: registered.error,
        fatal: false,
        message: 'That answer was not accepted'
      })

      return
    }

    if (everyoneIsDone(room)) {
      abandonRound(room.code)
      closeRound(room)
      broadcastRoom(room)
      armAutoAdvance(room)

      return
    }

    broadcastRoom(room)
  }

  const advance = (outbound: Outbound, room: Room): void => {
    if (room.phase !== 'revealed') {
      sendError(outbound, {
        code: 'wrong_phase',
        fatal: false,
        message: 'The current round is still running'
      })

      return
    }

    if (isFinalRound(room)) {
      end(room)

      return
    }

    void beginRound(room)
  }

  const end = (room: Room): void => {
    abandonRound(room.code)
    finishGame(room, Date.now())
    broadcastRoom(room)
  }

  const replay = (outbound: Outbound, room: Room): void => {
    if (room.phase !== 'finished' && room.phase !== 'revealed') {
      sendError(outbound, {
        code: 'wrong_phase',
        fatal: false,
        message: 'The game is still running'
      })

      return
    }

    abandonRound(room.code)
    restartGame(room, Date.now())
    broadcastRoom(room)
  }

  // Removed from the roster before the buzz is released, so that the player
  // being evicted cannot be the one counted as still able to answer.
  const evict = (playerId: PlayerId, room: Room): void => {
    removePlayer(room, playerId, Date.now())
    settle(releaseBuzz({ now: Date.now(), playerId, room }), room)
  }

  /**
   * Allowed in every phase, because the host has to be able to flip
   * auto-advance on while a reveal is already on screen. The pool is dropped
   * only when the source actually changed — a pool left over from a source the
   * host has just replaced is a bug that survives the rest of the game, and
   * dropping it on an unrelated edit costs a needless catalogue request.
   */
  const reconfigure = (settings: RoomSettings, room: Room): void => {
    const previousGame = room.settings.game

    updateSettings(room, settings, Date.now())
    discardPoolIfStale({ previousGame, room })
    broadcastRoom(room)
    armAutoAdvance(room)
  }

  const settle = (outcome: VerdictOutcome | null, room: Room): void => {
    if (outcome === 'resumed') {
      armPlaybackTimeout(room)
    }

    if (outcome === 'revealed') {
      abandonRound(room.code)
    }

    broadcastRoom(room)

    if (outcome === 'revealed') {
      armAutoAdvance(room)
    }
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

      if (connection.role !== 'player') {
        holdRoundWhileHostIsAway(room)
        broadcastRoom(room)

        return
      }

      markPlayerDisconnected(room, connection.playerId, Date.now())

      // A phone that locks its screen while holding the buzzer would otherwise
      // hang the round on a player who cannot answer.
      settle(
        releaseBuzz({
          now: Date.now(),
          playerId: connection.playerId,
          room
        }),
        room
      )
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

      dispatch(message, connection, outbound, ws)
    }
  }
}
