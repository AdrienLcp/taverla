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

import type { Participant, Room, Round } from './room'

/**
 * The single seam between the server's model and the wire. Everything secret —
 * session ids, the pool, the track being played — is dropped here, and the two
 * projections are the reason `HostTrack` cannot reach a player by accident.
 */
export const toHostView = ({
  isHostConnected,
  isHostPlaying,
  room
}: {
  isHostConnected: boolean
  /** A host who took a seat reads the same round everyone else does. */
  isHostPlaying: boolean
  room: Room
}): HostRoomView => ({
  ...toBaseView({ isHostConnected, room }),
  currentContent:
    room.round === null
      ? null
      : toHostContent({ isHostPlaying, round: room.round }),
  remainingPoolSize: room.trackPool.length,
  roundElapsedMs:
    room.round === null ? 0 : elapsedPlaybackMs(room.round, Date.now())
})

const toHostContent = ({
  isHostPlaying,
  round
}: {
  isHostPlaying: boolean
  round: Round
}): HostRoundContent => ({
  audioUrl: round.content.track.previewUrl,
  kind: 'blindtest',
  track: isHostPlaying ? null : round.content.track
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
  awards: round.awards,
  content: toContentView(round),
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
  startsAt: round.startsAt
})

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
