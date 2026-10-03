import { ABANDONED_SEAT_MS } from '@taverla/core/room/seat-presence'

import { remainingRoundMs } from '@/domain/round/round-service'

import type { Room } from './room'

/**
 * How long a room with nobody connected is kept, so a host who reloads keeps
 * their game. `ABANDONED_SEAT_MS` is the same ten minutes on purpose — a seat
 * and a room are the same sentence with a different subject, and the two must
 * move together.
 */
export const ABANDONED_ROOM_GRACE_MS = 10 * 60 * 1000

/**
 * Everything a room does on its own rather than on a message. Each is read off
 * the room as it stands rather than remembered beside it, so a room restored
 * from a snapshot knows what it is waiting for without anything else surviving.
 */
export type RoomDeadlineKind =
  | 'advance'
  | 'answer'
  | 'countdown'
  | 'expiry'
  | 'round'
  | 'seats'

export type RoomDeadline = { at: number; kind: RoomDeadlineKind }

export const roomDeadlines = ({
  hasConnections,
  isDrawing,
  isHostConnected,
  now,
  room
}: {
  hasConnections: boolean
  /**
   * A track draw is a network call, and a reveal whose hold ran out during it
   * is already being advanced — it must not be due again until the draw lands.
   */
  isDrawing: boolean
  /** The host's browser is the room's speaker and judge, so no round clock runs without it. */
  isHostConnected: boolean
  now: number
  room: Room
}): RoomDeadline[] => {
  const round = isHostConnected ? roundDeadline({ isDrawing, now, room }) : null
  const seats = seatDeadline(room)

  return [
    ...(round === null ? [] : [round]),
    ...(seats === null ? [] : [seats]),
    ...(hasConnections
      ? []
      : [
          {
            at: room.lastActivityAt + ABANDONED_ROOM_GRACE_MS,
            kind: 'expiry' as const
          }
        ])
  ]
}

export const earliestDeadline = (
  deadlines: readonly RoomDeadline[]
): RoomDeadline | null =>
  deadlines.reduce<RoomDeadline | null>(
    (earliest, deadline) =>
      earliest === null || deadline.at < earliest.at ? deadline : earliest,
    null
  )

const roundDeadline = ({
  isDrawing,
  now,
  room
}: {
  isDrawing: boolean
  now: number
  room: Room
}): RoomDeadline | null => {
  const round = room.round

  if (round === null) {
    return null
  }

  switch (room.phase) {
    case 'countdown': {
      return round.startsAt === null
        ? null
        : { at: round.startsAt, kind: 'countdown' }
    }

    case 'playing': {
      const remaining =
        round.runningSince === null ? null : remainingRoundMs(room, now)

      return remaining === null ? null : { at: now + remaining, kind: 'round' }
    }

    case 'buzzed': {
      const expiresAt = round.activeBuzz?.expiresAt ?? null

      return expiresAt === null ? null : { at: expiresAt, kind: 'answer' }
    }

    case 'revealed': {
      return isDrawing || round.advancesAt === null
        ? null
        : { at: round.advancesAt, kind: 'advance' }
    }

    default: {
      return null
    }
  }
}

const seatDeadline = (room: Room): RoomDeadline | null => {
  const leftAt = [...room.players.values()]
    .filter((participant) => !participant.isConnected)
    .flatMap((participant) => participant.disconnectedAt ?? [])

  return leftAt.length === 0
    ? null
    : { at: Math.min(...leftAt) + ABANDONED_SEAT_MS, kind: 'seats' }
}
