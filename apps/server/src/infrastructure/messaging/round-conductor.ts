import type { RoomCode, RoundId } from '@taverla/protocol/identifiers'

import type { Room } from '@/domain/room/room'
import { findRoom } from '@/domain/room/room-store'
import {
  blindtestContent,
  finishGame,
  holdRoundClock,
  isFinalRound,
  openRound,
  quizContent,
  remainingRoundMs,
  resumeRoundClock,
  revealRound,
  settleSimultaneousRound,
  startRoundClock,
  timeOutBuzz
} from '@/domain/round/round-service'
import {
  cancelRoundTimer,
  cancelRoundTimers,
  scheduleRoundTimer
} from '@/domain/round/round-timers'
import { drawPlayableTrack } from '@/domain/round/track-pool'
import { logger } from '@/infrastructure/logging/logger'
import {
  drawQuestion,
  hostQuestionOf
} from '@/infrastructure/quiz/question-bank'

import { hostConnectionIn } from './connection-registry'
import { broadcastRoom, sendError } from './outbound'

/**
 * Resolving a track is a network call, and the host pressing "start" twice
 * before it answers would open two rounds over each other. The room code is
 * held for the duration of the draw rather than a phase being invented for it.
 */
const roomsDrawing = new Set<RoomCode>()

/**
 * The time-driven transitions live here rather than in the socket handler: a
 * countdown that lands, a round that runs out, and a reveal that moves on by
 * itself are not messages anyone sent, but they still end in a broadcast.
 */
export const beginRound = async (room: Room): Promise<void> => {
  if (roomsDrawing.has(room.code)) {
    return
  }

  const game = room.settings.game

  // Nobody has chosen what the room is playing, so there is nothing to open a
  // round on. The socket refuses `host.startRound` with a code the host can
  // read; this is the floor under the paths nobody pressed — an auto-advance,
  // or a game cleared between two rounds.
  if (game === null) {
    return
  }

  // No catalogue, no network call, and nothing to fail — the room already holds
  // the question. Opening the round is the whole of serving this game.
  if (game.kind === 'buzzer') {
    cancelRoundTimer(room.code, 'advance')

    const round = openRound({
      content: { kind: 'buzzer' },
      now: Date.now(),
      room
    })

    broadcastRoom(room)
    armCountdown({ room, roundId: round.id })

    return
  }

  // The bank is bundled, so the draw is synchronous and cannot fail on someone
  // else's web server being down. Running out of unplayed questions can still
  // happen, and it is the room's own doing rather than an outage.
  if (game.kind === 'quiz') {
    const question = drawQuestion({
      playedIds: room.playedContentIds,
      settings: game
    })

    if (question === null) {
      const host = hostConnectionIn(room.code)

      if (host !== null) {
        sendError(host, {
          code: 'no_content_available',
          fatal: false,
          message: 'No unplayed question is left in those categories'
        })
      }

      return
    }

    cancelRoundTimer(room.code, 'advance')
    room.playedContentIds.add(question.id)

    const round = openRound({
      content: quizContent({ question: hostQuestionOf(question), room }),
      now: Date.now(),
      room
    })

    broadcastRoom(room)
    armCountdown({ room, roundId: round.id })

    return
  }

  cancelRoundTimer(room.code, 'advance')
  roomsDrawing.add(room.code)

  try {
    const drawn = await drawPlayableTrack({ room, settings: game })

    if (drawn.status === 'failure') {
      logger.error('Could not draw a track', {
        code: room.code,
        reason: drawn.error
      })

      const host = hostConnectionIn(room.code)

      if (host !== null) {
        sendError(host, {
          code: drawn.error,
          fatal: false,
          message: 'Could not load a track from the music catalogue'
        })
      }

      return
    }

    // The draw took a network round trip, and the room can have been swept or
    // the game ended in the meantime.
    if (findRoom(room.code) === null) {
      return
    }

    const round = openRound({
      content: blindtestContent({ room, track: drawn.data }),
      now: Date.now(),
      room
    })

    broadcastRoom(room)
    armCountdown({ room, roundId: round.id })
  } finally {
    roomsDrawing.delete(room.code)
  }
}

/**
 * Re-armed rather than resumed: a miss consumed part of the round, and
 * `remainingRoundMs` is what stops the next player getting a fresh thirty
 * seconds out of someone else's wrong answer.
 *
 * A game with no clock cancels instead. The bare buzzer serves nothing, so
 * there is nothing for the room to run out of and the round waits for a thumb.
 */
export const armRoundTimeout = (room: Room): void => {
  const remaining = remainingRoundMs(room, Date.now())

  if (remaining === null) {
    cancelRoundTimer(room.code, 'round')

    return
  }

  scheduleRoundTimer({
    code: room.code,
    delayMs: remaining,
    kind: 'round',
    run: () => {
      const mode = room.settings.mode.kind

      // The round running out ends a simultaneous one the same way the last
      // answer does, scoring included: whoever did not answer simply did not.
      if (mode === 'buzzer') {
        revealRound(room, Date.now())
      } else {
        settleSimultaneousRound({ mode, now: Date.now(), room })
      }

      broadcastRoom(room)
      armAutoAdvance(room)
    }
  })
}

/**
 * Idempotent, and called from every path that reaches a reveal as well as from
 * the switch itself — a host who turns the mode on while a reveal is already on
 * screen expects that reveal to move on, not the one after it.
 */
export const armAutoAdvance = (room: Room): void => {
  const delayMs = room.settings.autoAdvanceMs

  if (room.phase !== 'revealed' || delayMs === null) {
    cancelRoundTimer(room.code, 'advance')

    return
  }

  scheduleRoundTimer({
    code: room.code,
    delayMs,
    kind: 'advance',
    run: () => {
      if (room.phase !== 'revealed') {
        return
      }

      if (isFinalRound(room)) {
        finishGame(room, Date.now())
        broadcastRoom(room)

        return
      }

      void beginRound(room)
    }
  })
}

export const holdRoundTimeout = (code: RoomCode): void => {
  cancelRoundTimer(code, 'round')
}

/**
 * The floor has a clock of its own, and it is the server's for the same reason
 * the countdown is: the host's tab is the one most likely to be in the
 * background, and a room watching someone say nothing should not depend on it.
 *
 * Idempotent, and a `null` window cancels rather than schedules — the screens
 * then count up and the host decides when to cut in.
 */
export const armAnswerWindow = (room: Room): void => {
  const expiresAt = room.round?.activeBuzz?.expiresAt

  if (room.phase !== 'buzzed' || expiresAt == null || room.round === null) {
    cancelRoundTimer(room.code, 'answer')

    return
  }

  const roundId = room.round.id

  scheduleRoundTimer({
    code: room.code,
    delayMs: expiresAt - Date.now(),
    kind: 'answer',
    run: () => {
      const outcome = timeOutBuzz({ now: Date.now(), room, roundId })

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
  })
}

/**
 * The host's browser is the room's speaker and its only judge, so a game that
 * carries on without them carries on in silence, unjudged, burning round time
 * nobody can hear. Everything time-driven stops instead, and the round keeps
 * the seconds it had left.
 *
 * There is no grace period on purpose. Freezing costs nothing and undoes
 * itself, where waiting even five seconds spends five seconds of music on an
 * empty room — a host who drops off Wi-Fi for a moment loses the pause, not the
 * round.
 */
export const holdRoundWhileHostIsAway = (room: Room): void => {
  cancelRoundTimer(room.code, 'advance')
  cancelRoundTimer(room.code, 'answer')
  cancelRoundTimer(room.code, 'countdown')
  cancelRoundTimer(room.code, 'round')
  holdRoundClock(room, Date.now())
}

/** The mirror, run when a host claims the room again. */
export const resumeRoundForHost = (room: Room): void => {
  const now = Date.now()

  resumeRoundClock(room, now)

  if (room.phase === 'countdown' && room.round !== null) {
    armCountdown({ room, roundId: room.round.id })

    return
  }

  if (room.phase === 'playing') {
    armRoundTimeout(room)

    return
  }

  if (room.phase === 'buzzed') {
    armAnswerWindow(room)

    return
  }

  armAutoAdvance(room)
}

const armCountdown = ({
  room,
  roundId
}: {
  room: Room
  roundId: RoundId
}): void => {
  scheduleRoundTimer({
    code: room.code,
    delayMs: room.settings.countdownMs,
    kind: 'countdown',
    run: () => {
      if (!startRoundClock({ now: Date.now(), room, roundId })) {
        return
      }

      broadcastRoom(room)
      armRoundTimeout(room)
    }
  })
}

export const abandonRound = (code: RoomCode): void => {
  cancelRoundTimers(code)
}
