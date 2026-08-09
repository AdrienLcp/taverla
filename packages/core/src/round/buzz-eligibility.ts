import type { ProtocolErrorCode } from '@blindtest/protocol/error-code'
import type { PlayerId, RoundId } from '@blindtest/protocol/identifiers'
import type { PlayerRoomView, RoomPhase } from '@blindtest/protocol/room'

export type BuzzBlocker =
  | 'round_not_running'
  | 'you_already_missed'
  | 'your_answer_is_pending'
  | 'someone_else_buzzed'

/**
 * Why this phone's buzzer is dead, or `null` when it is armed. It returns the
 * reason rather than a boolean because a disabled button with no explanation is
 * the single most frustrating thing a party game can show someone — the caller
 * turns this into the label under the buzzer.
 *
 * The server decides the same question authoritatively; this is the client's
 * copy, and the two disagreeing for a few hundred milliseconds around a buzz is
 * normal and harmless.
 */
export const findBuzzBlocker = (view: PlayerRoomView): BuzzBlocker | null => {
  const { round } = view

  if (round === null) {
    return 'round_not_running'
  }

  // Checked before the buzz state because a lockout lasts the whole round: it
  // is the durable answer, where "someone else buzzed" changes every few
  // seconds and would flicker over it.
  if (round.lockedOutPlayerIds.includes(view.youId)) {
    return 'you_already_missed'
  }

  if (round.activeBuzz !== null) {
    return round.activeBuzz.playerId === view.youId
      ? 'your_answer_is_pending'
      : 'someone_else_buzzed'
  }

  return view.phase === 'playing' ? null : 'round_not_running'
}

/**
 * Widening `error-code.ts` without teaching the server which codes a buzz may
 * be refused with is a compile error, which is the point of the `Extract`.
 */
export type BuzzRejection = Extract<
  ProtocolErrorCode,
  'already_buzzed' | 'player_locked_out' | 'stale_round' | 'wrong_phase'
>

/**
 * The server's answer to the question `findBuzzBlocker` answers for the client,
 * and deliberately a different one: the phone asks "is my button dead, and what
 * do I write under it", the server asks "do I accept this frame, and with which
 * code". They sit in one file so the two cannot drift apart unnoticed.
 */
export const findBuzzRejection = ({
  claimedRoundId,
  currentRoundId,
  hasActiveBuzz,
  isLockedOut,
  phase
}: {
  claimedRoundId: RoundId
  currentRoundId: RoundId | null
  hasActiveBuzz: boolean
  isLockedOut: boolean
  phase: RoomPhase
}): BuzzRejection | null => {
  if (currentRoundId === null) {
    return 'wrong_phase'
  }

  // Ahead of the phase check: a thumb that landed as the round turned over is a
  // late click on a round that moved on, and saying so is more use than saying
  // the phase is wrong.
  if (claimedRoundId !== currentRoundId) {
    return 'stale_round'
  }

  if (isLockedOut) {
    return 'player_locked_out'
  }

  if (hasActiveBuzz) {
    return 'already_buzzed'
  }

  return phase === 'playing' ? null : 'wrong_phase'
}

export type BuzzCandidate = {
  id: PlayerId
  isConnected: boolean
}

/**
 * Whether a miss leaves the round alive. A phone that dropped off Wi-Fi does
 * not count as someone who could still answer — otherwise one player walking
 * out of the room holds the clip open to its full length every time.
 */
export const hasEligibleBuzzer = ({
  candidates,
  lockedOutPlayerIds
}: {
  candidates: readonly BuzzCandidate[]
  lockedOutPlayerIds: readonly PlayerId[]
}): boolean =>
  candidates.some(
    (candidate) =>
      candidate.isConnected && !lockedOutPlayerIds.includes(candidate.id)
  )
