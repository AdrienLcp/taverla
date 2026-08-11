import type { PlayerId } from '@taverla/protocol/identifiers'
import type {
  HostRoomView,
  HostRoundContent,
  PlayerRoomView,
  PublicPlayer,
  RoundContent,
  RoundView
} from '@taverla/protocol/room'
import type { HostTrack, TrackIdentity } from '@taverla/protocol/track'

import { pointsFor } from '@taverla/core/scoring/award'

import { elapsedPlaybackMs } from '@/domain/round/round-service'

import type { Participant, PlayerAttempts, Room, Round } from './room'

/**
 * The single seam between the server's model and the wire. Everything secret —
 * session ids, the pool, the track being played — is dropped here, and the two
 * projections are the reason `HostTrack` cannot reach a player by accident.
 */
export const toHostView = ({
  isHostConnected,
  room,
  seatId
}: {
  isHostConnected: boolean
  room: Room
  /** The seat this host took, if they took one — they then read what a player reads. */
  seatId: PlayerId | null
}): HostRoomView => ({
  ...toBaseView({ isHostConnected, room, youId: seatId }),
  currentContent:
    room.round === null ? null : toHostContent({ round: room.round, seatId }),
  remainingPoolSize: room.trackPool.length,
  roundElapsedMs:
    room.round === null ? 0 : elapsedPlaybackMs(room.round, Date.now())
})

const toHostContent = ({
  round,
  seatId
}: {
  round: Round
  seatId: PlayerId | null
}): HostRoundContent => ({
  audioUrl: round.content.track.previewUrl,
  kind: 'blindtest',
  track: seatId === null ? round.content.track : null
})

export const toPlayerView = ({
  isHostConnected,
  room,
  youId
}: {
  isHostConnected: boolean
  room: Room
  youId: PlayerId
}): PlayerRoomView => ({
  ...toBaseView({ isHostConnected, room, youId }),
  youId
})

const toBaseView = ({
  isHostConnected,
  room,
  youId
}: {
  isHostConnected: boolean
  room: Room
  youId: PlayerId | null
}) => ({
  code: room.code,
  isHostConnected,
  phase: room.phase,
  players: [...room.players.values()].map(toPublicPlayer),
  round: room.round === null ? null : toRoundView(room.round),
  settings: room.settings,
  yourVerdict:
    youId === null
      ? null
      : (room.round?.attempts.find((entry) => entry.playerId === youId)
          ?.verdict ?? null)
})

const toPublicPlayer = (participant: Participant): PublicPlayer => ({
  id: participant.id,
  isConnected: participant.isConnected,
  nickname: participant.nickname,
  score: participant.score
})

/**
 * `correctChoiceIndex` is absent from this object, and that absence is the
 * whole anti-cheat story for choice mode. Spreading the round here instead of
 * naming its fields would ship it — `codec.test.ts` is the net under that, and
 * this is the floor above it.
 */
const toRoundView = (round: Round): RoundView => ({
  activeBuzz: round.activeBuzz,
  answers: round.attempts.map(({ firstGuessedAt, playerId }) => ({
    atServerTime: firstGuessedAt,
    playerId
  })),
  awards: round.awards,
  content: toContentView(round),
  id: round.id,
  index: round.index,
  lockedOutPlayerIds: [...round.lockedOutPlayerIds],
  revealedAnswers: round.revealed
    ? round.attempts.map((attempts) => ({
        atServerTime: attempts.firstGuessedAt,
        isCorrect: pointsFor(attempts.verdict) > 0,
        playerId: attempts.playerId,
        said: saidBy(attempts)
      }))
    : [],
  startsAt: round.startsAt
})

/**
 * What they got, or their last miss when they got nothing — a name on the
 * reveal with nothing beside it reads as a bug rather than as a player who
 * tried.
 */
const saidBy = (attempts: PlayerAttempts): string =>
  attempts.landed.length > 0
    ? attempts.landed.join(' · ')
    : (attempts.lastMiss ?? '')

const toContentView = (round: Round): RoundContent => ({
  choices: round.content.choices,
  kind: 'blindtest',
  revealedTrack: round.revealed ? toTrackIdentity(round.content.track) : null
})

const toTrackIdentity = (track: HostTrack): TrackIdentity => ({
  artist: track.artist,
  coverUrl: track.coverUrl,
  id: track.id,
  title: track.title
})
