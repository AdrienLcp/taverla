import type React from 'react'

import type { PublicPlayer, RoundView } from '@taverla/protocol/room'

import { useTranslate } from '@/presentation/i18n/i18n-provider'

import './reveal-panel.sass'

type RevealPanelProps = {
  /** Needed to turn the awards' player ids into names. */
  players: readonly PublicPlayer[]
  round: RoundView
}

export const RevealPanel: React.FC<RevealPanelProps> = ({ players, round }) => {
  const translate = useTranslate()
  const track = round.revealedTrack
  const scorers = round.awards.filter((award) => award.points > 0)

  if (track === null) {
    return null
  }

  const nameOf = (playerId: string): string =>
    players.find((player) => player.id === playerId)?.nickname ?? '—'

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

        {round.revealedAnswers.length > 0 ? (
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
        ) : scorers.length === 0 ? (
          <p className='nobody'>{translate('blindtest.reveal.nobody')}</p>
        ) : (
          <ul className='scorers'>
            {scorers.map((award) => (
              <li key={award.playerId}>
                <span className='nickname'>
                  {players.find((player) => player.id === award.playerId)
                    ?.nickname ?? '—'}
                </span>
                <span className='points'>
                  {translate('blindtest.youScored', { points: award.points })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
