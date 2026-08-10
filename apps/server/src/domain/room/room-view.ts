import type { PlayerId } from '@taverla/protocol/identifiers'
import type {
  HostRoomView,
  PlayerRoomView,
  PublicPlayer,
  RoundView
} from '@taverla/protocol/room'
import type { TrackIdentity } from '@taverla/protocol/track'

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

const toRoundView = (round: Round): RoundView => ({
  activeBuzz: round.activeBuzz,
  audioStartsAt: round.audioStartsAt,
  awards: round.awards,
  id: round.id,
  index: round.index,
  lockedOutPlayerIds: [...round.lockedOutPlayerIds],
  revealedTrack: round.revealed ? toTrackIdentity(round) : null
})

const toTrackIdentity = (round: Round): TrackIdentity => ({
  artist: round.track.artist,
  coverUrl: round.track.coverUrl,
  id: round.track.id,
  title: round.track.title
})
