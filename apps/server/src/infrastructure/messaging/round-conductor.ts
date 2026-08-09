import type { RoomCode } from '@blindtest/protocol/identifiers'

import type { Room } from '@/domain/room/room'
import { findRoom } from '@/domain/room/room-store'
import {
  beginPlayback,
  openRound,
  remainingPlaybackMs,
  revealRound
} from '@/domain/round/round-service'
import {
  cancelRoundTimer,
  cancelRoundTimers,
  scheduleRoundTimer
} from '@/domain/round/round-timers'
import { drawPlayableTrack } from '@/domain/round/track-pool'
import { logger } from '@/infrastructure/logging/logger'

import type { Outbound } from './connection'
import { broadcastRoom, sendError } from './outbound'

/**
 * Resolving a track is a network call, and the host pressing "start" twice
 * before it answers would open two rounds over each other. The room code is
 * held for the duration of the draw rather than a phase being invented for it.
 */
const roomsDrawing = new Set<RoomCode>()

/**
 * The three time-driven transitions live here rather than in the socket
 * handler: a countdown that lands, a clip that runs out, and a resume after a
 * miss are not messages anyone sent, but they still end in a broadcast.
 */
export const beginRound = async ({
  hostOutbound,
  room
}: {
  hostOutbound: Outbound
  room: Room
}): Promise<void> => {
  if (roomsDrawing.has(room.code)) {
    return
  }

  roomsDrawing.add(room.code)

  try {
    const drawn = await drawPlayableTrack(room)

    if (drawn.status === 'failure') {
      logger.error('Could not draw a track', {
        code: room.code,
        reason: drawn.error
      })
      sendError(hostOutbound, {
        code: drawn.error,
        fatal: false,
        message: 'Could not load a track from the music catalogue'
      })

      return
    }

    // The draw took a network round trip, and the room can have been swept or
    // the game ended in the meantime.
    if (findRoom(room.code) === null) {
      return
    }

    const round = openRound({ now: Date.now(), room, track: drawn.data })

    broadcastRoom(room)

    scheduleRoundTimer({
      code: room.code,
      delayMs: room.settings.countdownMs,
      kind: 'countdown',
      run: () => {
        if (!beginPlayback({ now: Date.now(), room, roundId: round.id })) {
          return
        }

        broadcastRoom(room)
        armPlaybackTimeout(room)
      }
    })
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
      revealRound(room, Date.now())
      broadcastRoom(room)
    }
  })
}

export const holdPlaybackTimeout = (code: RoomCode): void => {
  cancelRoundTimer(code, 'playback')
}

export const abandonRound = (code: RoomCode): void => {
  cancelRoundTimers(code)
}
