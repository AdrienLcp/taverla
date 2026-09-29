import type React from 'react'

import type { PublicPlayer } from '@taverla/protocol/room'

import {
  buildScoreboard,
  hasAnybodyScored
} from '@taverla/core/scoring/scoreboard'

import { useTranslate } from '@/presentation/i18n/i18n-provider'

import { Button } from './button'
import { VisuallyHidden } from './visually-hidden'

import './scoreboard.sass'

/** Past this a ranking is read as a block rather than one row at a time. */
const PLAYERS_PER_COLUMN = 8

type ScoreboardProps = {
  /** For a caller that lays the rows out differently — the final board does. */
  className?: string
  /**
   * The board is the game's result rather than who is in the room, which is
   * two things at once: it publishes how tall it is, so a stage with a height
   * budget can divide by it, and it deals into two columns past eight players
   * where the box it is drawn in has room for them. A roster does neither — it
   * is read while it is still growing, and nobody reads it downwards.
   *
   * The caller still owes the container the columns are measured against.
   */
  isResult?: boolean
  /**
   * Names the list where the screen around it does not. The lobby roster on a
   * player's screen is a column of nicknames under a pitch, and a reader who
   * cannot see it is told only "list, six items".
   */
  label?: string
  /**
   * Gives each row a way to drop that player. Omitted everywhere the board is
   * something to *read* — the room's screen mid-round, a player's screen, the
   * final board — and passed only by the host's own roster, which is the one
   * surface where who is in the room is being managed rather than shown.
   */
  onRemove?: (playerId: string) => void
  /** Ranked here, not by the caller — ties share a rank and the order is stable. */
  players: readonly PublicPlayer[]
  /** Only ever CSS custom properties a layout needs at runtime. */
  style?: React.CSSProperties
  /** Highlights one row; a player passes their own id, the host passes none. */
  youId?: string
}

export const Scoreboard: React.FC<ScoreboardProps> = ({
  className,
  isResult,
  label,
  onRemove,
  players,
  style,
  youId
}) => {
  const translate = useTranslate()
  const isRanked = hasAnybodyScored(players)

  return (
    <ol
      aria-label={label}
      className={[
        'scoreboard',
        isRanked && 'ranked',
        isResult === true &&
          players.length > PLAYERS_PER_COLUMN &&
          'in-columns',
        onRemove !== undefined && 'removable',
        className
      ]
        .filter(Boolean)
        .join(' ')}
      style={
        isResult === true
          ? {
              ...style,
              '--scoreboard-count': players.length,
              '--scoreboard-rows': Math.ceil(players.length / 2)
            }
          : style
      }
    >
      {buildScoreboard(players).map(({ player, rank }) => (
        <li
          className={[
            player.isConnected ? 'connected' : 'away',
            player.id === youId && 'you'
          ]
            .filter(Boolean)
            .join(' ')}
          // The rank as ranked, so a board can style a podium without counting
          // rows: two players sharing first are both `1`, and the row after
          // them is `3`. Absent until somebody has scored, the same way the
          // column is.
          data-rank={isRanked ? rank : undefined}
          key={player.id}
        >
          {isRanked && <span className='rank'>{rank}</span>}
          <span className='nickname'>
            <span className='name'>{player.nickname}</span>
            {/*
              A seat whose screen has gone. It used to be the row's opacity and
              nothing else, which said it by taking the whole row under the
              contrast floor and said it to no reader who was not looking at it.
              The word is the signal now; the ink only seconds it.
            */}
            {!player.isConnected && (
              <span className='state'>{translate('player.away')}</span>
            )}
            {player.id === youId && (
              <VisuallyHidden elementType='span'>{` (${translate('player.you')})`}</VisuallyHidden>
            )}
          </span>
          {isRanked && <span className='score'>{player.score}</span>}
          {onRemove !== undefined && (
            <Button
              aria-label={translate('host.players.removeNamed', {
                nickname: player.nickname
              })}
              onPress={() => {
                onRemove(player.id)
              }}
              size='small'
              variant='underlined'
            >
              {translate('host.players.remove')}
            </Button>
          )}
        </li>
      ))}
    </ol>
  )
}
