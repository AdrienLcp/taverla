import { nanoid } from 'nanoid'

import type {
  HostToken,
  Nickname,
  PlayerId,
  SessionId
} from '@taverla/protocol/identifiers'
import { MAX_PLAYERS_PER_ROOM, type RoomSettings } from '@taverla/protocol/room'

import { Result } from '@taverla/core/helpers/result'
import { isAbandoned } from '@taverla/core/room/seat-presence'

import type { Participant, Room } from './room'

export type JoinError = 'room_full' | 'nickname_taken'
export type HostClaimError = 'host_already_connected' | 'host_reconnecting'

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
 * How long the room stays the previous console's after its socket dies. A lid
 * closing, a Wi-Fi handover and a reload all land well inside it, and the screen
 * that comes back is the one that was already hosting.
 *
 * It runs out rather than holding, because the console that is never coming back
 * is the same shape as the one blinking: a minute of a refusal is an evening
 * saved, where a room nobody can pick up is the party over. What the token
 * changes is that neither is final — the screen that holds it takes the room
 * back whatever happened while it was gone.
 */
export const HOST_RECLAIM_GRACE_MS = 60 * 1_000

/**
 * `isHostConnected` comes from the messaging layer: a room whose host closed
 * their laptop still carries their `hostSessionId`, and the difference between
 * "the host is reloading" and "a second screen is trying to take over" is
 * whether a socket is currently attached.
 */
const refuseHostClaim = ({
  hostToken,
  isHostConnected,
  now,
  room,
  sessionId
}: {
  hostToken: HostToken | null
  isHostConnected: boolean
  now: number
  room: Room
  sessionId: SessionId
}): HostClaimError | null => {
  if (
    hostToken === room.hostToken ||
    room.hostSessionId === null ||
    room.hostSessionId === sessionId
  ) {
    return null
  }

  if (isHostConnected) {
    return 'host_already_connected'
  }

  return room.hostLeftAt !== null &&
    now - room.hostLeftAt < HOST_RECLAIM_GRACE_MS
    ? 'host_reconnecting'
    : null
}

export const claimHost = ({
  hostToken,
  isHostConnected,
  now,
  room,
  sessionId
}: {
  /** Replayed from the claiming screen's storage; `null` when it holds none. */
  hostToken: HostToken | null
  isHostConnected: boolean
  now: number
  room: Room
  sessionId: SessionId
}): Result<void, HostClaimError> => {
  touch(room, now)

  const refusal = refuseHostClaim({
    hostToken,
    isHostConnected,
    now,
    room,
    sessionId
  })

  if (refusal !== null) {
    return Result.failure(refusal)
  }

  room.hostSessionId = sessionId
  room.hostLeftAt = null

  return Result.success(undefined)
}

/**
 * Stamped when the room's last console goes, so the grace window is measured
 * from the moment it actually lost its host rather than from the last frame that
 * console happened to send.
 */
export const markHostAway = (room: Room, now: number): void => {
  room.hostLeftAt = now
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
