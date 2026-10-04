import type { PublicPlayer, RoomPhase, RoundView } from '@taverla/protocol/room'

import { winnersOf } from '@taverla/core/scoring/scoreboard'

/**
 * The player whose pawn colour the score track takes: whoever holds the floor
 * while somebody does, and the winner once the game is over. A shared win
 * keeps the phase's own ink — one colour cannot name two players.
 */
export const trackInkHolderOf = (view: {
  phase: RoomPhase
  players: readonly PublicPlayer[]
  round: RoundView | null
}): string | null => {
  if (view.phase === 'buzzed') {
    return view.round?.activeBuzz?.playerId ?? null
  }

  if (view.phase === 'finished') {
    const [winner, ...sharing] = winnersOf(view.players)

    return winner !== undefined && sharing.length === 0 ? winner.id : null
  }

  return null
}
