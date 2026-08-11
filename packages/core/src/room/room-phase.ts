import type { RoomPhase } from '@taverla/protocol/room'

const PHASES_WITH_A_ROUND_IN_PLAY = new Set<RoomPhase>([
  'countdown',
  'playing',
  'buzzed'
])

/**
 * Whether a round is open: begun, and not yet closed. A reveal is not one — the
 * round is scored and on screen, and the next is built from scratch — which is
 * what makes the gap between two rounds the moment anything about them may
 * change.
 */
export const isRoundInPlay = (phase: RoomPhase): boolean =>
  PHASES_WITH_A_ROUND_IN_PLAY.has(phase)
