import type React from 'react'

import type { PublicPlayer, RoundView } from '@taverla/protocol/room'

import { Pawn } from '@/presentation/components/pawn'
import { VisuallyHidden } from '@/presentation/components/visually-hidden'
import { useTranslate } from '@/presentation/i18n/i18n-provider'

import './answered-pawns.sass'

type AnsweredPawnsProps = {
  players: readonly PublicPlayer[]
  round: RoundView
}

/**
 * Who is in and who the room is still waiting on, as the pawns the score track
 * already taught the table to read: standing for an answer sent, a dashed
 * outline for one still owed. It says *that*, never *what* — the room shares
 * this screen.
 */
export const AnsweredPawns: React.FC<AnsweredPawnsProps> = ({
  players,
  round
}) => {
  const translate = useTranslate()
  const answeredIds = new Set(round.answers.map((answer) => answer.playerId))
  const answeredCount = players.filter((player) =>
    answeredIds.has(player.id)
  ).length

  return (
    <section className='answered-pawns'>
      <p className='count' role='status'>
        {translate('host.answered', {
          count: answeredCount,
          total: players.length
        })}
      </p>
      <ul>
        {players.map((player, seat) => (
          <li
            data-answered={answeredIds.has(player.id) || undefined}
            key={player.id}
          >
            <Pawn seat={seat} />
            <VisuallyHidden elementType='span'>
              {player.nickname}
            </VisuallyHidden>
          </li>
        ))}
      </ul>
    </section>
  )
}
