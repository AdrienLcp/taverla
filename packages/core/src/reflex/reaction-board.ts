import type { PlayerId } from '@taverla/protocol/identifiers'

import { reactionMsOf } from './reaction'

export type ReactionRow =
  | { kind: 'jumped'; playerId: PlayerId }
  | { kind: 'reacted'; playerId: PlayerId; reactionMs: number }

export type ReflexTapRecord = {
  atServerTime: number
  playerId: PlayerId
}

/**
 * The heat as the room reads it: everyone who answered the flip, fastest first,
 * then everyone who went before it.
 *
 * The taps are **not** sorted, and must not be given a sort. They arrive in the
 * order the server stamped them and every reaction subtracts the same
 * `flipsAt`, so arrival order already *is* reaction order — a comparator here
 * would be a second opinion about who won, over a race the server has already
 * paid out.
 *
 * A lockout has exactly one cause in this game, which is what lets the two
 * lists be read as *who reacted* and *who jumped* with nothing else consulted.
 * A player who neither tapped nor jumped is in neither list, and pays for none
 * of the room's screen.
 */
export const buildReactionBoard = ({
  flipsAt,
  jumpedPlayerIds,
  taps
}: {
  flipsAt: number | null
  jumpedPlayerIds: readonly PlayerId[]
  taps: readonly ReflexTapRecord[]
}): ReactionRow[] => {
  // A round abandoned before its clip started has taps from nobody, and no
  // moment to measure them from either — the reveal is the standings alone.
  const reacted: ReactionRow[] =
    flipsAt === null
      ? []
      : taps.map((tap) => ({
          kind: 'reacted',
          playerId: tap.playerId,
          reactionMs: reactionMsOf({ flipsAt, tappedAt: tap.atServerTime })
        }))

  return [
    ...reacted,
    ...jumpedPlayerIds.map(
      (playerId): ReactionRow => ({ kind: 'jumped', playerId })
    )
  ]
}
