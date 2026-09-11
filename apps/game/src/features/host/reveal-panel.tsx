import type React from 'react'

import type { PublicPlayer, RoundView } from '@taverla/protocol/room'

import { cueOf, whatTheRoomNames } from '@taverla/core/blindtest/typed-answer'

import {
  blindtestContent,
  lefakeContent,
  quizContent,
  reflexContent
} from '@/helpers/round-content'
import { ReactionBoard } from '@/presentation/components/reaction-board'
import { RevealedLieBoard } from '@/presentation/components/revealed-lie-board'
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
  const question = quizContent(round)?.revealedQuestion ?? null
  const lieBoard = lefakeContent(round)?.revealedBoard ?? null

  // The board *is* the reveal here, and it already names who scored what off
  // whom — so `Outcome`'s list of nicknames beside it would say it twice.
  if (lieBoard !== null) {
    return (
      <section className='reveal-panel'>
        <div className='identity'>
          <RevealedLieBoard board={lieBoard} players={[...players]} />
        </div>
      </section>
    )
  }

  if (track !== null) {
    return (
      <section className='reveal-panel with-cover'>
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
          <p
            className='title'
            style={{ '--answer-length': whatTheRoomNames(track).length }}
          >
            {whatTheRoomNames(track)}
          </p>
          <p className='artist'>{track.artist}</p>
          {cueOf(track) !== null && <p className='note'>{cueOf(track)}</p>}

          <Outcome players={players} round={round} />
        </div>
      </section>
    )
  }

  if (question !== null) {
    return (
      <section className='reveal-panel'>
        <div className='identity'>
          <p className='framing'>{translate('quiz.reveal.title')}</p>
          <p
            className='title'
            style={{ '--answer-length': question.answer.length }}
          >
            {question.answer}
          </p>
          {question.note !== null && <p className='note'>{question.note}</p>}

          <Outcome players={players} round={round} />
        </div>
      </section>
    )
  }

  // The times *are* the reveal here — this is the one game where nothing was
  // ever withheld — so the board replaces the scoreline rather than sitting
  // under it, and it already names who took the round by putting them first.
  if (reflexContent(round) !== null) {
    return (
      <section className='reveal-panel bare'>
        <div className='identity'>
          <ReactionBoard players={players} round={round} />
        </div>
      </section>
    )
  }

  return (
    <section className='reveal-panel bare'>
      <div className='identity'>
        <Outcome players={players} round={round} />
      </div>
    </section>
  )
}

const Outcome: React.FC<RevealPanelProps> = ({ players, round }) => {
  const translate = useTranslate()
  const scorers = round.awards.filter((award) => award.points > 0)

  const nameOf = (playerId: string): string =>
    players.find((player) => player.id === playerId)?.nickname ?? '—'

  // How many rows the room has to read, for a host stage that divides its own
  // height by them. It is not the player count: a player who never answered is
  // in neither list, and only the ones drawn here pay for the space.
  if (round.revealedAnswers.length > 0) {
    return (
      <ul
        className='said'
        style={{ '--outcome-rows': round.revealedAnswers.length }}
      >
        {round.revealedAnswers.map((answer) => {
          const paid = scorers.find(
            (award) => award.playerId === answer.playerId
          )

          return (
            <li
              className={answer.isCorrect ? 'right' : 'wrong'}
              key={answer.playerId}
            >
              <span className='nickname'>{nameOf(answer.playerId)}</span>
              <span className='words'>{answer.said}</span>
              {/* A round nobody took spends nothing on a column of blanks; one
                  somebody took keeps the box on every row, or the answers above
                  and below a miss end on two different right edges. */}
              {scorers.length > 0 && (
                <span className='points'>
                  {paid === undefined
                    ? null
                    : paid.speedBonus > 0
                      ? translate('round.awardWithSpeed', {
                          answer: paid.points - paid.speedBonus,
                          speed: paid.speedBonus
                        })
                      : translate('round.award', { points: paid.points })}
                </span>
              )}
            </li>
          )
        })}
      </ul>
    )
  }

  if (scorers.length === 0) {
    return <p className='nobody'>{translate('round.nobody')}</p>
  }

  return (
    <ul className='scorers' style={{ '--outcome-rows': scorers.length }}>
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
