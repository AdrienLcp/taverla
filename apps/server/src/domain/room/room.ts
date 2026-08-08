import type {
  Nickname,
  PlayerId,
  RoomCode,
  RoundId,
  SessionId
} from '@blindtest/protocol/identifiers'
import type { RoomPhase, RoomSettings } from '@blindtest/protocol/room'
import type { Award } from '@blindtest/protocol/scoring'
import type { HostTrack } from '@blindtest/protocol/track'

/**
 * The server's own model, deliberately richer than either wire view: it holds
 * the session ids that let a reloaded phone reclaim its seat, and the track
 * identity nobody may see yet. `room-view.ts` is the only place it is projected
 * onto the wire.
 */
export type Room = {
  code: RoomCode
  createdAt: number
  /** `null` between the host closing their tab and reclaiming the room. */
  hostSessionId: SessionId | null
  lastActivityAt: number
  phase: RoomPhase
  players: Map<PlayerId, Participant>
  round: Round | null
  settings: RoomSettings
  /** Tracks drawn but not yet played, so a round never repeats one. */
  trackPool: HostTrack[]
}

export type Participant = {
  id: PlayerId
  isConnected: boolean
  nickname: Nickname
  /** Survives a disconnect: the seat is held, the score with it. */
  sessionId: SessionId
  score: number
}

export type Round = {
  activeBuzz: { atServerTime: number; playerId: PlayerId } | null
  audioStartsAt: number | null
  awards: Award[]
  id: RoundId
  index: number
  lockedOutPlayerIds: Set<PlayerId>
  revealed: boolean
  track: HostTrack
}
