import type { GameKind } from '@taverla/protocol/game'
import type { RoomCode } from '@taverla/protocol/identifiers'
import type { Locale } from '@taverla/protocol/locale'

import { generateHostToken } from '@taverla/core/room/host-token'
import { generateRoomCode } from '@taverla/core/room/room-code'
import { roomSettingsFor } from '@taverla/core/room/room-settings'

import { logger } from '@/infrastructure/logging/logger'

import type { Room } from './room'

/**
 * Rooms live in this process and nowhere else. A blind test lasts an evening,
 * every player is in the same living room, and a restart mid-game is a problem
 * a database would not actually solve — the host would still have to re-share
 * the QR code. Persisting them would buy nothing and cost a schema, a
 * migration path and a deploy dependency. Revisit only if rooms ever need to
 * outlive a deploy or span more than one server process.
 */
const rooms = new Map<RoomCode, Room>()

/**
 * How long a room with nobody connected is kept, so a host who reloads keeps
 * their game. `ABANDONED_SEAT_MS` is the same ten minutes on purpose — a seat
 * and a room are the same sentence with a different subject, and the two must
 * move together.
 */
const ABANDONED_ROOM_GRACE_MS = 10 * 60 * 1000
const SWEEP_INTERVAL_MS = 60 * 1000

const MAX_CODE_ATTEMPTS = 20

export const createRoom = ({
  game,
  locale,
  now
}: {
  /** `null` from the front door, where the code goes up before anybody has decided. */
  game: GameKind | null
  /** The host's, so a quiz opens in a language they read rather than in a fixed one. */
  locale: Locale
  now: number
}): Room | null => {
  const code = drawUnusedCode()

  if (code === null) {
    return null
  }

  const room: Room = {
    code,
    createdAt: now,
    hostLeftAt: null,
    hostSessionId: null,
    hostToken: generateHostToken(),
    lastActivityAt: now,
    phase: 'lobby',
    playedContentIds: new Set(),
    players: new Map(),
    round: null,
    settings: roomSettingsFor({ game, locale }),
    trackPool: []
  }

  rooms.set(code, room)

  return room
}

export const findRoom = (code: RoomCode): Room | null => rooms.get(code) ?? null

export const deleteRoom = (code: RoomCode): void => {
  rooms.delete(code)
}

export const countRooms = (): number => rooms.size

/** A copy, so a caller that removes a player mid-pass is not iterating the map it mutates. */
export const allRooms = (): Room[] => [...rooms.values()]

/**
 * The sweeper only sees rooms nobody is attached to, so `hasConnections` is
 * supplied by the messaging layer rather than tracked here — the store has no
 * business knowing about sockets.
 */
export const sweepAbandonedRooms = ({
  hasConnections,
  now
}: {
  hasConnections: (code: RoomCode) => boolean
  now: number
}): number => {
  const removed = [...rooms.values()].filter(
    (room) =>
      !hasConnections(room.code) &&
      now - room.lastActivityAt > ABANDONED_ROOM_GRACE_MS
  )

  for (const room of removed) {
    rooms.delete(room.code)
  }

  return removed.length
}

export const startRoomSweeper = (
  hasConnections: (code: RoomCode) => boolean
): (() => void) => {
  const timer = setInterval(() => {
    const removed = sweepAbandonedRooms({ hasConnections, now: Date.now() })

    if (removed > 0) {
      logger.info('Swept abandoned rooms', { remaining: rooms.size, removed })
    }
  }, SWEEP_INTERVAL_MS)

  timer.unref()

  return () => {
    clearInterval(timer)
  }
}

/**
 * 28^4 codes against a handful of live rooms, so a collision is a curiosity
 * rather than a risk — but a silent overwrite would drop a game in progress,
 * and retrying costs nothing.
 */
const drawUnusedCode = (): RoomCode | null => {
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const code = generateRoomCode()

    if (!rooms.has(code)) {
      return code
    }
  }

  logger.error('Exhausted room code attempts', { liveRooms: rooms.size })

  return null
}
