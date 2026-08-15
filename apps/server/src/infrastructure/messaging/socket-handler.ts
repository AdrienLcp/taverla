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

import { offersAnswerMode } from '@taverla/core/room/game-modes'
import { normalizeRoomCode } from '@taverla/core/room/room-code'
import { isRoundInPlay } from '@taverla/core/room/room-phase'
import { reshapesRound } from '@taverla/core/room/room-settings'

import type { Room } from '@/domain/room/room'
import {
  claimHost,
  type HostClaimError,
  joinAsPlayer,
  markHostAway,
  markPlayerDisconnected,
  removePlayer,
  updateSettings
} from '@/domain/room/room-service'
import { deleteRoom, findRoom } from '@/domain/room/room-store'
import {
  applyVerdict,
  clearLockouts,
  closeRound,
  everyoneHasActed,
  everyoneHasTapped,
  everyoneIsDone,
  finishGame,
  isFinalRound,
  registerAnswer,
  registerBuzz,
  registerLie,
  registerReflexTap,
  registerVote,
  releaseBuzz,
  restartGame,
  type VerdictOutcome
} from '@/domain/round/round-service'
import { discardPoolIfStale } from '@/domain/round/track-pool'
import { logger } from '@/infrastructure/logging/logger'

import type { Connection, Outbound } from './connection'
import {
  connectionsIn,
  forgetSeat,
  isHostConnected,
  isSeatConnected,
  registerConnection,
  unregisterConnection
} from './connection-registry'
import { broadcastRoom, sendError, sendPong, sendWelcome } from './outbound'
import {
  abandonRound,
  armAnswerWindow,
  armAutoAdvance,
  armRoundTimeout,
  beginRound,
  closeLefakePhase,
  holdRoundTimeout,
  holdRoundWhileHostIsAway,
  resumeRoundForHost
} from './round-conductor'

/** Everything `dispatch` can see: `hello` and `time.ping` are answered before it. */
type RoomActionMessage = Exclude<
  ClientMessage,
  { type: 'hello' } | { type: 'time.ping' }
>

/** Policy violation. The client shows the error it was just sent and stops retrying. */
const CLOSE_CODE_POLICY = 1008

const HOST_CLAIM_REFUSALS: Record<HostClaimError, string> = {
  host_already_connected: 'This room is already being hosted',
  host_reconnecting:
    'This room has just lost its console, which may still come back'
}

/**
 * A claim the token won, over a console that is still connected — the one case
 * where a socket that did nothing wrong is ended by somebody else's frame. Same
 * shape as `disband`: the frame is fatal and the close is the client's, because
 * a `Connection` carries a `send` and never its own socket.
 *
 * Two tabs of one browser share a `sessionId` and are both left alone, which is
 * what lets a console be torn down and reopened without the room noticing.
 */
const displaceOtherConsoles = (room: Room, sessionId: string): void => {
  for (const other of connectionsIn(room.code)) {
    if (other.role === 'host' && other.sessionId !== sessionId) {
      sendError(other, {
        code: 'host_already_connected',
        fatal: true,
        message: 'This room is being hosted from another screen'
      })
    }
  }
}

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
    const hostWasConnected = isHostConnected(code)
    const seated =
      message.role === 'host'
        ? seatHost({ hostWasConnected, message, outbound, room, sessionId, ws })
        : seatPlayer({ message, outbound, room, sessionId })

    if (seated === null) {
      return
    }

    connection = seated
    roomCode = code
    registerConnection(code, seated)

    // After registering, never before: the resumed round is broadcast with
    // `isHostConnected` already true, so no socket sees a frame saying the room
    // is running and the host is gone. And only when the room had no console at
    // all — a second tab is not a host coming back, and resuming a round nothing
    // ever held rewinds its clock and restarts the countdown on every phone.
    if (seated.role === 'host' && !hostWasConnected) {
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
    hostWasConnected,
    message,
    outbound,
    room,
    sessionId,
    ws
  }: {
    hostWasConnected: boolean
    message: HelloMessage
    outbound: Outbound
    room: Room
    sessionId: string
    ws: WSContext
  }): Connection | null => {
    const claimed = claimHost({
      hostToken: message.hostToken ?? null,
      isHostConnected: hostWasConnected,
      now: Date.now(),
      room,
      sessionId
    })

    if (claimed.status === 'failure') {
      reject(outbound, ws, claimed.error, HOST_CLAIM_REFUSALS[claimed.error])

      return null
    }

    displaceOtherConsoles(room, sessionId)

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
      case 'player.leave': {
        depart(active, room)
        break
      }
      case 'player.buzz': {
        buzz(message.roundId, active, outbound, room)
        break
      }
      case 'player.answer': {
        answer(message, active, outbound, room)
        break
      }
      case 'lefake.submit': {
        writeLie(message, active, outbound, room)
        break
      }
      case 'lefake.vote': {
        castVote(message, active, outbound, room)
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
      case 'host.clearLockouts': {
        reopenFloor(message.roundId, outbound, room)
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
      case 'host.closeRoom': {
        disband(room)
        break
      }
      case 'host.updateSettings': {
        reconfigure(message.settings, outbound, room)
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

    // The same frame, a different race: a reflex tap takes no floor and waits
    // for no judge, so it settles on the taps rather than on a verdict.
    if (room.round?.content.kind === 'reflex') {
      tap({ outbound, playerId: active.playerId, room, roundId })

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

    holdRoundTimeout(room.code)
    armAnswerWindow(room)
    broadcastRoom(room)
  }

  const tap = ({
    outbound,
    playerId,
    room,
    roundId
  }: {
    outbound: Outbound
    playerId: PlayerId
    room: Room
    roundId: RoundId
  }): void => {
    const registered = registerReflexTap({
      now: Date.now(),
      playerId,
      room,
      roundId
    })

    if (registered.status === 'failure') {
      sendError(outbound, {
        code: registered.error,
        fatal: false,
        message: 'That tap was not accepted'
      })

      return
    }

    // The one refusal on the shelf that is not an early return: it takes the
    // player out of the heat, so the room has to be told and the heat may now
    // have nothing left to wait for.
    if (registered.data === 'false_start') {
      sendError(outbound, {
        code: 'false_start',
        fatal: false,
        message: 'That tap came in before the screen flipped'
      })
    }

    if (everyoneHasTapped(room, Date.now())) {
      abandonRound(room.code)
      closeRound(room, Date.now())
      broadcastRoom(room)
      armAutoAdvance(room)

      return
    }

    broadcastRoom(room)
  }

  const reopenFloor = (
    roundId: RoundId,
    outbound: Outbound,
    room: Room
  ): void => {
    const cleared = clearLockouts({ now: Date.now(), room, roundId })

    if (cleared.status === 'failure') {
      sendError(outbound, {
        code: cleared.error,
        fatal: false,
        message: 'There is no round to reopen'
      })

      return
    }

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

    if (refuseWithoutGame(outbound, room)) {
      return
    }

    void beginRound(room)
  }

  /**
   * The room is opened before the table decides, so "no game yet" is an
   * ordinary state rather than a broken one — and the console greys the launch
   * out, which is a courtesy. This is the rule.
   */
  const refuseWithoutGame = (outbound: Outbound, room: Room): boolean => {
    if (room.settings.game !== null) {
      return false
    }

    sendError(outbound, {
      code: 'no_game_chosen',
      fatal: false,
      message: 'The room has no game yet'
    })

    return true
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

    if (!isRoundInPlay(room.phase)) {
      sendError(outbound, {
        code: 'wrong_phase',
        fatal: false,
        message: 'There is nothing left to reveal'
      })

      return
    }

    // The one game where "move on" is not always "reveal": a host pressing this
    // over a room still writing wants the board up, not the round abandoned
    // before anybody has voted on it.
    if (room.round?.content.kind === 'lefake') {
      closeLefakePhase(room)

      return
    }

    abandonRound(room.code)
    closeRound(room, Date.now())
    broadcastRoom(room)
    armAutoAdvance(room)
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

    if (everyoneIsDone(room, Date.now())) {
      abandonRound(room.code)
      closeRound(room, Date.now())
      broadcastRoom(room)
      armAutoAdvance(room)

      return
    }

    broadcastRoom(room)
  }

  /**
   * The two frames only Le Fake receives. Neither closes its phase on its own:
   * that is `everyoneHasActed`, which is the same courtesy the simultaneous
   * modes get — a table that has all finished should not sit watching a deadline
   * it has nothing left to spend.
   */
  const writeLie = (
    message: Extract<ClientMessage, { type: 'lefake.submit' }>,
    active: Connection,
    outbound: Outbound,
    room: Room
  ): void => {
    if (active.playerId === null) {
      sendError(outbound, {
        code: 'invalid_message',
        fatal: false,
        message: 'Only a seated player writes a lie'
      })

      return
    }

    const registered = registerLie({
      lie: message.lie,
      now: Date.now(),
      playerId: active.playerId,
      room,
      roundId: message.roundId
    })

    if (registered.status === 'failure') {
      sendError(outbound, {
        code: registered.error,
        fatal: false,
        message: 'That lie was not accepted'
      })

      return
    }

    if (everyoneHasActed(room, Date.now())) {
      closeLefakePhase(room)

      return
    }

    broadcastRoom(room)
  }

  const castVote = (
    message: Extract<ClientMessage, { type: 'lefake.vote' }>,
    active: Connection,
    outbound: Outbound,
    room: Room
  ): void => {
    if (active.playerId === null) {
      sendError(outbound, {
        code: 'invalid_message',
        fatal: false,
        message: 'Only a seated player votes'
      })

      return
    }

    const registered = registerVote({
      candidateId: message.candidateId,
      now: Date.now(),
      playerId: active.playerId,
      room,
      roundId: message.roundId
    })

    if (registered.status === 'failure') {
      sendError(outbound, {
        code: registered.error,
        fatal: false,
        message: 'That vote was not accepted'
      })

      return
    }

    if (everyoneHasActed(room, Date.now())) {
      closeLefakePhase(room)

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

    if (refuseWithoutGame(outbound, room)) {
      return
    }

    void beginRound(room)
  }

  const end = (room: Room): void => {
    abandonRound(room.code)
    finishGame(room, Date.now())
    broadcastRoom(room)
  }

  /**
   * The host going home, which no other exit does: the ten-minute grace exists
   * so a reload keeps the game, and a host who says they are done should not
   * have to wait it out. Every socket is told before the room goes, because a
   * phone left on a stale scoreboard has no other way to learn the evening is
   * over — the error is fatal, so it stops reconnecting to a code that no
   * longer resolves.
   */
  const disband = (room: Room): void => {
    abandonRound(room.code)

    for (const connection of connectionsIn(room.code)) {
      sendError(connection, {
        code: 'room_closed',
        fatal: true,
        message: 'The host closed the room'
      })
    }

    deleteRoom(room.code)
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
  // being unseated cannot be the one counted as still able to answer — and off
  // the console before either, because this is what broadcasts and
  // `toHostView` reads the seat off the connection.
  const unseat = (playerId: PlayerId, room: Room): void => {
    forgetSeat(room.code, playerId)
    removePlayer(room, playerId, Date.now())
    settle(releaseBuzz({ now: Date.now(), playerId, room }), room)
  }

  /**
   * The one exit a phone does not choose, and therefore the only one that has to
   * be said out loud: a socket left holding a `youId` the roster no longer has
   * goes on being sent the room, and a screen that stops counting reads as the
   * game having broken. Fatal frame, and the close is the client's — the same
   * shape as `disband`, because a `Connection` carries a `send` and never its
   * own socket.
   *
   * Unregistered here rather than on the close that follows it, since `unseat`
   * broadcasts and the room is still standing to be broadcast: a phone told it
   * is out should not be handed one more view of what it is out of.
   *
   * A console that took a seat is unseated without a word. It is losing the
   * seat, not the room it is running, and there is no frame that says so — the
   * one below would be a lie its own screen would act on.
   */
  const evict = (playerId: PlayerId, room: Room): void => {
    for (const connection of connectionsIn(room.code)) {
      if (connection.role !== 'player' || connection.playerId !== playerId) {
        continue
      }

      sendError(connection, {
        code: 'removed_by_host',
        fatal: true,
        message: 'The host removed you from the room'
      })

      unregisterConnection(room.code, connection)
    }

    unseat(playerId, room)
  }

  /**
   * Leaving on purpose, which is the one thing a closing socket cannot say: a
   * locked phone closes one too, and that seat has to come back. So the seat
   * goes now rather than in ten minutes.
   *
   * The socket closing a beat later is harmless — `markPlayerDisconnected`
   * looks the seat up and finds nothing, which is exactly the right answer for
   * somebody who has already gone.
   */
  const depart = (active: Connection, room: Room): void => {
    const { playerId } = active

    if (playerId === null) {
      return
    }

    unseat(playerId, room)
  }

  /**
   * Allowed in every phase, because a party is set up while it runs: the
   * countdown, the playlist and auto-advance are all things a host reaches for
   * with a reveal already on screen, and they land on the next round.
   *
   * The pool is dropped only when the source actually changed — a pool left
   * over from a source the host has just replaced is a bug that survives the
   * rest of the game, and dropping it on an unrelated edit costs a needless
   * catalogue request.
   */
  const reconfigure = (
    settings: RoomSettings,
    outbound: Outbound,
    room: Room
  ): void => {
    // The two fields travel together and the panel sends them so, but a socket
    // is whatever its owner makes it — and a typed field over a game that
    // serves nothing is a round no player could ever answer. A room with no
    // game narrows nothing yet, and `movedToGame` is what narrows the mode the
    // moment one is picked.
    if (
      !offersAnswerMode({
        game: settings.game?.kind ?? null,
        mode: settings.mode.kind
      })
    ) {
      sendError(outbound, {
        code: 'invalid_message',
        fatal: false,
        message: 'That game does not offer that answer mode'
      })

      return
    }

    // The console greys these out while a round is under way, and a greyed-out
    // control is not a guarantee — same reason `registerBuzz` re-checks the
    // mode it was handed.
    if (
      isRoundInPlay(room.phase) &&
      reshapesRound({ from: room.settings, to: settings })
    ) {
      sendError(outbound, {
        code: 'wrong_phase',
        fatal: false,
        message: 'The round under way is built on those; they wait for the next'
      })

      return
    }

    const previousGame = room.settings.game

    updateSettings(room, settings, Date.now())
    discardPoolIfStale({ previousGame, room })
    broadcastRoom(room)
    armAutoAdvance(room)
  }

  const settle = (outcome: VerdictOutcome | null, room: Room): void => {
    // The floor is no longer held, whatever released it.
    armAnswerWindow(room)

    if (outcome === 'resumed') {
      armRoundTimeout(room)
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

      const { playerId } = connection

      // Two questions, and a console that took a seat is asked both — where the
      // early return this used to be asked it only the first, and left that seat
      // connected for the rest of the evening with the sweeper never touching
      // it. The seat is answered first: holding the round below cancels every
      // timer `settle` arms, and re-arming one on a frozen round would spend a
      // clip on a room with no screen.
      //
      // A phone whose socket was merely replaced still has somebody behind it.
      // Marking the seat away on the dead one greys the name for the rest of the
      // game — and stamps `disconnectedAt` on a player the sweeper would then
      // drop ten minutes later, mid-game, score and all.
      if (playerId !== null && !isSeatConnected(roomCode, playerId)) {
        markPlayerDisconnected(room, playerId, Date.now())

        // A phone that locks its screen while holding the buzzer would otherwise
        // hang the round on a player who cannot answer.
        settle(releaseBuzz({ now: Date.now(), playerId, room }), room)
      }

      if (connection.role === 'player') {
        return
      }

      // A room with another console still open has not lost its host, and the
      // unregistering above is what makes that answerable here. Holding the
      // round would freeze it for a screen nobody left.
      if (!isHostConnected(roomCode)) {
        holdRoundWhileHostIsAway(room)
        markHostAway(room, Date.now())
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

      dispatch(message, connection, outbound, ws)
    }
  }
}
