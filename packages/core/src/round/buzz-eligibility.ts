import type { PlayerRoomView } from '@blindtest/protocol/room'

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
