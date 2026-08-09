import type React from 'react'

import type { PublicPlayer, RoundView } from '@blindtest/protocol/room'

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
        <p className='title'>{track.title}</p>
        <p className='artist'>{track.artist}</p>
        <p className='framing'>{translate('blindtest.reveal.title')}</p>

        {scorers.length === 0 ? (
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
