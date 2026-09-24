import type { PlayerId } from '@taverla/protocol/identifiers'
import type {
  HostRoomView,
  HostRoundContent,
  PlayerRoomView,
  PublicPlayer,
  RoundContent,
  RoundView
} from '@taverla/protocol/room'
import type { SlateLine } from '@taverla/protocol/slate'
import type { HostTrack, TrackIdentity } from '@taverla/protocol/track'

import { hasJoinedAfterStart } from '@taverla/core/round/round-roster'
import { pointsFor } from '@taverla/core/scoring/verdict'
import {
  filledCountsPerItem,
  filledLineCount,
  itemVerdictFor,
  lineVerdict,
  slateItemStateOf
} from '@taverla/core/slate/sheet-marking'

import { elapsedRoundMs, flipsAtOf } from '@/domain/round/round-service'
import { answerGroupsFor, blankPlayerIdsFor } from '@/domain/round/slate-round'

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
    room.round === null
      ? null
      : toHostContent({ room, round: room.round, seatId }),
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
  room,
  round,
  seatId
}: {
  room: Room
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

  if (content.kind === 'reflex') {
    return { kind: 'reflex' }
  }

  if (content.kind === 'slate') {
    return toHostSlateContent({ content, room })
  }

  return {
    audioUrl: content.track.previewUrl,
    kind: 'blindtest',
    track: seatId === null ? content.track : null
  }
}

/**
 * The wall's half of the slate. Of an item still open it is counts and the
 * host's own memo — not one answer, because everyone is looking at it.
 */
const toHostSlateContent = ({
  content,
  room
}: {
  content: Extract<Round['content'], { kind: 'slate' }>
  room: Room
}): HostRoundContent => {
  const itemIndex = content.currentItemIndex
  const item = itemIndex === null ? undefined : content.items[itemIndex]

  return {
    correction:
      itemIndex === null || item?.state !== 'closed'
        ? null
        : {
            blankPlayerIds: blankPlayerIdsFor({ itemIndex, room }),
            groups: answerGroupsFor({ itemIndex, room }).map((group) => ({
              isCorrect: lineVerdict({
                answer: group.text,
                marking: item.marking
              }),
              key: group.key,
              playerIds: group.playerIds,
              text: group.text
            }))
          },
    filledCounts: filledCountsPerItem({
      itemCount: content.items.length,
      sheets: [...room.players.keys()].map(
        (playerId) => content.sheets.get(playerId) ?? new Map()
      )
    }),
    keys: content.items.map((_, index) => content.keys.get(index) ?? null),
    kind: 'slate',
    progress: [...room.players.keys()].map((playerId) => ({
      filledCount: filledLineCount(content.sheets.get(playerId) ?? new Map()),
      playerId
    }))
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
  advancesAt: round.advancesAt,
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

  // Nothing is withheld until the reveal, which is this game alone: the presses
  // are the tension of the round rather than a leak, and the moment the screen
  // flips is public by design.
  if (content.kind === 'reflex') {
    return {
      flipsAt: flipsAtOf(round),
      kind: 'reflex',
      presses: [...content.presses]
    }
  }

  if (content.kind === 'slate') {
    return {
      currentItemIndex: content.currentItemIndex,
      itemCount: content.items.length,
      itemStates: content.items.map(slateItemStateOf),
      kind: 'slate',
      revealedKeys: content.items.map((_, index) =>
        content.revealedKeyIndexes.has(index)
          ? (content.keys.get(index) ?? null)
          : null
      ),
      yourSheet: youId === null ? null : toSlateSheet({ content, youId })
    }
  }

  return {
    choices: content.choices,
    kind: 'blindtest',
    revealedTrack: round.revealed ? toTrackIdentity(content.track) : null
  }
}

/**
 * The reader's lines and nobody else's. An item that closed before the reader
 * held a seat was never asked of them, so it owes no verdict rather than a
 * wrong one.
 */
const toSlateSheet = ({
  content,
  youId
}: {
  content: Extract<Round['content'], { kind: 'slate' }>
  youId: PlayerId
}): SlateLine[] => {
  const sheet = content.sheets.get(youId)

  return content.items.map((item, index) => {
    const answer = sheet?.get(index) ?? null

    return {
      answer,
      closedBeforeYou: item.state === 'closed' && !item.roster.has(youId),
      verdict: itemVerdictFor({ answer, item, playerId: youId })
    }
  })
}

const toTrackIdentity = (track: HostTrack): TrackIdentity => ({
  artist: track.artist,
  coverUrl: track.coverUrl,
  film: track.film,
  id: track.id,
  title: track.title
})
