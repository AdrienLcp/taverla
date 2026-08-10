import type { PlayerId } from '@taverla/protocol/identifiers'
import type {
  HostRoomView,
  PlayerRoomView,
  PublicPlayer,
  RoundView
} from '@taverla/protocol/room'
import type { TrackIdentity } from '@taverla/protocol/track'

import { pointsFor } from '@taverla/core/scoring/award'

import { elapsedPlaybackMs } from '@/domain/round/round-service'

import type { Participant, Room, Round } from './room'

/**
 * The single seam between the server's model and the wire. Everything secret —
 * session ids, the pool, the track being played — is dropped here, and the two
 * projections are the reason `HostTrack` cannot reach a player by accident.
 */
export const toHostView = ({
  isHostConnected,
  room
}: {
  isHostConnected: boolean
  room: Room
}): HostRoomView => ({
  ...toBaseView({ isHostConnected, room }),
  currentTrack: room.round?.track ?? null,
  playbackElapsedMs:
    room.round === null ? 0 : elapsedPlaybackMs(room.round, Date.now()),
  remainingPoolSize: room.trackPool.length
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
  ...toBaseView({ isHostConnected, room }),
  youId
})

const toBaseView = ({
  isHostConnected,
  room
}: {
  isHostConnected: boolean
  room: Room
}) => ({
  code: room.code,
  isHostConnected,
  phase: room.phase,
  players: [...room.players.values()].map(toPublicPlayer),
  round: room.round === null ? null : toRoundView(room.round),
  settings: room.settings
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
  answers: round.answers.map(({ atServerTime, playerId }) => ({
    atServerTime,
    playerId
  })),
  audioStartsAt: round.audioStartsAt,
  awards: round.awards,
  choices: round.choices,
  id: round.id,
  index: round.index,
  lockedOutPlayerIds: [...round.lockedOutPlayerIds],
  revealedAnswers: round.revealed
    ? round.answers.map((answer) => ({
        atServerTime: answer.atServerTime,
        isCorrect: pointsFor(answer.verdict) > 0,
        playerId: answer.playerId,
        said: answer.said
      }))
    : [],
  revealedTrack: round.revealed ? toTrackIdentity(round) : null
})

const toTrackIdentity = (round: Round): TrackIdentity => ({
  artist: round.track.artist,
  coverUrl: round.track.coverUrl,
  id: round.track.id,
  title: round.track.title
})
