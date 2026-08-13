import type React from 'react'

import type { PublicPlayer } from '@taverla/protocol/room'

import { buildScoreboard } from '@taverla/core/scoring/scoreboard'

import { useTranslate } from '@/presentation/i18n/i18n-provider'

import { Button } from './button'

import './scoreboard.sass'

type ScoreboardProps = {
  /** For a caller that lays the rows out differently — the final board does. */
  className?: string
  /**
   * Gives each row a way to drop that player. Omitted everywhere the board is
   * something to *read* — the room's screen mid-round, the phone, the final
   * board — and passed only by the host's own roster, which is the one surface
   * where who is in the room is being managed rather than shown.
   */
  onRemove?: (playerId: string) => void
  /** Ranked here, not by the caller — ties share a rank and the order is stable. */
  players: readonly PublicPlayer[]
  /** Only ever CSS custom properties a layout needs at runtime. */
  style?: React.CSSProperties
  /** Highlights one row; the phone passes its own id, the host passes none. */
  youId?: string
}

export const Scoreboard: React.FC<ScoreboardProps> = ({
  className,
  onRemove,
  players,
  style,
  youId
}) => {
  const translate = useTranslate()

  return (
    <ol
      className={[
        'scoreboard',
        onRemove !== undefined && 'removable',
        className
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
    >
      {buildScoreboard(players).map(({ player, rank }) => (
        <li
          className={[
            player.isConnected ? 'connected' : 'away',
            player.id === youId && 'you'
          ]
            .filter(Boolean)
            .join(' ')}
          key={player.id}
        >
          <span className='rank'>{rank}</span>
          <span className='nickname'>{player.nickname}</span>
          <span className='score'>{player.score}</span>
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
