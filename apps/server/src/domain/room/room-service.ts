import { nanoid } from 'nanoid'

import type {
  Nickname,
  PlayerId,
  SessionId
} from '@taverla/protocol/identifiers'
import { MAX_PLAYERS_PER_ROOM, type RoomSettings } from '@taverla/protocol/room'

import { Result } from '@taverla/core/helpers/result'

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
