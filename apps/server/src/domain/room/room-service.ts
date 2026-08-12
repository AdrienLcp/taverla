import { nanoid } from 'nanoid'

import type {
  Nickname,
  PlayerId,
  SessionId
} from '@taverla/protocol/identifiers'
import { MAX_PLAYERS_PER_ROOM, type RoomSettings } from '@taverla/protocol/room'

import { Result } from '@taverla/core/helpers/result'
import { isAbandoned } from '@taverla/core/room/seat-presence'

import type { Participant, Room } from './room'

export type JoinError = 'room_full' | 'nickname_taken'
export type HostClaimError = 'host_already_connected'

export const touch = (room: Room, now: number): void => {
  room.lastActivityAt = now
}

/**
 * A phone that reloads, locks its screen or drops off Wi-Fi comes back with the
 * `sessionId` it stored, and reclaims the same seat and score. Only when no
 * seat matches is a new participant created — which is why the nickname clash
 * check runs against *other* participants, never against the returning one.
 */
export const joinAsPlayer = ({
  nickname,
  now,
  room,
  sessionId
}: {
  nickname: Nickname
  now: number
  room: Room
  sessionId: SessionId
}): Result<Participant, JoinError> => {
  touch(room, now)

  const existing = [...room.players.values()].find(
    (participant) => participant.sessionId === sessionId
  )

  if (existing !== undefined) {
    existing.disconnectedAt = null
    existing.isConnected = true
    existing.nickname = nickname

    return Result.success(existing)
  }

  if (room.players.size >= MAX_PLAYERS_PER_ROOM) {
    return Result.failure('room_full')
  }

  if (isNicknameTaken({ nickname, room, sessionId })) {
    return Result.failure('nickname_taken')
  }

  const participant: Participant = {
    disconnectedAt: null,
    id: nanoid(12),
    isConnected: true,
    nickname,
    score: 0,
    sessionId
  }

  room.players.set(participant.id, participant)

  return Result.success(participant)
}

/**
 * `isHostConnected` comes from the messaging layer: a room whose host closed
 * their laptop still carries their `hostSessionId`, and the difference between
 * "the host is reloading" and "a second screen is trying to take over" is
 * whether a socket is currently attached.
 */
export const claimHost = ({
  isHostConnected,
  now,
  room,
  sessionId
}: {
  isHostConnected: boolean
  now: number
  room: Room
  sessionId: SessionId
}): Result<void, HostClaimError> => {
  touch(room, now)

  if (
    room.hostSessionId !== null &&
    room.hostSessionId !== sessionId &&
    isHostConnected
  ) {
    return Result.failure('host_already_connected')
  }

  room.hostSessionId = sessionId

  return Result.success(undefined)
}

export const markPlayerDisconnected = (
  room: Room,
  playerId: PlayerId,
  now: number
): void => {
  const participant = room.players.get(playerId)

  if (participant !== undefined) {
    participant.disconnectedAt = now
    participant.isConnected = false
  }

  touch(room, now)
}

export const removePlayer = (
  room: Room,
  playerId: PlayerId,
  now: number
): void => {
  room.players.delete(playerId)
  room.round?.lockedOutPlayerIds.delete(playerId)
  touch(room, now)
}

/**
 * Gives up the seats nobody has been behind for long enough that they are not
 * coming back. A greyed row costs nothing for a minute; a game runs half an
 * hour, and a phone whose battery died in the first round should not be on the
 * scoreboard at the end of it.
 *
 * Returns who went, because the caller has to release whatever they were
 * holding — the floor, most of all — before it broadcasts.
 */
export const releaseAbandonedSeats = (room: Room, now: number): PlayerId[] => {
  const released = [...room.players.values()]
    .filter((participant) => isAbandoned(participant, now))
    .map((participant) => participant.id)

  for (const playerId of released) {
    removePlayer(room, playerId, now)
  }

  return released
}

export const updateSettings = (
  room: Room,
  settings: RoomSettings,
  now: number
): void => {
  room.settings = settings
  touch(room, now)
}

const isNicknameTaken = ({
  nickname,
  room,
  sessionId
}: {
  nickname: Nickname
  room: Room
  sessionId: SessionId
}): boolean =>
  [...room.players.values()].some(
    (participant) =>
      participant.sessionId !== sessionId &&
      participant.nickname.toLowerCase() === nickname.toLowerCase()
  )
