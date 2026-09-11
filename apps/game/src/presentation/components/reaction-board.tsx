import type React from 'react'

import type { PublicPlayer, RoundView } from '@taverla/protocol/room'

import { buildReactionBoard } from '@taverla/core/reflex/reaction-board'

import { reflexContent } from '@/helpers/round-content'
import { useTranslate } from '@/presentation/i18n/i18n-provider'

import './reaction-board.sass'

type ReactionBoardProps = {
  /** Needed to turn the presses' player ids into names. */
  players: readonly PublicPlayer[]
  round: RoundView
}

/**
 * What a heat turned out to be, and the whole of its reveal: this is the one
 * game where the answer was never a secret, so there is nothing to give away
 * and the times are the payout. Fastest first, then whoever went early.
 */
export const ReactionBoard: React.FC<ReactionBoardProps> = ({
  players,
  round
}) => {
  const translate = useTranslate()
  const content = reflexContent(round)

  const rows = buildReactionBoard({
    flipsAt: content?.flipsAt ?? null,
    jumpedPlayerIds: round.lockedOutPlayerIds,
    presses: content?.presses ?? []
  })

  if (rows.length === 0) {
    return <p className='nobody'>{translate('reflex.nobody')}</p>
  }

  const nameOf = (playerId: string): string =>
    players.find((player) => player.id === playerId)?.nickname ?? '—'

  return (
    // Ordered rather than a bare list, and for once the numbering is the
    // content: the room is reading a finishing order, not a set of names.
    <ol className='reaction-board' style={{ '--outcome-rows': rows.length }}>
      {rows.map((row) => (
        <li className={row.kind} key={row.playerId}>
          <span className='nickname'>{nameOf(row.playerId)}</span>
          <span className='reaction'>
            {row.kind === 'jumped'
              ? translate('reflex.tooEarly')
              : translate('reflex.reaction', { milliseconds: row.reactionMs })}
          </span>
        </li>
      ))}
    </ol>
  )
}
