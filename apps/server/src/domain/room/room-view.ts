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

import { hasJoinedAfterStart } from '@taverla/core/round/round-roster'
import { pointsFor } from '@taverla/core/scoring/verdict'

import { elapsedRoundMs } from '@/domain/round/round-service'

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
  youId: seatId
})

/**
 * A seated host reads what a player reads. The blind test keeps `audioUrl`
 * because that screen is still the room's speaker; a quiz has no such second
 * copy — the prompt everyone can see is already on the round — so the seat
 * takes the whole question and leaves nothing behind.
 */
const toHostContent = ({
  round,
  seatId
}: {
  round: Round
  seatId: PlayerId | null
}): HostRoundContent => {
  const content = round.content

  if (content.kind === 'buzzer') {
    return { kind: 'buzzer' }
  }

  if (content.kind === 'quiz') {
    return {
      kind: 'quiz',
      question: seatId === null ? content.question : null
    }
  }

  if (content.kind === 'lefake') {
    return { kind: 'lefake' }
  }

  return {
    audioUrl: content.track.previewUrl,
    kind: 'blindtest',
    track: seatId === null ? content.track : null
  }
}

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
  round: room.round === null ? null : toRoundView({ round: room.round, youId }),
  roundElapsedMs:
    room.round === null ? 0 : elapsedRoundMs(room.round, Date.now()),
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
const toRoundView = ({
  round,
  youId
}: {
  round: Round
  youId: PlayerId | null
}): RoundView => ({
  activeBuzz:
    round.activeBuzz === null
      ? null
      : {
          atServerTime: round.activeBuzz.atServerTime,
          expiresAt: round.activeBuzz.expiresAt,
          playerId: round.activeBuzz.playerId
        },
  answers: round.attempts.map(({ firstGuessedAt, playerId }) => ({
    atServerTime: firstGuessedAt,
    playerId
  })),
  awards: round.awards,
  content: toContentView({ round, youId }),
  id: round.id,
  index: round.index,
  joinedAfterStart:
    youId !== null &&
    hasJoinedAfterStart({
      openedWithPlayerIds: round.openedWithPlayerIds,
      playerId: youId
    }),
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

const toContentView = ({
  round,
  youId
}: {
  round: Round
  youId: PlayerId | null
}): RoundContent => {
  const content = round.content

  if (content.kind === 'buzzer') {
    return { kind: 'buzzer' }
  }

  if (content.kind === 'lefake') {
    const { category, id, prompt } = content.question

    return {
      board:
        content.board?.map((entry) => ({ id: entry.id, text: entry.text })) ??
        null,
      kind: 'lefake',
      prompt: { category, id, prompt },
      revealedBoard: round.revealed
        ? (content.board?.map((entry) => ({
            ...entry,
            voterIds: content.votes
              .filter((vote) => vote.candidateId === entry.id)
              .map((vote) => vote.playerId)
          })) ?? null)
        : null,
      votedPlayerIds: content.votes.map((vote) => vote.playerId),
      writtenPlayerIds: content.lies.map((lie) => lie.playerId),
      yourCandidateId:
        youId === null
          ? null
          : (content.board?.find((entry) => entry.authorIds.includes(youId))
              ?.id ?? null)
    }
  }

  if (content.kind === 'quiz') {
    const { answer, category, id, note, prompt } = content.question

    return {
      choices: content.choices,
      kind: 'quiz',
      prompt: { category, id, prompt },
      revealedQuestion: round.revealed ? { answer, note } : null
    }
  }

  return {
    choices: content.choices,
    kind: 'blindtest',
    revealedTrack: round.revealed ? toTrackIdentity(content.track) : null
  }
}

const toTrackIdentity = (track: HostTrack): TrackIdentity => ({
  artist: track.artist,
  coverUrl: track.coverUrl,
  id: track.id,
  title: track.title
})
