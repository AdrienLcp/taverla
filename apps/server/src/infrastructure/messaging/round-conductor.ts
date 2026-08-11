import type { RoomCode, RoundId } from '@taverla/protocol/identifiers'

import type { Room } from '@/domain/room/room'
import { findRoom } from '@/domain/room/room-store'
import {
  beginPlayback,
  finishGame,
  holdPlayback,
  isFinalRound,
  openRound,
  remainingPlaybackMs,
  resumePlayback,
  revealRound,
  settleSimultaneousRound,
  timeOutBuzz
} from '@/domain/round/round-service'
import {
  cancelRoundTimer,
  cancelRoundTimers,
  scheduleRoundTimer
} from '@/domain/round/round-timers'
import { drawPlayableTrack } from '@/domain/round/track-pool'
import { logger } from '@/infrastructure/logging/logger'

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
 * countdown that lands, a clip that runs out, and a reveal that moves on by
 * itself are not messages anyone sent, but they still end in a broadcast.
 */
export const beginRound = async (room: Room): Promise<void> => {
  if (roomsDrawing.has(room.code)) {
    return
  }

  const game = room.settings.game

  if (game.kind !== 'blindtest') {
    const host = hostConnectionIn(room.code)

    if (host !== null) {
      sendError(host, {
        code: 'not_implemented',
        fatal: false,
        message: 'That game cannot open a round yet'
      })
    }

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

    const round = openRound({ now: Date.now(), room, track: drawn.data })

    broadcastRoom(room)
    armCountdown({ room, roundId: round.id })
  } finally {
    roomsDrawing.delete(room.code)
  }
}

/**
 * Re-armed rather than resumed: a miss consumed part of the clip, and
 * `remainingPlaybackMs` is what stops the next player getting a fresh thirty
 * seconds out of someone else's wrong answer.
 */
export const armPlaybackTimeout = (room: Room): void => {
  scheduleRoundTimer({
    code: room.code,
    delayMs: remainingPlaybackMs(room, Date.now()),
    kind: 'playback',
    run: () => {
      // The clip running out ends a simultaneous round the same way the last
      // answer does, scoring included: whoever did not answer simply did not.
      if (room.settings.answerMode === 'buzzer') {
        revealRound(room, Date.now())
      } else {
        settleSimultaneousRound(room, Date.now())
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

export const holdPlaybackTimeout = (code: RoomCode): void => {
  cancelRoundTimer(code, 'playback')
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
  })
}

/**
 * The host's browser is the room's speaker and its only judge, so a game that
 * carries on without them carries on in silence, unjudged, burning clip time
 * nobody can hear. Everything time-driven stops instead, and the clip keeps the
 * seconds it had left.
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
  cancelRoundTimer(room.code, 'playback')
  holdPlayback(room, Date.now())
}

/** The mirror, run when a host claims the room again. */
export const resumeRoundForHost = (room: Room): void => {
  const now = Date.now()

  resumePlayback(room, now)

  if (room.phase === 'countdown' && room.round !== null) {
    armCountdown({ room, roundId: room.round.id })

    return
  }

  if (room.phase === 'playing') {
    armPlaybackTimeout(room)

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
      if (!beginPlayback({ now: Date.now(), room, roundId })) {
        return
      }

      broadcastRoom(room)
      armPlaybackTimeout(room)
    }
  })
}

export const abandonRound = (code: RoomCode): void => {
  cancelRoundTimers(code)
}
