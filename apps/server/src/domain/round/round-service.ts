import { nanoid } from 'nanoid'

import type { ProtocolErrorCode } from '@taverla/protocol/error-code'
import {
  locksOutOnMissIn,
  roundDurationMsOf,
  voteDurationMsOf
} from '@taverla/protocol/game'
import type { PlayerId, RoundId } from '@taverla/protocol/identifiers'
import type { HostQuestion } from '@taverla/protocol/question'
import type { Verdict } from '@taverla/protocol/scoring'
import type { HostTrack } from '@taverla/protocol/track'

import {
  choiceVerdict,
  gradeGuess,
  NOTHING_BANKED,
  type TypedAttempt,
  whatTheRoomNames,
  withGuessBanked
} from '@taverla/core/blindtest/typed-answer'
import { Result } from '@taverla/core/helpers/result'
import { shuffled } from '@taverla/core/helpers/shuffle'
import { buildLieBoard } from '@taverla/core/lefake/lie-board'
import { tallyLieBoard } from '@taverla/core/lefake/tally'
import { gradeQuizGuess } from '@taverla/core/quiz/question-answer'
import {
  drawFlipDelayMs,
  reflexRoundDurationMs
} from '@taverla/core/reflex/flip-schedule'
import { isFalseStart } from '@taverla/core/reflex/reaction'
import {
  type BuzzRejection,
  findBuzzRejection,
  hasEligibleBuzzer
} from '@taverla/core/round/buzz-eligibility'
import {
  hasJoinedAfterStart,
  isExpectedInRound
} from '@taverla/core/round/round-roster'
import { speedBonusForElapsed } from '@taverla/core/scoring/speed-bonus'
import {
  isFullyBanked,
  isMiss,
  nothingScored,
  pointsFor,
  pointsForSimultaneousAnswer,
  type SimultaneousMode,
  verdictKindFor
} from '@taverla/core/scoring/verdict'

import type { PlayerAttempts, Room, Round } from '@/domain/room/room'
import { touch } from '@/domain/room/room-service'
import { drawChoices } from '@/domain/round/track-pool'

export type VerdictRejection = Extract<
  ProtocolErrorCode,
  'invalid_message' | 'stale_round' | 'wrong_phase'
>

/**
 * What the judged round does next. A miss does not end it: the player sits out
 * and the round picks up where the buzz stopped it, which is why the caller has
 * to know whether to re-arm the round timer or let the reveal stand.
 */
export type VerdictOutcome = 'revealed' | 'resumed'

/**
 * The blind test's half of opening a round. The decoys are drawn here rather
 * than when the pool is built, because a round is the only moment the answer is
 * known and choice mode needs three neighbours of exactly it.
 */
export const blindtestContent = ({
  room,
  track
}: {
  room: Room
  track: HostTrack
}): Round['content'] => {
  const drawn =
    room.settings.mode.kind === 'choice' ? drawChoices({ room, track }) : null

  return {
    choices: drawn?.choices ?? [],
    correctChoiceIndex: drawn?.correctIndex ?? null,
    kind: 'blindtest',
    track
  }
}

/**
 * The quiz's half of the same job, and the easier one: the decoys were authored
 * with the question rather than drawn from what else the room might be playing.
 * A blind test can borrow three neighbours from its pool and they are all
 * plausible; "1789" is not a plausible wrong answer to which river runs through
 * Paris.
 */
export const quizContent = ({
  question,
  room
}: {
  question: HostQuestion
  room: Room
}): Round['content'] => {
  const choices =
    room.settings.mode.kind === 'choice'
      ? shuffled([question.answer, ...question.decoys])
      : []

  return {
    choices,
    correctChoiceIndex:
      choices.length === 0 ? null : choices.indexOf(question.answer),
    kind: 'quiz',
    question
  }
}

export const openRound = ({
  content,
  now,
  room
}: {
  content: Round['content']
  now: number
  room: Room
}): Round => {
  const round: Round = {
    activeBuzz: null,
    advancesAt: null,
    attempts: [],
    awards: [],
    content,
    elapsedMs: 0,
    id: nanoid(10),
    index: (room.round?.index ?? 0) + 1,
    lockedOutPlayerIds: new Set(),
    openedWithPlayerIds: null,
    revealed: false,
    runningSince: null,
    startsAt: now + room.settings.countdownMs
  }

  room.round = round
  room.phase = 'countdown'
  touch(room, now)

  return round
}

/** `false` when the countdown fired for a round that has already been left behind. */
export const startRoundClock = ({
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
  room.round.openedWithPlayerIds = new Set(room.players.keys())
  room.round.runningSince = now
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

  // A socket is whatever its owner makes it, and a player's screen showing
  // four choices can still send a buzz by hand. Narrowing here is also what
  // produces the window below: it exists on no other mode.
  const mode = room.settings.mode

  if (mode.kind !== 'buzzer') {
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

  if (
    hasJoinedAfterStart({
      openedWithPlayerIds: round.openedWithPlayerIds,
      playerId
    })
  ) {
    return Result.failure('joined_mid_round')
  }

  const window = mode.answerWindowMs

  round.activeBuzz = {
    atServerTime: now,
    expiresAt: window === null ? null : now + window,
    frozenWithMsLeft: null,
    playerId
  }
  room.phase = 'buzzed'
  pauseRoundClock(round, now)
  touch(room, now)

  return Result.success(undefined)
}

/**
 * The floor ran out. It is the same outcome as answering wrong on purpose:
 * taking the floor and saying nothing is what it cost everyone else, and a pass
 * with no lockout would let the same player take it straight back.
 */
export const timeOutBuzz = ({
  now,
  room,
  roundId
}: {
  now: number
  room: Room
  roundId: RoundId
}): VerdictOutcome | null => {
  const buzzer = room.round?.activeBuzz?.playerId

  if (room.phase !== 'buzzed' || room.round?.id !== roundId) {
    return null
  }

  if (buzzer === undefined) {
    return null
  }

  const judged = applyVerdict({
    now,
    playerId: buzzer,
    room,
    roundId,
    verdict: nothingScored(room.round.content.kind)
  })

  return judged.status === 'success' ? judged.data : null
}

/**
 * Everyone who was sat out is back in. The blind test never needs it — its
 * round is a clip that runs out — but a host running a charade has no such
 * clock, and a table where the quickest players have all missed is a round
 * nobody left can win.
 */
export const clearLockouts = ({
  now,
  room,
  roundId
}: {
  now: number
  room: Room
  roundId: RoundId
}): Result<void, VerdictRejection> => {
  const round = room.round

  if (round === null) {
    return Result.failure('wrong_phase')
  }

  if (round.id !== roundId) {
    return Result.failure('stale_round')
  }

  if (round.revealed) {
    return Result.failure('wrong_phase')
  }

  round.lockedOutPlayerIds.clear()
  touch(room, now)

  return Result.success(undefined)
}

export type AnswerRejection = Extract<
  ProtocolErrorCode,
  | 'already_buzzed'
  | 'invalid_message'
  | 'joined_mid_round'
  | 'stale_round'
  | 'wrong_phase'
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

  if (room.settings.mode.kind === 'buzzer') {
    return Result.failure('invalid_message')
  }

  if (
    hasJoinedAfterStart({
      openedWithPlayerIds: round.openedWithPlayerIds,
      playerId
    })
  ) {
    return Result.failure('joined_mid_round')
  }

  const held = round.attempts.find((entry) => entry.playerId === playerId)

  // A pick is one shot — four candidates with retries is just the answer with
  // extra steps. Typing is open until the clip runs out, and closes only once
  // there is nothing left to win.
  if (held !== undefined && (attempt.kind === 'choice' || isDone(held))) {
    return Result.failure('already_buzzed')
  }

  const graded = grade({ attempt, held, round })

  if (graded === null) {
    return Result.failure('invalid_message')
  }

  bank({ graded, held, now, playerId, round })
  touch(room, now)

  return Result.success(undefined)
}

const isDone = (attempts: PlayerAttempts): boolean =>
  isFullyBanked(attempts.verdict)

const bank = ({
  graded,
  held,
  now,
  playerId,
  round
}: {
  graded: { said: string; verdict: Verdict }
  held: PlayerAttempts | undefined
  now: number
  playerId: PlayerId
  round: Round
}): void => {
  // `grade` hands back everything banked so far rather than this guess alone,
  // so a guess that added something is one that raised what the verdict is
  // worth — which reads the same over two halves and over one claim.
  const before = held === undefined ? 0 : pointsFor(held.verdict)
  const gained = pointsFor(graded.verdict) > before

  const entry = held ?? {
    firstGuessedAt: now,
    landed: [],
    lastMiss: null,
    playerId,
    scoredAfterMs: null,
    verdict: graded.verdict
  }

  entry.verdict = graded.verdict

  if (gained) {
    entry.landed.push(graded.said)
    entry.scoredAfterMs ??= elapsedRoundMs(round, now)
  } else {
    entry.lastMiss = graded.said
  }

  if (held === undefined) {
    round.attempts.push(entry)
  }
}

/**
 * Whether the round has nothing left to wait for. A player who dropped off
 * Wi-Fi holds it for `RECONNECT_GRACE_MS` and no longer, for the same reason a
 * disconnected player does not hold the clip open in buzzer mode — but the
 * blink has to be absorbed first, or a network stutter in the second the last
 * player answers ends the round on everybody else.
 *
 * "Done" is per mode, and the difference is the whole point of allowing
 * retries: a pick ends a player's round, where a typed player is only finished
 * once they hold both halves — until then the clip is still theirs to use.
 */
export const everyoneIsDone = (room: Room, now: number): boolean => {
  const round = room.round

  if (round === null) {
    return false
  }

  const expected = [...room.players.values()].filter((participant) =>
    isExpectedInRound({
      now,
      openedWithPlayerIds: round.openedWithPlayerIds,
      participant
    })
  )

  return (
    expected.length > 0 &&
    expected.every((participant) => {
      const held = round.attempts.find(
        (entry) => entry.playerId === participant.id
      )

      if (held === undefined) {
        return false
      }

      return room.settings.mode.kind === 'choice' || isDone(held)
    })
  )
}

/**
 * Scores a simultaneous round and reveals it. The speed bonus is paid from how
 * far into the round each player first scored — being quickly wrong wins
 * nothing, because a player who never banked a half is never asked.
 */
export const settleSimultaneousRound = ({
  mode,
  now,
  room
}: {
  mode: SimultaneousMode
  now: number
  room: Room
}): void => {
  const round = room.round

  if (round === null) {
    return
  }

  const roundDurationMs = roundDurationMsOf(room.settings.game)

  for (const attempts of [...round.attempts].sort(byFirstScored)) {
    const earned = pointsForSimultaneousAnswer({
      mode,
      verdict: attempts.verdict
    })

    if (earned === 0 || attempts.scoredAfterMs === null) {
      round.awards.push({
        playerId: attempts.playerId,
        points: 0,
        speedBonus: 0,
        verdict: attempts.verdict
      })

      continue
    }

    const speedBonus = speedBonusForElapsed({
      answerPaid: earned,
      elapsedMs: attempts.scoredAfterMs,
      roundDurationMs
    })

    const points = earned + speedBonus

    const participant = room.players.get(attempts.playerId)

    if (participant !== undefined) {
      participant.score += points
    }

    round.awards.push({
      playerId: attempts.playerId,
      points,
      speedBonus,
      verdict: attempts.verdict
    })
  }

  revealRound(room, now)
}

/**
 * Le Fake's half of opening a round, and the only one that opens on nothing but
 * a question: the board it is voted on is written by the room over the next
 * minute, so it cannot exist yet.
 */
export const lefakeContent = (question: HostQuestion): Round['content'] => ({
  board: null,
  kind: 'lefake',
  lies: [],
  question,
  votes: []
})

export type LieRejection = Extract<
  ProtocolErrorCode,
  | 'already_buzzed'
  | 'joined_mid_round'
  | 'lie_is_the_answer'
  | 'stale_round'
  | 'wrong_phase'
>

/**
 * One lie, written against the writing deadline. A player gets one — unlike a
 * typed guess, which is open until the clip runs out, because there is nothing
 * here to get progressively closer to.
 *
 * The truth being refused is the guard the game cannot ship without: accepted,
 * it would put the answer on the board twice and leave the vote with no right
 * line to find. It is a refusal the player can act on, so it says so rather than
 * failing as an invalid frame.
 */
export const registerLie = ({
  lie,
  now,
  playerId,
  room,
  roundId
}: {
  lie: string
  now: number
  playerId: PlayerId
  room: Room
  roundId: RoundId
}): Result<void, LieRejection> => {
  const round = room.round

  if (round === null || room.phase !== 'playing') {
    return Result.failure('wrong_phase')
  }

  if (round.id !== roundId) {
    return Result.failure('stale_round')
  }

  const content = round.content

  if (content.kind !== 'lefake') {
    return Result.failure('wrong_phase')
  }

  if (
    hasJoinedAfterStart({
      openedWithPlayerIds: round.openedWithPlayerIds,
      playerId
    })
  ) {
    return Result.failure('joined_mid_round')
  }

  if (content.lies.some((written) => written.playerId === playerId)) {
    return Result.failure('already_buzzed')
  }

  if (gradeQuizGuess({ guess: lie, question: content.question }).isCorrect) {
    return Result.failure('lie_is_the_answer')
  }

  content.lies.push({ playerId, text: lie })
  touch(room, now)

  return Result.success(undefined)
}

/**
 * The board goes up. It is the one transition of the round nobody sends a
 * message for and no clock has to reach — the last player finishing their lie
 * gets there just as often as the deadline does.
 *
 * The round clock is wound back rather than a second one started: both open
 * phases run off it, so freezing the room while the host is away already covers
 * the vote.
 */
export const closeWriting = (room: Room, now: number): void => {
  const content = room.round?.content

  if (room.round === null || content?.kind !== 'lefake') {
    return
  }

  content.board = buildLieBoard({
    decoys: content.question.decoys,
    lies: content.lies,
    truth: content.question.answer
  })

  room.phase = 'voting'
  room.round.elapsedMs = 0
  room.round.runningSince = now
  touch(room, now)
}

export type VoteRejection = Extract<
  ProtocolErrorCode,
  | 'already_buzzed'
  | 'cannot_vote_for_own_lie'
  | 'invalid_message'
  | 'joined_mid_round'
  | 'stale_round'
  | 'wrong_phase'
>

export const registerVote = ({
  candidateId,
  now,
  playerId,
  room,
  roundId
}: {
  candidateId: string
  now: number
  playerId: PlayerId
  room: Room
  roundId: RoundId
}): Result<void, VoteRejection> => {
  const round = room.round

  if (round === null || room.phase !== 'voting') {
    return Result.failure('wrong_phase')
  }

  if (round.id !== roundId) {
    return Result.failure('stale_round')
  }

  const content = round.content

  if (content.kind !== 'lefake' || content.board === null) {
    return Result.failure('wrong_phase')
  }

  if (
    hasJoinedAfterStart({
      openedWithPlayerIds: round.openedWithPlayerIds,
      playerId
    })
  ) {
    return Result.failure('joined_mid_round')
  }

  if (content.votes.some((vote) => vote.playerId === playerId)) {
    return Result.failure('already_buzzed')
  }

  const candidate = content.board.find((entry) => entry.id === candidateId)

  if (candidate === undefined) {
    return Result.failure('invalid_message')
  }

  // The screen greys this line out, and a merged lie means a player can hold one
  // they never typed the exact words of. The guard is here because a socket is
  // whatever its owner makes it, and voting for yourself is free points.
  if (candidate.authorIds.includes(playerId)) {
    return Result.failure('cannot_vote_for_own_lie')
  }

  content.votes.push({ candidateId, playerId })
  touch(room, now)

  return Result.success(undefined)
}

/**
 * Whether the phase the room is in has nothing left to wait for. A player who
 * dropped off Wi-Fi holds it only for `RECONNECT_GRACE_MS`, the same way they
 * do not hold a clip open — and a player who was there for the writing and
 * wrote nothing still votes, which is what keeps somebody stuck for a lie in
 * the round.
 */
export const everyoneHasActed = (room: Room, now: number): boolean => {
  const round = room.round

  if (round === null || round.content.kind !== 'lefake') {
    return false
  }

  const content = round.content

  const seated = [...room.players.values()].filter((participant) =>
    isExpectedInRound({
      now,
      openedWithPlayerIds: round.openedWithPlayerIds,
      participant
    })
  )

  if (seated.length === 0) {
    return false
  }

  const acted =
    room.phase === 'voting'
      ? new Set(content.votes.map((vote) => vote.playerId))
      : new Set(content.lies.map((lie) => lie.playerId))

  return seated.every((participant) => acted.has(participant.id))
}

/**
 * Scores the board and reveals it. No speed bonus, and it is the only settle on
 * the shelf without one: voting quickly is voting without reading, which is the
 * half of the round worth having.
 */
export const settleLieBoard = (room: Room, now: number): void => {
  const round = room.round
  const content = round?.content

  if (round == null || content?.kind !== 'lefake' || content.board === null) {
    return
  }

  for (const award of tallyLieBoard({
    board: content.board,
    votes: content.votes
  })) {
    const participant = room.players.get(award.playerId)

    if (participant !== undefined) {
      participant.score += award.points
    }

    round.awards.push(award)
  }

  revealRound(room, now)
}

/**
 * The reflex race's half of opening a round, and the only content on the shelf
 * that is neither drawn from a catalogue nor authored: the round is a wait and
 * a colour, and the wait is the whole of it.
 */
export const reflexContent = (): Round['content'] => ({
  flipDelayMs: drawFlipDelayMs(),
  kind: 'reflex',
  presses: []
})

/** When this round's screen flips, or `null` for a round that is not one. */
export const flipsAtOf = (round: Round): number | null =>
  round.content.kind !== 'reflex' || round.startsAt === null
    ? null
    : round.startsAt + round.content.flipDelayMs

/**
 * A press arrives, or arrives too soon to have been a reaction. The false start
 * is a *success* here on purpose: it is refused to the player and it changes
 * the round, so the caller has to send the error and broadcast, where every
 * other rejection only sends.
 */
export type ReflexPressOutcome = 'false_start' | 'pressed'

export const registerReflexPress = ({
  now,
  playerId,
  room,
  roundId
}: {
  now: number
  playerId: PlayerId
  room: Room
  roundId: RoundId
}): Result<ReflexPressOutcome, BuzzRejection> => {
  const round = room.round
  const content = round?.content

  if (round == null || content?.kind !== 'reflex') {
    return Result.failure('wrong_phase')
  }

  const rejection = findBuzzRejection({
    claimedRoundId: roundId,
    currentRoundId: round.id,
    // Nobody takes a floor in this game, so the buzz that blocks a buzz is the
    // player's own: one press, one heat.
    hasActiveBuzz: content.presses.some((press) => press.playerId === playerId),
    isLockedOut: round.lockedOutPlayerIds.has(playerId),
    phase: room.phase
  })

  if (rejection !== null) {
    return Result.failure(rejection)
  }

  if (
    hasJoinedAfterStart({
      openedWithPlayerIds: round.openedWithPlayerIds,
      playerId
    })
  ) {
    return Result.failure('joined_mid_round')
  }

  const flipsAt = flipsAtOf(round)

  if (flipsAt === null) {
    return Result.failure('wrong_phase')
  }

  if (isFalseStart({ flipsAt, pressedAt: now })) {
    round.lockedOutPlayerIds.add(playerId)
    touch(room, now)

    return Result.success('false_start')
  }

  content.presses.push({ atServerTime: now, playerId })
  touch(room, now)

  return Result.success('pressed')
}

/**
 * Whether the heat has nothing left to wait for. A false start counts as having
 * acted: that press has spent itself, and holding the round open for it is the
 * opposite of what the lockout means.
 */
export const everyoneHasPressed = (room: Room, now: number): boolean => {
  const round = room.round
  const content = round?.content

  if (round == null || content?.kind !== 'reflex') {
    return false
  }

  const expected = [...room.players.values()].filter((participant) =>
    isExpectedInRound({
      now,
      openedWithPlayerIds: round.openedWithPlayerIds,
      participant
    })
  )

  if (expected.length === 0) {
    return false
  }

  const pressed = new Set(content.presses.map((press) => press.playerId))

  return expected.every(
    (participant) =>
      pressed.has(participant.id) ||
      round.lockedOutPlayerIds.has(participant.id)
  )
}

/**
 * Scores a heat and reveals it. Being first *is* being right, so this is the one
 * settle on the shelf that mints its own verdict rather than applying one — no
 * host judges it, and `applyVerdict` is not on this game's path at all.
 */
export const settleReflexRound = (room: Room, now: number): void => {
  const round = room.round
  const content = round?.content

  if (round == null || content?.kind !== 'reflex') {
    return
  }

  const [first] = content.presses

  if (first !== undefined) {
    const verdict = { isCorrect: true, kind: 'single' } as const
    const points = pointsFor(verdict)
    const participant = room.players.get(first.playerId)

    if (participant !== undefined) {
      participant.score += points
    }

    // No speed bonus, and this is the game where that reads oddest: the race is
    // the entire round, and it is already paid by being the press that took it.
    round.awards.push({
      playerId: first.playerId,
      points,
      speedBonus: 0,
      verdict
    })
  }

  revealRound(room, now)
}

/**
 * The bonus queue: whoever banked something first heads it, and everyone who
 * banked nothing sorts to the back where they cannot take a place.
 */
const byFirstScored = (one: PlayerAttempts, other: PlayerAttempts): number =>
  (one.scoredAfterMs ?? Number.POSITIVE_INFINITY) -
  (other.scoredAfterMs ?? Number.POSITIVE_INFINITY)

type Attempt = { kind: 'choice'; choiceIndex: number } | TypedAttempt

/**
 * What this player now holds, not what this one guess was worth. The
 * accumulation happens inside each game's arm because that is the only place
 * both operands are known to be the same shape of verdict — a round judged in
 * halves never meets one judged as a single claim.
 *
 * `null` is a frame that does not fit the round: a pick out of range, or an
 * answer to a game that serves nothing to answer.
 */
const grade = ({
  attempt,
  held,
  round
}: {
  attempt: Attempt
  held: PlayerAttempts | undefined
  round: Round
}): { said: string; verdict: Verdict } | null => {
  const content = round.content

  if (content.kind === 'blindtest') {
    if (attempt.kind === 'choice') {
      const picked = content.choices[attempt.choiceIndex]

      if (picked === undefined) {
        return null
      }

      return {
        said: `${whatTheRoomNames(picked)} — ${picked.artist}`,
        verdict: choiceVerdict(
          attempt.choiceIndex === content.correctChoiceIndex
        )
      }
    }

    return {
      said: attempt.guess,
      verdict: withGuessBanked({
        banked: held?.verdict.kind === 'halves' ? held.verdict : NOTHING_BANKED,
        guessed: gradeGuess({ guess: attempt.guess, track: content.track })
      })
    }
  }

  if (content.kind === 'quiz') {
    if (attempt.kind === 'choice') {
      const picked = content.choices[attempt.choiceIndex]

      if (picked === undefined) {
        return null
      }

      return {
        said: picked,
        verdict: {
          isCorrect: attempt.choiceIndex === content.correctChoiceIndex,
          kind: 'single'
        }
      }
    }

    const banked = held?.verdict.kind === 'single' && held.verdict.isCorrect

    return {
      said: attempt.guess,
      verdict: {
        isCorrect:
          banked ||
          gradeQuizGuess({ guess: attempt.guess, question: content.question })
            .isCorrect,
        kind: 'single'
      }
    }
  }

  return null
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

  // Two independent halves would pay twice for one charade, and a host socket
  // is as forgeable as a player's. The round's own content says which game it
  // was opened on, which is the truth `settings.game` can only agree with — the
  // server refuses a game switched under a round in play.
  if (verdict.kind !== verdictKindFor(round.content.kind)) {
    return Result.failure('invalid_message')
  }

  const points = pointsFor(verdict)
  const participant = room.players.get(playerId)

  if (participant !== undefined) {
    participant.score += points
  }

  // A miss is recorded too: the reveal panel earns the right to say who tried
  // and got it wrong, which is most of the fun of the round being over.
  //
  // No speed bonus: a judged round is one player on the floor, so the order is
  // the buzz and speed is already the whole prize.
  round.awards.push({ playerId, points, speedBonus: 0, verdict })
  round.activeBuzz = null

  if (!isMiss(verdict)) {
    revealRound(room, now)

    return Result.success('revealed')
  }

  if (locksOutOnMissIn(room.settings.game)) {
    round.lockedOutPlayerIds.add(playerId)
  }

  return Result.success(resumeOrReveal(room, now))
}

/**
 * The buzzer holder vanished — a locked screen, a closed tab, a host removing
 * them. Their claim is dropped without a verdict and without a lockout, and the
 * round carries on for everyone else rather than hanging on someone who is no
 * longer in the room.
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
 * Freezes the round where it is, without ending anything. The buzz path already
 * does this; the host walking away is the same situation seen from the other
 * side, and both have to be undoable without the room losing music it paid for.
 */
export const holdRoundClock = (room: Room, now: number): void => {
  if (room.round === null) {
    return
  }

  freezeAnswerWindow(room.round, now)
  pauseRoundClock(room.round, now)
  // Nothing is counting the reveal down any more, and a deadline left standing
  // would have every player's screen drain a bar against a timer that was just
  // cancelled.
  room.round.advancesAt = null
  touch(room, now)
}

const freezeAnswerWindow = (round: Round, now: number): void => {
  const buzz = round.activeBuzz

  if (buzz === null || buzz.expiresAt === null) {
    return
  }

  buzz.frozenWithMsLeft = Math.max(0, buzz.expiresAt - now)
  buzz.expiresAt = null
}

/**
 * Puts the round back on the clock. A countdown is restarted rather than
 * resumed: its whole purpose is that every device lands on the first note
 * together, and a `startsAt` that elapsed while nobody could hear it would have
 * the track begin mid-phrase on the screens that stayed.
 */
export const resumeRoundClock = (room: Room, now: number): void => {
  const round = room.round

  if (round === null) {
    return
  }

  if (room.phase === 'countdown') {
    round.startsAt = now + room.settings.countdownMs
    touch(room, now)

    return
  }

  if (room.phase === 'playing' || room.phase === 'voting') {
    round.runningSince = now
    touch(room, now)

    return
  }

  if (room.phase === 'buzzed' && round.activeBuzz?.frozenWithMsLeft != null) {
    round.activeBuzz.expiresAt = now + round.activeBuzz.frozenWithMsLeft
    round.activeBuzz.frozenWithMsLeft = null
    touch(room, now)

    return
  }

  // A reveal restarts its hold rather than resuming it, which is the one place
  // this function is not a mirror. The reveal is reading time, and a room that
  // spent the wait looking at a console that had gone has not read any of it.
  if (room.phase === 'revealed') {
    startAutoAdvanceHold(room, now)
    touch(room, now)
  }
}

export const revealRound = (room: Room, now: number): void => {
  const round = room.round

  if (round === null) {
    return
  }

  pauseRoundClock(round, now)
  round.activeBuzz = null
  round.revealed = true
  room.phase = 'revealed'
  startAutoAdvanceHold(room, now)
  touch(room, now)
}

/**
 * Starts the wait between this reveal and the next round, and the one place
 * that turns the setting into a moment. Every caller runs before the broadcast
 * that puts the reveal on screen, which is what lets the deadline travel with
 * the reveal rather than one frame behind it.
 */
export const startAutoAdvanceHold = (room: Room, now: number): void => {
  const holdMs = room.settings.autoAdvanceMs

  if (room.round === null) {
    return
  }

  room.round.advancesAt = holdMs === null ? null : now + holdMs
}

/**
 * Ends the open round the way its game ends one, and one function rather than a
 * branch at each caller because the reflex race is what a branch gets wrong:
 * it is buzzer-moded and settles like a simultaneous round, so reading the mode
 * alone reveals it without paying anyone.
 */
export const closeRound = (room: Room, now: number): void => {
  if (room.round?.content.kind === 'reflex') {
    settleReflexRound(room, now)

    return
  }

  const mode = room.settings.mode.kind

  if (mode === 'buzzer') {
    revealRound(room, now)

    return
  }

  settleSimultaneousRound({ mode, now, room })
}

export const finishGame = (room: Room, now: number): void => {
  room.phase = 'finished'
  room.round = null
  touch(room, now)
}

/**
 * The same players in the same seats, scores at zero. `playedContentIds`
 * survives on purpose: a second game in the same room should not replay the
 * tracks the first one just burnt through.
 */
export const restartGame = (room: Room, now: number): void => {
  for (const participant of room.players.values()) {
    participant.score = 0
  }

  room.phase = 'lobby'
  room.round = null
  touch(room, now)
}

/** Never final in a room that runs until the host stops it. */
export const isFinalRound = (room: Room): boolean => {
  const total = room.settings.roundCount

  return total !== null && (room.round?.index ?? 0) >= total
}

export const elapsedRoundMs = (round: Round, now: number): number =>
  Math.round(
    round.elapsedMs +
      (round.runningSince === null ? 0 : now - round.runningSince)
  )

/**
 * How long the phase the room is *in* runs for, and the two games that answer
 * it from somewhere other than the round duration. Le Fake writes and then
 * votes, so the round clock is wound back between the two rather than the vote
 * growing a clock of its own. The reflex race draws its wait per round, so the
 * only thing that knows how long the heat runs is the heat.
 */
const openPhaseDurationMs = (room: Room): number | null => {
  if (room.phase === 'voting') {
    return voteDurationMsOf(room.settings.game)
  }

  const content = room.round?.content

  return content?.kind === 'reflex'
    ? reflexRoundDurationMs(content.flipDelayMs)
    : roundDurationMsOf(room.settings.game)
}

/**
 * How much of the open phase is left, or `null` for a game that has no such
 * clock — the bare buzzer serves nothing, so there is nothing for the room to
 * run out of and the round ends on a verdict or on the host's word.
 */
export const remainingRoundMs = (room: Room, now: number): number | null => {
  const total = openPhaseDurationMs(room)

  if (room.round === null) {
    return 0
  }

  return total === null
    ? null
    : Math.max(0, total - elapsedRoundMs(room.round, now))
}

const resumeOrReveal = (room: Room, now: number): VerdictOutcome => {
  const round = room.round

  if (round === null) {
    return 'revealed'
  }

  const remaining = remainingRoundMs(room, now)

  const canResume =
    hasEligibleBuzzer({
      candidates: [...room.players.values()].filter(
        (participant) =>
          !hasJoinedAfterStart({
            openedWithPlayerIds: round.openedWithPlayerIds,
            playerId: participant.id
          })
      ),
      lockedOutPlayerIds: [...round.lockedOutPlayerIds]
    }) &&
    (remaining === null || remaining > 0)

  if (!canResume) {
    revealRound(room, now)

    return 'revealed'
  }

  room.phase = 'playing'
  round.runningSince = now
  touch(room, now)

  return 'resumed'
}

const pauseRoundClock = (round: Round, now: number): void => {
  if (round.runningSince === null) {
    return
  }

  round.elapsedMs += now - round.runningSince
  round.runningSince = null
}
