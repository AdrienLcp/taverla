import type React from 'react'

import type { PlayerId, RoomCode } from '@taverla/protocol/identifiers'
import type { PublicPlayer } from '@taverla/protocol/room'

import { Pawn } from '@/presentation/components/pawn'
import { VisuallyHidden } from '@/presentation/components/visually-hidden'
import { useTranslate } from '@/presentation/i18n/i18n-provider'

import './round-chrome.sass'

const MOST_PIPS = 15

type RoundChromeProps = {
  players: readonly PublicPlayer[]
  /**
   * Printed where the round would be while no round is being played — the
   * lobby and the final board — so the line still says which table this is.
   */
  roomCode?: RoomCode
  /** `null` when the room plays until its host ends it, which draws no pips. */
  roundCount: number | null
  /**
   * `null` outside a game's rounds: the line then carries the room's code and
   * the seat's name rather than a round and a score nobody has earned yet.
   */
  roundIndex: number | null
  /** The seat whose pawn and score the line carries. */
  youId: PlayerId
}

/**
 * The round and the seat's own pawn and score, on the one line the menu
 * trigger ends — the whole of the chrome a screen of four tiles can afford, and
 * the same line on every other screen a seat sees, so it never moves between
 * phases. The pips are the round as squares on a track, dropped when the line
 * is too narrow to hold them.
 */
export const RoundChrome: React.FC<RoundChromeProps> = ({
  players,
  roomCode,
  roundCount,
  roundIndex,
  youId
}) => {
  const translate = useTranslate()
  const youSeat = players.findIndex((player) => player.id === youId)
  const you = players[youSeat]
  const score = you?.score ?? 0

  return (
    <header className='round-chrome'>
      {roundIndex === null ? (
        roomCode !== undefined && (
          <p className='room'>{translate('player.room', { code: roomCode })}</p>
        )
      ) : (
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
      )}
      <p className='you'>
        <Pawn seat={Math.max(0, youSeat)} />
        {roundIndex === null ? (
          <span className='name'>
            {you?.nickname ?? translate('player.you')}
          </span>
        ) : (
          <>
            <span className='score'>
              {translate('player.score', { points: score })}
            </span>
            <VisuallyHidden elementType='span'>
              {translate('player.points', { points: score })}
            </VisuallyHidden>
          </>
        )}
      </p>
    </header>
  )
}
