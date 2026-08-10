import type React from 'react'

import type { PublicPlayer } from '@taverla/protocol/room'

import { buildScoreboard } from '@taverla/core/scoring/scoreboard'

import './scoreboard.sass'

type ScoreboardProps = {
  /** For a caller that lays the rows out differently — the final board does. */
  className?: string
  /** Ranked here, not by the caller — ties share a rank and the order is stable. */
  players: readonly PublicPlayer[]
  /** Only ever CSS custom properties a layout needs at runtime. */
  style?: React.CSSProperties
  /** Highlights one row; the phone passes its own id, the host passes none. */
  youId?: string
}

export const Scoreboard: React.FC<ScoreboardProps> = ({
  className,
  players,
  style,
  youId
}) => (
  <ol
    className={['scoreboard', className].filter(Boolean).join(' ')}
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
      </li>
    ))}
  </ol>
)
