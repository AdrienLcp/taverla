import { nanoid } from 'nanoid'

import type { ProtocolErrorCode } from '@taverla/protocol/error-code'
import type { GameSettings } from '@taverla/protocol/game'
import type { PlayerId, RoundId } from '@taverla/protocol/identifiers'
import type { Verdict } from '@taverla/protocol/scoring'
import type { HostTrack } from '@taverla/protocol/track'

import { Result } from '@taverla/core/helpers/result'
import {
  type BuzzRejection,
  findBuzzRejection,
  hasEligibleBuzzer
} from '@taverla/core/round/buzz-eligibility'
import { isMiss, pointsFor } from '@taverla/core/scoring/award'
import {
  gradeTypedAnswer,
  pointsForChoice,
  pointsForTypedAnswer,
  speedBonusForRank,
  type TypedAttempt
} from '@taverla/core/scoring/typed-answer'

import type { Room, Round, SubmittedAnswer } from '@/domain/room/room'
import { touch } from '@/domain/room/room-service'
import { drawChoices } from '@/domain/round/track-pool'

export type VerdictRejection = Extract<
  ProtocolErrorCode,
  'invalid_message' | 'stale_round' | 'wrong_phase'
>

/**
 * What the judged round does next. A miss does not end it: the player sits out
 * and the clip picks up where the buzz stopped it, which is why the caller has
 * to know whether to re-arm the playback timer or let the reveal stand.
 */
export type VerdictOutcome = 'revealed' | 'resumed'

export const openRound = ({
  now,
  room,
  track
}: {
  now: number
  room: Room
  track: HostTrack
}): Round => {
  const choices =
    room.settings.answerMode === 'choice' ? drawChoices({ room, track }) : null

  const round: Round = {
    activeBuzz: null,
    answers: [],
    awards: [],
    content: {
      choices: choices?.choices ?? [],
      correctChoiceIndex: choices?.correctIndex ?? null,
      kind: 'blindtest',
      track
    },
    id: nanoid(10),
    index: (room.round?.index ?? 0) + 1,
    lockedOutPlayerIds: new Set(),
    playedMs: 0,
    playingSince: null,
    revealed: false,
    startsAt: now + room.settings.countdownMs
  }

  room.round = round
  room.phase = 'countdown'
  touch(room, now)

  return round
}

/** `false` when the countdown fired for a round that has already been left behind. */
export const beginPlayback = ({
  now,
  room,
  roundId
}: {
  now: number
  room: Room
  roundId: RoundId
}): boolean => {
  if (room.round === null || room.round.id !== roundId) {
    return false
  }

  if (room.phase !== 'countdown') {
    return false
  }

  room.phase = 'playing'
  room.round.playingSince = now
  touch(room, now)

  return true
}

export const registerBuzz = ({
  now,
  playerId,
  room,
  roundId
}: {
  now: number
  playerId: PlayerId
  room: Room
  roundId: RoundId
}): Result<void, BuzzRejection> => {
  const round = room.round

  if (round === null) {
    return Result.failure('wrong_phase')
  }

  // A socket is whatever its owner makes it, and a phone showing four choices
  // can still send a buzz by hand.
  if (room.settings.answerMode !== 'buzzer') {
    return Result.failure('wrong_phase')
  }

  const rejection = findBuzzRejection({
    claimedRoundId: roundId,
    currentRoundId: round.id,
    hasActiveBuzz: round.activeBuzz !== null,
    isLockedOut: round.lockedOutPlayerIds.has(playerId),
    phase: room.phase
  })

  if (rejection !== null) {
    return Result.failure(rejection)
  }

  round.activeBuzz = { atServerTime: now, playerId }
  room.phase = 'buzzed'
  pausePlayback(round, now)
  touch(room, now)

  return Result.success(undefined)
}

export type AnswerRejection = Extract<
  ProtocolErrorCode,
  'already_buzzed' | 'invalid_message' | 'stale_round' | 'wrong_phase'
>

/**
 * A simultaneous round's answer. Unlike a buzz it neither pauses the clip nor
 * claims the floor: everyone answers over the same music, and the round ends
 * when the last of them has or when the clip runs out.
 *
 * `already_buzzed` is the code for a second answer from the same player —
 * borrowed rather than invented because it says exactly the right thing, "you
 * have had your go".
 */
export const registerAnswer = ({
  attempt,
  now,
  playerId,
  room,
  roundId
}: {
  attempt: { kind: 'choice'; choiceIndex: number } | TypedAttempt
  now: number
  playerId: PlayerId
  room: Room
  roundId: RoundId
}): Result<void, AnswerRejection> => {
  const round = room.round

  if (round === null || room.phase !== 'playing') {
    return Result.failure('wrong_phase')
  }

  if (round.id !== roundId) {
    return Result.failure('stale_round')
  }

  if (room.settings.answerMode === 'buzzer') {
    return Result.failure('invalid_message')
  }

  if (round.answers.some((answer) => answer.playerId === playerId)) {
    return Result.failure('already_buzzed')
  }

  const graded = grade({ attempt, round })

  if (graded === null) {
    return Result.failure('invalid_message')
  }

  round.answers.push({ ...graded, atServerTime: now, playerId })
  touch(room, now)

  return Result.success(undefined)
}

/**
 * Whether the round has heard from everyone it is waiting for. A phone that
 * dropped off Wi-Fi is not one of them, for the same reason a disconnected
 * player does not hold the clip open in buzzer mode.
 */
export const everyoneHasAnswered = (room: Room): boolean => {
  const round = room.round

  if (round === null) {
    return false
  }

  const expected = [...room.players.values()].filter(
    (participant) => participant.isConnected
  )

  return (
    expected.length > 0 &&
    expected.every((participant) =>
      round.answers.some((answer) => answer.playerId === participant.id)
    )
  )
}

/**
 * Scores a simultaneous round and reveals it. The speed bonus is a rank among
 * the players who *scored*, in arrival order — being quickly wrong wins
 * nothing, and taking somebody's bonus for it would be the wrong lesson.
 */
export const settleSimultaneousRound = (room: Room, now: number): void => {
  const round = room.round

  if (round === null) {
    return
  }

  let rankAmongCorrect = 0

  const earnedBy =
    room.settings.answerMode === 'choice'
      ? pointsForChoice
      : pointsForTypedAnswer

  for (const answer of [...round.answers].sort(
    (one, other) => one.atServerTime - other.atServerTime
  )) {
    const earned = earnedBy(answer.verdict)

    if (earned === 0) {
      round.awards.push({
        playerId: answer.playerId,
        points: 0,
        verdict: answer.verdict
      })

      continue
    }

    const points = earned + speedBonusForRank(rankAmongCorrect)

    rankAmongCorrect += 1

    const participant = room.players.get(answer.playerId)

    if (participant !== undefined) {
      participant.score += points
    }

    round.awards.push({
      playerId: answer.playerId,
      points,
      verdict: answer.verdict
    })
  }

  revealRound(room, now)
}

const grade = ({
  attempt,
  round
}: {
  attempt: { kind: 'choice'; choiceIndex: number } | TypedAttempt
  round: Round
}): Pick<SubmittedAnswer, 'said' | 'verdict'> | null => {
  if (attempt.kind === 'choice') {
    const picked = round.content.choices[attempt.choiceIndex]

    if (picked === undefined) {
      return null
    }

    const isRight = attempt.choiceIndex === round.content.correctChoiceIndex

    return {
      said: `${picked.title} — ${picked.artist}`,
      verdict: { artistCorrect: isRight, titleCorrect: isRight }
    }
  }

  const verdict = gradeTypedAnswer({ attempt, track: round.content.track })

  return {
    said: [attempt.title, attempt.artist]
      .filter((half) => half !== '')
      .join(' — '),
    verdict
  }
}

export const applyVerdict = ({
  now,
  playerId,
  room,
  roundId,
  verdict
}: {
  now: number
  playerId: PlayerId
  room: Room
  roundId: RoundId
  verdict: Verdict
}): Result<VerdictOutcome, VerdictRejection> => {
  const round = room.round

  if (round === null || room.phase !== 'buzzed') {
    return Result.failure('wrong_phase')
  }

  if (round.id !== roundId) {
    return Result.failure('stale_round')
  }

  if (round.activeBuzz?.playerId !== playerId) {
    return Result.failure('invalid_message')
  }

  const points = pointsFor(verdict)
  const participant = room.players.get(playerId)

  if (participant !== undefined) {
    participant.score += points
  }

  // A miss is recorded too: the reveal panel earns the right to say who tried
  // and got it wrong, which is most of the fun of the round being over.
  round.awards.push({ playerId, points, verdict })
  round.activeBuzz = null

  if (!isMiss(verdict)) {
    revealRound(room, now)

    return Result.success('revealed')
  }

  round.lockedOutPlayerIds.add(playerId)

  return Result.success(resumeOrReveal(room, now))
}

/**
 * The buzzer holder vanished — a locked phone, a closed tab, a host removing
 * them. Their claim is dropped without a verdict and without a lockout, and the
 * clip carries on for everyone else rather than the round hanging on someone
 * who is no longer in the room.
 */
export const releaseBuzz = ({
  now,
  playerId,
  room
}: {
  now: number
  playerId: PlayerId
  room: Room
}): VerdictOutcome | null => {
  const round = room.round

  if (round === null || round.activeBuzz?.playerId !== playerId) {
    return null
  }

  round.activeBuzz = null

  return resumeOrReveal(room, now)
}

/**
 * Freezes the clip where it is, without ending anything. The buzz path already
 * does this; the host walking away is the same situation seen from the other
 * side, and both have to be undoable without the room losing music it paid for.
 */
export const holdPlayback = (room: Room, now: number): void => {
  if (room.round === null) {
    return
  }

  pausePlayback(room.round, now)
  touch(room, now)
}

/**
 * Puts the clip back on the clock. A countdown is restarted rather than
 * resumed: its whole purpose is that every device lands on the first note
 * together, and a `startsAt` that elapsed while nobody could hear it would have
 * the track begin mid-phrase on the screens that stayed.
 */
export const resumePlayback = (room: Room, now: number): void => {
  const round = room.round

  if (round === null) {
    return
  }

  if (room.phase === 'countdown') {
    round.startsAt = now + room.settings.countdownMs
    touch(room, now)

    return
  }

  if (room.phase === 'playing') {
    round.playingSince = now
    touch(room, now)
  }
}

export const revealRound = (room: Room, now: number): void => {
  const round = room.round

  if (round === null) {
    return
  }

  pausePlayback(round, now)
  round.activeBuzz = null
  round.revealed = true
  room.phase = 'revealed'
  touch(room, now)
}

export const finishGame = (room: Room, now: number): void => {
  room.phase = 'finished'
  room.round = null
  touch(room, now)
}

/**
 * The same phones in the same seats, scores at zero. `playedTrackIds` survives
 * on purpose: a second game in the same room should not replay the tracks the
 * first one just burnt through.
 */
export const restartGame = (room: Room, now: number): void => {
  for (const participant of room.players.values()) {
    participant.score = 0
  }

  room.phase = 'lobby'
  room.round = null
  touch(room, now)
}

export const isFinalRound = (room: Room): boolean =>
  (room.round?.index ?? 0) >= room.settings.roundCount

export const elapsedPlaybackMs = (round: Round, now: number): number =>
  Math.round(
    round.playedMs +
      (round.playingSince === null ? 0 : now - round.playingSince)
  )

export const remainingPlaybackMs = (room: Room, now: number): number =>
  room.round === null
    ? 0
    : Math.max(
        0,
        roundDurationMs(room.settings.game) - elapsedPlaybackMs(room.round, now)
      )

/** How long a round stays open unanswered — the same clock, wound by each game. */
const roundDurationMs = (game: GameSettings): number => {
  switch (game.kind) {
    case 'blindtest':
      return game.clipDurationMs
    case 'quiz':
      return game.answerDurationMs
  }
}

const resumeOrReveal = (room: Room, now: number): VerdictOutcome => {
  const round = room.round

  if (round === null) {
    return 'revealed'
  }

  const canResume =
    hasEligibleBuzzer({
      candidates: [...room.players.values()],
      lockedOutPlayerIds: [...round.lockedOutPlayerIds]
    }) && remainingPlaybackMs(room, now) > 0

  if (!canResume) {
    revealRound(room, now)

    return 'revealed'
  }

  room.phase = 'playing'
  round.playingSince = now
  touch(room, now)

  return 'resumed'
}

const pausePlayback = (round: Round, now: number): void => {
  if (round.playingSince === null) {
    return
  }

  round.playedMs += now - round.playingSince
  round.playingSince = null
}
