import type React from 'react'

import type { PublicPlayer } from '@taverla/protocol/room'

import { buildScoreboard } from '@taverla/core/scoring/scoreboard'

import { Scoreboard } from '@/presentation/components/scoreboard'
import { useTranslate } from '@/presentation/i18n/i18n-provider'

import './final-board.sass'

/** Past this the rows are read as a block rather than one at a time. */
const PLAYERS_PER_COLUMN = 8

type FinalBoardProps = {
  players: readonly PublicPlayer[]
}

/**
 * A game ends on a name, not on a table. The list was already complete and
 * ranked — what was missing is that nothing on the screen said who won, so a
 * room of six read a scoreboard instead of hearing a result.
 *
 * Ties are named rather than broken: competition ranking already shares first
 * place, and inventing a winner out of alphabetical order would be a lie the
 * room can check.
 */
export const FinalBoard: React.FC<FinalBoardProps> = ({ players }) => {
  const translate = useTranslate()
  const ranked = buildScoreboard(players)
  const winners = ranked.filter((entry) => entry.rank === 1)
  const topScore = winners[0]?.player.score ?? 0

  return (
    <section className='final-board'>
      <header>
        <p className='label'>
          {translate(
            topScore === 0
              ? 'host.final.nobody'
              : winners.length > 1
                ? 'host.final.tie'
                : 'host.final.winner'
          )}
        </p>
        {topScore > 0 && (
          <>
            <h1 className='winners'>
              {winners.map((entry) => entry.player.nickname).join(' · ')}
            </h1>
            {/*
              Two keys rather than one with a `{points}` word after it. There is
              no plural machinery here on purpose, and "1 points" on the biggest
              screen in the room is exactly where its absence would show.
            */}
            <p className='with'>
              {translate(
                topScore === 1 ? 'host.final.point' : 'host.final.points',
                { points: topScore }
              )}
            </p>
          </>
        )}
      </header>

      {players.length > PLAYERS_PER_COLUMN ? (
        <Scoreboard
          className='in-columns'
          players={players}
          style={{
            '--scoreboard-rows': Math.ceil(players.length / 2)
          }}
        />
      ) : (
        <Scoreboard players={players} />
      )}
    </section>
  )
}
