import type React from 'react'

import type { PublicPlayer, RoundView } from '@taverla/protocol/room'

import { cueOf, whatTheRoomNames } from '@taverla/core/blindtest/typed-answer'

import { answerFitting } from '@/helpers/answer-fitting'
import {
  blindtestContent,
  quizContent,
  reflexContent
} from '@/helpers/round-content'
import { Pawn } from '@/presentation/components/pawn'
import { ReactionBoard } from '@/presentation/components/reaction-board'
import { VisuallyHidden } from '@/presentation/components/visually-hidden'
import { useTranslate } from '@/presentation/i18n/i18n-provider'

import './reveal-panel.sass'

type RevealPanelProps = {
  /** Needed to turn the awards' player ids into names and pawns. */
  players: readonly PublicPlayer[]
  round: RoundView
}

/** Past this a list deals into a second column, and past twelve a third. */
const ROWS_PER_SINGLE_COLUMN = 4
const ROWS_PER_DOUBLE_COLUMN = 12

/**
 * How a list of `count` rows is dealt, published for the stylesheet: a row's
 * type is the height of its column divided by the rows in it, and only the
 * component knows how many rows there are.
 */
const dealtRows = (count: number): React.CSSProperties => {
  const columns =
    count <= ROWS_PER_SINGLE_COLUMN
      ? 1
      : count <= ROWS_PER_DOUBLE_COLUMN
        ? 2
        : 3

  return {
    '--outcome-columns': columns,
    '--outcome-rows': Math.ceil(count / columns)
  }
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
  if (track !== null) {
    return (
      <section className='reveal-panel with-cover' data-game='blindtest'>
        <div className='head'>
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

          <div
            className='identity'
            style={answerFitting(whatTheRoomNames(track))}
          >
            <p className='title'>
              <VisuallyHidden elementType='span'>
                {`${translate('blindtest.reveal.title')} `}
              </VisuallyHidden>
              {whatTheRoomNames(track)}
            </p>
            <p className='artist'>{track.artist}</p>
            {cueOf(track) !== null && <p className='note'>{cueOf(track)}</p>}
          </div>
        </div>

        <Outcome players={players} round={round} />
      </section>
    )
  }

  // The question card turned over: the answer is printed on the same paper the
  // question was, so the room reads it as the back of the card it just played.
  if (question !== null) {
    return (
      <section className='reveal-panel' data-game='quiz'>
        <div className='head'>
          <div className='identity' style={answerFitting(question.answer)}>
            <p className='title'>
              <VisuallyHidden elementType='span'>
                {`${translate('quiz.reveal.title')} `}
              </VisuallyHidden>
              {question.answer}
            </p>
            {question.note !== null && <p className='note'>{question.note}</p>}
          </div>
        </div>

        <Outcome players={players} round={round} />
      </section>
    )
  }

  // The times *are* the reveal here — this is the one game where nothing was
  // ever withheld — so the board replaces the scoreline rather than sitting
  // under it, and it already names who took the round by putting them first.
  if (reflexContent(round) !== null) {
    return (
      <section className='reveal-panel bare'>
        <ReactionBoard players={players} round={round} />
      </section>
    )
  }

  return (
    <section className='reveal-panel bare'>
      <Outcome players={players} round={round} />
    </section>
  )
}

const Outcome: React.FC<RevealPanelProps> = ({ players, round }) => {
  const translate = useTranslate()
  const scorers = round.awards.filter((award) => award.points > 0)

  const nameOf = (playerId: string): string =>
    players.find((player) => player.id === playerId)?.nickname ?? '—'

  const seatOf = (playerId: string): number =>
    players.findIndex((player) => player.id === playerId)

  if (round.revealedAnswers.length > 0) {
    return (
      <ul className='said' style={dealtRows(round.revealedAnswers.length)}>
        {round.revealedAnswers.map((answer) => {
          const paid = scorers.find(
            (award) => award.playerId === answer.playerId
          )

          return (
            <li
              className={answer.isCorrect ? 'right' : 'wrong'}
              key={answer.playerId}
            >
              <Pawn seat={seatOf(answer.playerId)} />
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
    <ul className='scorers' style={dealtRows(scorers.length)}>
      {scorers.map((award) => (
        <li key={award.playerId}>
          <Pawn seat={seatOf(award.playerId)} />
          <span className='nickname'>{nameOf(award.playerId)}</span>
          <span className='points'>
            {translate('round.scored', { points: award.points })}
          </span>
        </li>
      ))}
    </ul>
  )
}
