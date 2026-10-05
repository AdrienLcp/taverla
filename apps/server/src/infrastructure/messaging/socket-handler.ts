import type { Result } from '@adrienlcp/result'
import type { WSEvents } from 'hono/ws'

import {
  type ClientMessage,
  clientMessageSchema,
  FLOOR_MESSAGE_TYPES,
  type HelloMessage,
  HOST_ONLY_MESSAGE_TYPES
} from '@taverla/protocol/client-message'
import { decodeMessage } from '@taverla/protocol/codec'
import type { Nickname, PlayerId, RoundId } from '@taverla/protocol/identifiers'
import type { RoomSettings } from '@taverla/protocol/room'
import { PROTOCOL_VERSION } from '@taverla/protocol/version'

import { isJudgedByHost, offersAnswerMode } from '@taverla/core/room/game-modes'
import { isRoundInPlay } from '@taverla/core/room/room-phase'
import { reshapesRound } from '@taverla/core/room/room-settings'
import { newSessionId } from '@taverla/core/room/session-id'

import {
  claimHost,
  type HostClaimError,
  joinAsPlayer,
  markHostAway,
  markPlayerDisconnected,
  removePlayer,
  renameSeat,
  touch,
  updateSettings
} from '@/domain/room/room-service'
import {
  applyVerdict,
  clearLockouts,
  closeRound,
  everyoneHasPressed,
  everyoneIsDone,
  finishGame,
  isFinalRound,
  registerAnswer,
  registerBuzz,
  registerReflexPress,
  releaseBuzz,
  restartGame,
  startAutoAdvanceHold
} from '@/domain/round/round-service'
import {
  addSlateItem,
  closeSlateItem,
  collectSheets,
  isSheetClosed,
  judgeSlateGroup,
  revealSlateKey,
  type SlateRejection,
  setSlateKey,
  showSlateItem,
  writeSlateLine
} from '@/domain/round/slate-round'
import { discardPoolIfStale } from '@/domain/round/track-pool'
import { nowMs } from '@/infrastructure/clock'
import { newPlayerId } from '@/infrastructure/ids'
import { logger } from '@/infrastructure/logging/logger'

import type { Connection, Outbound, Socket } from './connection'
import { sendError, sendPong, sendWelcome } from './outbound'
import {
  forgetSeat,
  isHostConnected,
  isSeatConnected
} from './room-connections'
import { closeRoomEngine, publishRoom, type RoomEngine } from './room-engine'
import {
  beginRound,
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

const reject = (
  outbound: Outbound,
  ws: Socket,
  code: Parameters<typeof sendError>[1]['code'],
  message: string
): void => {
  sendError(outbound, { code, fatal: true, message })
  ws.close(CLOSE_CODE_POLICY, code)
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
const displaceOtherConsoles = (engine: RoomEngine, sessionId: string): void => {
  for (const other of engine.connections.all()) {
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
 * Whether the room as it stands needs its console to judge, which is the one
 * thing that keeps that screen out of its own game. Read in two places on
 * purpose: where a seat is granted and where the settings that allowed it
 * change, because a console remembers the name it was seated under and replays
 * it on every reconnect — a rule enforced only where the form is drawn is a
 * rule the next `hello` walks straight through.
 */
const hostMustJudge = (settings: RoomSettings): boolean =>
  isJudgedByHost({
    game: settings.game?.kind ?? null,
    mode: settings.mode.kind
  })

const introduce = ({
  engine,
  message,
  outbound,
  ws
}: {
  engine: RoomEngine | null
  message: HelloMessage
  outbound: Outbound
  ws: Socket
}): Connection | null => {
  if (message.protocolVersion !== PROTOCOL_VERSION) {
    reject(
      outbound,
      ws,
      'protocol_version_mismatch',
      'Reload the page to get the current build'
    )

    return null
  }

  if (engine === null || engine.isClosed) {
    reject(
      outbound,
      ws,
      'room_not_found',
      'That room does not exist, or the game is over'
    )

    return null
  }

  const sessionId = message.sessionId ?? newSessionId()
  const hostWasConnected = isHostConnected(engine)
  const seated =
    message.role === 'host'
      ? seatHost({ engine, hostWasConnected, message, outbound, sessionId, ws })
      : message.role === 'wall'
        ? seatWall({ engine, message, outbound, sessionId, ws })
        : seatPlayer({ engine, message, outbound, sessionId })

  if (seated === null) {
    return null
  }

  engine.connections.add(seated)

  // After registering, never before: the resumed round is broadcast with
  // `isHostConnected` already true, so no socket sees a frame saying the room
  // is running and the host is gone. And only when the room had no console at
  // all — a second tab is not a host coming back, and resuming a round nothing
  // ever held rewinds its clock and restarts the countdown on every screen.
  if (seated.role === 'host' && !hostWasConnected) {
    resumeRoundForHost(engine)
  }

  sendWelcome(seated, { engine, sessionId })
  publishRoom(engine)
  logger.info('Socket joined', { code: engine.room.code, role: seated.role })

  return seated
}

/**
 * The room's own screen. The token is the whole of its admission: it carries
 * the clip, whose URL names the track, so the room code alone does not open
 * one. It claims nothing — the console keeps the room, and a wall arriving or
 * leaving neither displaces it nor freezes or resumes a round.
 */
const seatWall = ({
  engine,
  message,
  outbound,
  sessionId,
  ws
}: {
  engine: RoomEngine
  message: HelloMessage
  outbound: Outbound
  sessionId: string
  ws: Socket
}): Connection | null => {
  if (message.hostToken !== engine.room.hostToken) {
    reject(
      outbound,
      ws,
      'wall_not_paired',
      'Pair this screen from the device hosting the room'
    )

    return null
  }

  return { playerId: null, role: 'wall', send: outbound.send, sessionId }
}

/**
 * A host who names themselves takes a seat as well as the room. One phone in
 * the middle of a table is both the speaker and a player, and doing it on one
 * socket is what lets the server know — which is what makes withholding the
 * answer from them enforceable rather than a promise.
 */
const seatHost = ({
  engine,
  hostWasConnected,
  message,
  outbound,
  sessionId,
  ws
}: {
  engine: RoomEngine
  hostWasConnected: boolean
  message: HelloMessage
  outbound: Outbound
  sessionId: string
  ws: Socket
}): Connection | null => {
  const { room } = engine
  const claimed = claimHost({
    hostToken: message.hostToken ?? null,
    isHostConnected: hostWasConnected,
    now: engine.now(),
    room,
    sessionId
  })

  if (claimed.status === 'failure') {
    reject(outbound, ws, claimed.error, HOST_CLAIM_REFUSALS[claimed.error])

    return null
  }

  displaceOtherConsoles(engine, sessionId)

  const seat =
    message.nickname === undefined || hostMustJudge(room.settings)
      ? null
      : joinAsPlayer({
          newPlayerId: newPlayerId(),
          nickname: message.nickname,
          now: engine.now(),
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
 * the player reconnect to be told the same thing.
 */
const seatPlayer = ({
  engine,
  message,
  outbound,
  sessionId
}: {
  engine: RoomEngine
  message: HelloMessage
  outbound: Outbound
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
    newPlayerId: newPlayerId(),
    nickname: message.nickname,
    now: engine.now(),
    room: engine.room,
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

const dispatch = ({
  active,
  engine,
  message,
  outbound,
  ws
}: {
  active: Connection
  engine: RoomEngine
  message: RoomActionMessage
  outbound: Outbound
  ws: Socket
}): void => {
  if (HOST_ONLY_MESSAGE_TYPES.has(message.type) && active.role !== 'host') {
    sendError(outbound, {
      code: 'host_only_action',
      fatal: false,
      message: 'Only the host can do that'
    })

    return
  }

  if (engine.isClosed) {
    reject(outbound, ws, 'room_not_found', 'The room is gone')

    return
  }

  // `holdRoundWhileHostIsAway` freezes every deadline, and until this gate
  // existed that was the whole freeze: the floor could still answer its way to
  // the end of a round nobody was there to hear, which armed the next clip for
  // an empty console. The player's screen draws the pause on its own; a client
  // refusing is not the server deciding.
  if (FLOOR_MESSAGE_TYPES.has(message.type) && !isHostConnected(engine)) {
    sendError(outbound, {
      code: 'host_away',
      fatal: false,
      message: 'The room is on hold until the host is back'
    })

    return
  }

  const { room } = engine
  const now = engine.now()

  switch (message.type) {
    case 'player.leave': {
      depart(active, engine)
      break
    }
    case 'player.rename': {
      rename(message.nickname, active, outbound, engine)
      break
    }
    case 'player.buzz': {
      buzz(message.roundId, active, outbound, engine)
      break
    }
    case 'player.answer': {
      answer(message, active, outbound, engine)
      break
    }
    case 'slate.write': {
      writeLine(message, active, outbound, engine)
      break
    }
    case 'host.startRound': {
      start({ engine, outbound, slateKeys: message.slateKeys })
      break
    }
    case 'host.addItem': {
      answerSlateFrame({
        engine,
        outbound,
        refusal: 'No item can be added now',
        result: addSlateItem({ now, room, roundId: message.roundId })
      })
      break
    }
    case 'host.setItemKey': {
      answerSlateFrame({
        engine,
        outbound,
        refusal: 'That key cannot be noted now',
        result: setSlateKey({
          itemIndex: message.itemIndex,
          key: message.key,
          now,
          room,
          roundId: message.roundId
        })
      })
      break
    }
    case 'host.revealItemKey': {
      answerSlateFrame({
        engine,
        outbound,
        refusal: 'That key cannot be revealed now',
        result: revealSlateKey({
          itemIndex: message.itemIndex,
          now,
          room,
          roundId: message.roundId
        })
      })
      break
    }
    case 'host.closeItem': {
      answerSlateFrame({
        engine,
        outbound,
        refusal: 'That item cannot be closed now',
        result: closeSlateItem({
          itemIndex: message.itemIndex,
          now,
          room,
          roundId: message.roundId
        })
      })
      break
    }
    case 'host.collectSheets': {
      answerSlateFrame({
        engine,
        outbound,
        refusal: 'There is no open item to collect',
        result: collectSheets({ now, room, roundId: message.roundId })
      })
      break
    }
    case 'host.showItem': {
      answerSlateFrame({
        engine,
        outbound,
        refusal: 'That item cannot be shown now',
        result: showSlateItem({
          itemIndex: message.itemIndex,
          now,
          room,
          roundId: message.roundId
        })
      })
      break
    }
    case 'host.judgeGroup': {
      answerSlateFrame({
        engine,
        outbound,
        refusal: 'That verdict does not apply any more',
        result: judgeSlateGroup({
          groupKey: message.groupKey,
          isCorrect: message.verdict.isCorrect,
          itemIndex: message.itemIndex,
          now,
          room,
          roundId: message.roundId
        })
      })
      break
    }
    case 'host.judge': {
      judge(message, outbound, engine)
      break
    }
    case 'host.reveal': {
      reveal(message.roundId, outbound, engine)
      break
    }
    case 'host.clearLockouts': {
      reopenFloor(message.roundId, outbound, engine)
      break
    }
    case 'host.nextRound': {
      advance(outbound, engine)
      break
    }
    case 'host.endGame': {
      end(engine)
      break
    }
    case 'host.playAgain': {
      replay(outbound, engine)
      break
    }
    case 'host.removePlayer': {
      evict(message.playerId, engine)
      break
    }
    case 'host.closeRoom': {
      disband(engine)
      break
    }
    case 'host.updateSettings': {
      reconfigure(message.settings, outbound, engine)
      break
    }
  }
}

/**
 * The slate's host frames all end the same way: refused with the code the
 * room gave, or published. None of them sets a deadline — the sheet has none.
 */
const answerSlateFrame = ({
  engine,
  outbound,
  refusal,
  result
}: {
  engine: RoomEngine
  outbound: Outbound
  refusal: string
  result: Result<void, SlateRejection>
}): void => {
  if (result.status === 'failure') {
    sendError(outbound, {
      code: result.error,
      fatal: false,
      message: refusal
    })

    return
  }

  publishRoom(engine)
}

const writeLine = (
  message: Extract<ClientMessage, { type: 'slate.write' }>,
  active: Connection,
  outbound: Outbound,
  engine: RoomEngine
): void => {
  if (active.playerId === null) {
    sendError(outbound, {
      code: 'invalid_message',
      fatal: false,
      message: 'Only a seated player holds a sheet'
    })

    return
  }

  answerSlateFrame({
    engine,
    outbound,
    refusal: 'That line was not saved',
    result: writeSlateLine({
      answer: message.answer,
      itemIndex: message.itemIndex,
      now: engine.now(),
      playerId: active.playerId,
      room: engine.room,
      roundId: message.roundId
    })
  })
}

const buzz = (
  roundId: RoundId,
  active: Connection,
  outbound: Outbound,
  engine: RoomEngine
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

  // The same frame, a different race: a reflex press takes no floor and waits
  // for no judge, so it settles on the presses rather than on a verdict.
  if (engine.room.round?.content.kind === 'reflex') {
    press({ engine, outbound, playerId: active.playerId, roundId })

    return
  }

  const registered = registerBuzz({
    now: engine.now(),
    playerId: active.playerId,
    room: engine.room,
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

  publishRoom(engine)
}

const press = ({
  engine,
  outbound,
  playerId,
  roundId
}: {
  engine: RoomEngine
  outbound: Outbound
  playerId: PlayerId
  roundId: RoundId
}): void => {
  const { room } = engine
  const registered = registerReflexPress({
    now: engine.now(),
    playerId,
    room,
    roundId
  })

  if (registered.status === 'failure') {
    sendError(outbound, {
      code: registered.error,
      fatal: false,
      message: 'That press was not accepted'
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
      message: 'That press came in before the screen flipped'
    })
  }

  if (everyoneHasPressed(room, engine.now())) {
    closeRound(room, engine.now())
  }

  publishRoom(engine)
}

const reopenFloor = (
  roundId: RoundId,
  outbound: Outbound,
  engine: RoomEngine
): void => {
  const cleared = clearLockouts({
    now: engine.now(),
    room: engine.room,
    roundId
  })

  if (cleared.status === 'failure') {
    sendError(outbound, {
      code: cleared.error,
      fatal: false,
      message: 'There is no round to reopen'
    })

    return
  }

  publishRoom(engine)
}

const start = ({
  engine,
  outbound,
  slateKeys
}: {
  engine: RoomEngine
  outbound: Outbound
  slateKeys: readonly (string | null)[] | undefined
}): void => {
  if (engine.room.phase !== 'lobby') {
    sendError(outbound, {
      code: 'wrong_phase',
      fatal: false,
      message: 'The game has already started'
    })

    return
  }

  if (refuseWithoutGame(outbound, engine)) {
    return
  }

  void beginRound(engine, { slateKeys })
}

/**
 * The room is opened before the table decides, so "no game yet" is an
 * ordinary state rather than a broken one — and the console greys the launch
 * out, which is a courtesy. This is the rule.
 */
const refuseWithoutGame = (outbound: Outbound, engine: RoomEngine): boolean => {
  if (engine.room.settings.game !== null) {
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
  engine: RoomEngine
): void => {
  const judged = applyVerdict({
    now: engine.now(),
    playerId: message.playerId,
    room: engine.room,
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

  publishRoom(engine)
}

const reveal = (
  roundId: RoundId,
  outbound: Outbound,
  engine: RoomEngine
): void => {
  const { room } = engine

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

  // Items are closed by their own frames, which is what makes closing one a
  // decision rather than a reveal pressed early: the round ends only once
  // every item has been on the wall's side of the line.
  if (room.round?.content.kind === 'slate' && !isSheetClosed(room)) {
    sendError(outbound, {
      code: 'wrong_phase',
      fatal: false,
      message: 'An item is still open'
    })

    return
  }

  closeRound(room, engine.now())
  publishRoom(engine)
}

const answer = (
  message: Extract<ClientMessage, { type: 'player.answer' }>,
  active: Connection,
  outbound: Outbound,
  engine: RoomEngine
): void => {
  const { room } = engine

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
    now: engine.now(),
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

  if (everyoneIsDone(room, engine.now())) {
    closeRound(room, engine.now())
  }

  publishRoom(engine)
}

const advance = (outbound: Outbound, engine: RoomEngine): void => {
  if (engine.room.phase !== 'revealed') {
    sendError(outbound, {
      code: 'wrong_phase',
      fatal: false,
      message: 'The current round is still running'
    })

    return
  }

  if (isFinalRound(engine.room)) {
    end(engine)

    return
  }

  if (refuseWithoutGame(outbound, engine)) {
    return
  }

  void beginRound(engine)
}

const end = (engine: RoomEngine): void => {
  finishGame(engine.room, engine.now())
  publishRoom(engine)
}

/**
 * The host going home, which no other exit does: the ten-minute grace exists
 * so a reload keeps the game, and a host who says they are done should not
 * have to wait it out. Every socket is told before the room goes, because a
 * player left on a stale scoreboard has no other way to learn the evening is
 * over — the error is fatal, so it stops reconnecting to a code that no
 * longer resolves.
 */
const disband = (engine: RoomEngine): void => {
  for (const connection of engine.connections.all()) {
    sendError(connection, {
      code: 'room_closed',
      fatal: true,
      message: 'The host closed the room'
    })
  }

  closeRoomEngine(engine)
}

const replay = (outbound: Outbound, engine: RoomEngine): void => {
  if (engine.room.phase !== 'finished' && engine.room.phase !== 'revealed') {
    sendError(outbound, {
      code: 'wrong_phase',
      fatal: false,
      message: 'The game is still running'
    })

    return
  }

  restartGame(engine.room, engine.now())
  publishRoom(engine)
}

// Removed from the roster before the buzz is released, so that the player
// being unseated cannot be the one counted as still able to answer — and off
// the console before either, because this is what broadcasts and
// `toHostView` reads the seat off the connection.
const unseat = (playerId: PlayerId, engine: RoomEngine): void => {
  const { room } = engine

  forgetSeat(engine, playerId)
  removePlayer(room, playerId, engine.now())
  releaseBuzz({ now: engine.now(), playerId, room })
  publishRoom(engine)
}

/**
 * A seat can outlive the reason it was allowed. The picker sits on the lobby
 * stage where a console may already be seated, so a host who takes a seat and
 * then chooses the bare buzzer holds one with nothing behind it: on the board,
 * unable to score, and the only screen that could judge the round.
 *
 * Every host connection rather than the one that sent the frame — a second tab
 * of the same browser is let in on purpose, and the seat is on whichever of
 * them said hello with a name.
 */
const unseatConsolesThatMustJudge = (engine: RoomEngine): void => {
  if (!hostMustJudge(engine.room.settings)) {
    return
  }

  for (const connection of engine.connections.all()) {
    if (connection.role === 'host' && connection.playerId !== null) {
      unseat(connection.playerId, engine)
    }
  }
}

/**
 * The one exit a player does not choose, and therefore the only one that has
 * to be said out loud: a socket left holding a `youId` the roster no longer
 * has goes on being sent the room, and a screen that stops counting reads as
 * the game having broken. Fatal frame, and the close is the client's — the
 * same shape as `disband`, because a `Connection` carries a `send` and never
 * its own socket.
 *
 * Unregistered here rather than on the close that follows it, since `unseat`
 * broadcasts and the room is still standing to be broadcast: a player told
 * they are out should not be handed one more view of what they are out of.
 *
 * A console that took a seat is unseated without a word. It is losing the
 * seat, not the room it is running, and there is no frame that says so — the
 * one below would be a lie its own screen would act on.
 */
const evict = (playerId: PlayerId, engine: RoomEngine): void => {
  for (const connection of engine.connections.all()) {
    if (connection.role !== 'player' || connection.playerId !== playerId) {
      continue
    }

    sendError(connection, {
      code: 'removed_by_host',
      fatal: true,
      message: 'The host removed you from the room'
    })

    engine.connections.remove(connection)
  }

  unseat(playerId, engine)
}

/**
 * Leaving on purpose, which is the one thing a closing socket cannot say: a
 * locked screen closes one too, and that seat has to come back. So the seat
 * goes now rather than in ten minutes.
 *
 * The socket closing a beat later is harmless — `markPlayerDisconnected`
 * looks the seat up and finds nothing, which is exactly the right answer for
 * somebody who has already gone.
 */
const depart = (active: Connection, engine: RoomEngine): void => {
  const { playerId } = active

  if (playerId === null) {
    return
  }

  unseat(playerId, engine)
}

/**
 * The seat, not the role — a console holding one renames itself with this
 * frame too. Refusing a clash keeps the roster's names distinct, which is what
 * a host judging by name and every player reading the board depend on.
 */
const rename = (
  nickname: Nickname,
  active: Connection,
  outbound: Outbound,
  engine: RoomEngine
): void => {
  const participant =
    active.playerId === null
      ? undefined
      : engine.room.players.get(active.playerId)

  if (participant === undefined) {
    sendError(outbound, {
      code: 'invalid_message',
      fatal: false,
      message: 'Only a seated player has a name to change'
    })

    return
  }

  const renamed = renameSeat({
    nickname,
    now: engine.now(),
    participant,
    room: engine.room
  })

  if (renamed.status === 'failure') {
    sendError(outbound, {
      code: renamed.error,
      fatal: false,
      message: 'Someone already took that name'
    })

    return
  }

  publishRoom(engine)
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
  engine: RoomEngine
): void => {
  const { room } = engine

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

  const now = engine.now()
  const previousGame = room.settings.game
  const previousHoldMs = room.settings.autoAdvanceMs

  updateSettings(room, settings, now)
  discardPoolIfStale({ previousGame, room })
  unseatConsolesThatMustJudge(engine)

  // `revealed` sits outside `isRoundInPlay`, so the hold is the one setting a
  // host can change while the thing it governs is on screen. It restarts from
  // the change rather than keeping the reveal's original deadline, because
  // the frame that carries the new number is read as the wait from here.
  if (room.phase === 'revealed' && settings.autoAdvanceMs !== previousHoldMs) {
    startAutoAdvanceHold(room, now)
  }

  publishRoom(engine)
}

const leave = (engine: RoomEngine, connection: Connection): void => {
  engine.connections.remove(connection)

  if (engine.isClosed) {
    return
  }

  const { room } = engine
  const { playerId } = connection
  const now = engine.now()

  // The ten minutes a room with nobody connected is kept run from the last
  // socket leaving, not from the last frame anyone sent: a host who sat in the
  // lobby for a quarter of an hour and reloads must find the room still there.
  touch(room, now)

  // Two questions, and a console that took a seat is asked both — where the
  // early return this used to be asked it only the first, and left that seat
  // connected for the rest of the evening with the sweeper never touching it.
  //
  // A screen whose socket was merely replaced still has somebody behind it.
  // Marking the seat away on the dead one greys the name for the rest of the
  // game — and stamps `disconnectedAt` on a player who would then be dropped
  // ten minutes later, mid-game, score and all.
  if (playerId !== null && !isSeatConnected(engine, playerId)) {
    markPlayerDisconnected(room, playerId, now)

    // A player who locks their screen while holding the buzzer would
    // otherwise hang the round on somebody who cannot answer.
    releaseBuzz({ now, playerId, room })
  }

  // A room with another console still open has not lost its host, and the
  // removal above is what makes that answerable here. Holding the round would
  // freeze it for a screen nobody left.
  if (connection.role === 'host' && !isHostConnected(engine)) {
    holdRoundWhileHostIsAway(engine)
    markHostAway(room, now)
  }

  publishRoom(engine)
}

/** What a socket is once its `hello` has landed: who it is, and which room it joined. */
export type JoinedSocket = { connection: Connection; engine: RoomEngine }

/**
 * One frame on one socket, whichever runtime holds it. `joined` is `null`
 * until `hello` lands, which is what makes "the first frame must introduce you"
 * enforceable; the caller keeps what this returns and hands it back with the
 * next frame. The room is looked up on `hello` and held from then on, so a
 * socket whose room closed is never handed a new room that shares its code.
 */
export const receiveFrame = ({
  findEngine,
  joined,
  raw,
  socket
}: {
  findEngine: () => RoomEngine | null
  joined: JoinedSocket | null
  raw: unknown
  socket: Socket
}): JoinedSocket | null => {
  if (typeof raw !== 'string') {
    sendError(socket, {
      code: 'invalid_message',
      fatal: false,
      message: 'Only text frames are accepted'
    })

    return joined
  }

  const decoded = decodeMessage(clientMessageSchema, raw)

  if (decoded.status === 'failure') {
    logger.warn('Rejected a socket frame', { reason: decoded.reason })
    sendError(socket, {
      code: 'invalid_message',
      fatal: false,
      message: decoded.reason
    })

    return joined
  }

  const message = decoded.message

  // Answered before the handshake too, so a client can start estimating the
  // clock offset while the player is still typing their nickname.
  if (message.type === 'time.ping') {
    sendPong(socket, {
      clientSentAt: message.clientSentAt,
      serverTime: joined?.engine.now() ?? nowMs()
    })

    return joined
  }

  if (joined === null) {
    if (message.type !== 'hello') {
      reject(
        socket,
        socket,
        'invalid_message',
        'The first frame must be a hello'
      )

      return null
    }

    const engine = findEngine()
    const connection = introduce({
      engine,
      message,
      outbound: socket,
      ws: socket
    })

    return connection === null || engine === null
      ? null
      : { connection, engine }
  }

  if (message.type === 'hello') {
    sendError(socket, {
      code: 'invalid_message',
      fatal: false,
      message: 'This socket has already introduced itself'
    })

    return joined
  }

  dispatch({
    active: joined.connection,
    engine: joined.engine,
    message,
    outbound: socket,
    ws: socket
  })

  return joined
}

export const closeSocket = (joined: JoinedSocket | null): void => {
  if (joined !== null) {
    leave(joined.engine, joined.connection)
  }
}

/** The Node runtime's socket: the closure is where the joined state lives. */
export const createRoomSocketEvents = (
  findEngine: () => RoomEngine | null
): WSEvents => {
  let joined: JoinedSocket | null = null

  return {
    onClose() {
      closeSocket(joined)
    },

    onMessage(event, ws) {
      joined = receiveFrame({
        findEngine,
        joined,
        raw: event.data,
        socket: {
          close: (code, reason) => {
            ws.close(code, reason)
          },
          send: (payload) => {
            ws.send(payload)
          }
        }
      })
    }
  }
}
