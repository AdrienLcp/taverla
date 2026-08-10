import type {
  Nickname,
  PlayerId,
  RoomCode,
  RoundId,
  SessionId
} from '@taverla/protocol/identifiers'
import type { RoomPhase, RoomSettings } from '@taverla/protocol/room'
import type { Award, Verdict } from '@taverla/protocol/scoring'
import type { HostTrack, TrackIdentity } from '@taverla/protocol/track'

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
  /** Every track already used, so a pool refilled mid-game cannot repeat one. */
  playedTrackIds: Set<string>
  players: Map<PlayerId, Participant>
  round: Round | null
  settings: RoomSettings
  /**
   * Candidates without their audio: preview URLs are signed with an expiry, so
   * the playable `HostTrack` is resolved when a round starts, not here.
   */
  trackPool: TrackIdentity[]
}

export type Participant = {
  id: PlayerId
  isConnected: boolean
  nickname: Nickname
  /** Survives a disconnect: the seat is held, the score with it. */
  sessionId: SessionId
  score: number
}

/**
 * `playedMs` and `playingSince` are the pair that makes a miss resumable: a
 * buzz pauses the clip, and the round has to know how much of it is left rather
 * than handing the next player a fresh thirty seconds.
 */
/**
 * One player's answer in a simultaneous round, graded on arrival. It is held
 * whole here and projected twice: as a name and a time while the round runs,
 * and with what they said once the answer is public.
 */
export type SubmittedAnswer = {
  atServerTime: number
  playerId: PlayerId
  /** What the reveal shows: the choice they picked, or the two fields they typed. */
  said: string
  verdict: Verdict
}

export type Round = {
  activeBuzz: { atServerTime: number; playerId: PlayerId } | null
  /** Buzzer mode leaves this empty; the other two fill it as frames arrive. */
  answers: SubmittedAnswer[]
  audioStartsAt: number | null
  awards: Award[]
  /**
   * Choice mode's four candidates, shuffled once when the round opens so the
   * order carries nothing. `correctChoiceIndex` is the one field in the whole
   * model that must never be projected — see `room-view.ts`.
   */
  choices: TrackIdentity[]
  correctChoiceIndex: number | null
  id: RoundId
  index: number
  lockedOutPlayerIds: Set<PlayerId>
  playedMs: number
  /** Server time playback last started or resumed; `null` while it is paused. */
  playingSince: number | null
  revealed: boolean
  track: HostTrack
}
