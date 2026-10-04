import type React from 'react'

import type { PlayerId } from '@taverla/protocol/identifiers'
import type { PublicPlayer } from '@taverla/protocol/room'

import { winnersOf } from '@taverla/core/scoring/scoreboard'

import { answerFitting } from '@/helpers/answer-fitting'
import { Pawn } from '@/presentation/components/pawn'
import { useTranslate } from '@/presentation/i18n/i18n-provider'

import { Standings } from './standings'

import './final-board.sass'

type FinalBoardProps = {
  players: readonly PublicPlayer[]
  /** The seat this console took; `null` on the wall and on an unseated console. */
  youId: PlayerId | null
}

/**
 * A game ends on a name, not on a table: the winner's pawn stood up oversize
 * and named, with the standings beside it for each player to find themselves.
 *
 * Ties are named rather than broken: competition ranking already shares first
 * place, and inventing a winner out of alphabetical order would be a lie the
 * room can check.
 */
export const FinalBoard: React.FC<FinalBoardProps> = ({ players, youId }) => {
  const translate = useTranslate()
  const winners = winnersOf(players)
  const topScore = winners[0]?.score ?? 0
  const named = winners.map((winner) => winner.nickname).join(' · ')

  return (
    <section
      className='final-board'
      style={{ '--standings-rows': players.length }}
    >
      <div className='podium' style={{ '--winner-count': winners.length }}>
        {winners.length === 0 ? (
          <h1 className='nobody'>{translate('host.final.nobody')}</h1>
        ) : (
          <>
            <div className='pawns'>
              {winners.map((winner) => (
                <Pawn key={winner.id} seat={players.indexOf(winner)} />
              ))}
            </div>
            <h1 className='winners' style={answerFitting(named)}>
              {named}
            </h1>
            <p className='with'>
              {translate(
                winners.length > 1 ? 'host.final.tied' : 'host.final.wins',
                {
                  points: topScore
                }
              )}
            </p>
          </>
        )}
      </div>

      <Standings players={players} youId={youId} />
    </section>
  )
}
