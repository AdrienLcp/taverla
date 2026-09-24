import type { RoomPhase } from '@taverla/protocol/room'

const PHASES_WITH_A_ROUND_IN_PLAY = new Set<RoomPhase>([
  'countdown',
  'playing',
  'buzzed',
  'voting',
  'correcting'
])

/**
 * Whether a round is open: begun, and not yet closed. A reveal is not one — the
 * round is scored and on screen, and the next is built from scratch — which is
 * what makes the gap between two rounds the moment anything about them may
 * change.
 */
export const isRoundInPlay = (phase: RoomPhase): boolean =>
  PHASES_WITH_A_ROUND_IN_PLAY.has(phase)

const PHASES_OUTSIDE_A_GAME = new Set<RoomPhase>(['lobby', 'finished'])

/**
 * Whether there is a game to end: one has been launched, and its final board is
 * not up yet. It is the complement that is enumerated, so a phase added to the
 * middle of a round — `voting` was — counts as part of a game without anybody
 * having to remember to say so.
 */
export const isGameInPlay = (phase: RoomPhase): boolean =>
  !PHASES_OUTSIDE_A_GAME.has(phase)
