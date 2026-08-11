import type React from 'react'

import type { PublicPlayer, RoundView } from '@taverla/protocol/room'

import { blindtestContent } from '@/helpers/blindtest-round'
import { useTranslate } from '@/presentation/i18n/i18n-provider'

import './reveal-panel.sass'

type RevealPanelProps = {
  /** Needed to turn the awards' player ids into names. */
  players: readonly PublicPlayer[]
  round: RoundView
}

/**
 * How the round went, for the screen the room is looking at. A game that served
 * something reveals it here and nowhere else; one whose question the room owns
 * has nothing to give away, and the panel is the scoreline alone.
 */
export const RevealPanel: React.FC<RevealPanelProps> = ({ players, round }) => {
  const translate = useTranslate()
  const track = blindtestContent(round)?.revealedTrack ?? null

  if (track === null) {
    return (
      <section className='reveal-panel bare'>
        <div className='identity'>
          <Outcome players={players} round={round} />
        </div>
      </section>
    )
  }

  return (
    <section className='reveal-panel'>
      {track.coverUrl === null ? (
        <div className='cover placeholder' />
      ) : (
        <img
          alt=''
          className='cover'
          height={250}
          src={track.coverUrl}
          width={250}
        />
      )}

      <div className='identity'>
        <p className='framing'>{translate('blindtest.reveal.title')}</p>
        <p className='title'>{track.title}</p>
        <p className='artist'>{track.artist}</p>

        <Outcome players={players} round={round} />
      </div>
    </section>
  )
}

const Outcome = ({ players, round }: RevealPanelProps) => {
  const translate = useTranslate()
  const scorers = round.awards.filter((award) => award.points > 0)

  const nameOf = (playerId: string): string =>
    players.find((player) => player.id === playerId)?.nickname ?? '—'

  if (round.revealedAnswers.length > 0) {
    return (
      <ul className='said'>
        {round.revealedAnswers.map((answer) => (
          <li
            className={answer.isCorrect ? 'right' : 'wrong'}
            key={answer.playerId}
          >
            <span className='nickname'>{nameOf(answer.playerId)}</span>
            <span className='words'>{answer.said}</span>
          </li>
        ))}
      </ul>
    )
  }

  if (scorers.length === 0) {
    return <p className='nobody'>{translate('round.nobody')}</p>
  }

  return (
    <ul className='scorers'>
      {scorers.map((award) => (
        <li key={award.playerId}>
          <span className='nickname'>{nameOf(award.playerId)}</span>
          <span className='points'>
            {translate('round.scored', { points: award.points })}
          </span>
        </li>
      ))}
    </ul>
  )
}
