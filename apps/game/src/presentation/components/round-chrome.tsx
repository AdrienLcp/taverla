import type React from 'react'

import type { PlayerId } from '@taverla/protocol/identifiers'
import type { PublicPlayer } from '@taverla/protocol/room'

import { Pawn } from '@/presentation/components/pawn'
import { VisuallyHidden } from '@/presentation/components/visually-hidden'
import { useTranslate } from '@/presentation/i18n/i18n-provider'

const MOST_PIPS = 15

type RoundChromeProps = {
  players: readonly PublicPlayer[]
  /** `null` when the room plays until its host ends it, which draws no pips. */
  roundCount: number | null
  roundIndex: number
  /** The seat whose pawn and score the line carries. */
  youId: PlayerId
}

/**
 * The round and the seat's own pawn and score, on the one line the menu
 * trigger ends — the whole of the chrome a screen of four tiles can afford.
 * The pips are the round as squares on a track, dropped when the line is too
 * narrow to hold them. The clock is not here: it drains along the question
 * card's top edge, which is where the eye already is.
 */
export const RoundChrome: React.FC<RoundChromeProps> = ({
  players,
  roundCount,
  roundIndex,
  youId
}) => {
  const translate = useTranslate()
  const youSeat = players.findIndex((player) => player.id === youId)
  const score = players[youSeat]?.score ?? 0

  return (
    <header className='round-chrome'>
      <p className='round-index'>
        <VisuallyHidden elementType='span'>
          {roundCount === null
            ? translate('round.indexOpen', { index: roundIndex })
            : translate('round.index', {
                index: roundIndex,
                total: roundCount
              })}
        </VisuallyHidden>
        <span aria-hidden='true' className='figures'>
          {roundCount === null ? roundIndex : `${roundIndex}/${roundCount}`}
        </span>
        {roundCount !== null && roundCount <= MOST_PIPS && (
          <span aria-hidden='true' className='pips'>
            {Array.from({ length: roundCount }, (_, pip) => pip + 1).map(
              (pipRound) => (
                <i
                  data-state={
                    pipRound < roundIndex
                      ? 'done'
                      : pipRound === roundIndex
                        ? 'now'
                        : 'next'
                  }
                  key={pipRound}
                />
              )
            )}
          </span>
        )}
      </p>
      <p className='you'>
        <Pawn seat={Math.max(0, youSeat)} />
        <span className='score'>{score}</span>
        <VisuallyHidden elementType='span'>
          {translate('player.points', { points: score })}
        </VisuallyHidden>
      </p>
    </header>
  )
}
