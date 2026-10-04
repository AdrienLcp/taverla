import type React from 'react'

import { roundDurationMsOf } from '@taverla/protocol/game'
import type { HostRoomView, RoundView } from '@taverla/protocol/room'

import {
  longestChoiceLength,
  type PlayerAnswer,
  TypedAnswer
} from '@/features/player/answer-forms'
import { quizContent } from '@/helpers/round-content'
import { AskedQuestion } from '@/presentation/components/asked-question'
import { RoundProgress } from '@/presentation/components/round-progress'
import { useTranslate } from '@/presentation/i18n/i18n-provider'

import { AnsweredPawns } from './answered-pawns'
import { PrintedChoices } from './printed-choices'

import './playing-stage.sass'

/** Past this a candidate is a sentence, and four of them read as four rows. */
const LONG_CHOICE_LENGTH = 60

type PlayingStageProps = {
  /** The offer to unmute this screen, or nothing when it owes the room none. */
  clipOffer: React.ReactNode
  /** Sends the seat's answer, and says whether the socket took it; `null` with no seat. */
  onAnswer: ((answer: PlayerAnswer) => boolean) | null
  round: RoundView
  view: HostRoomView
}

/**
 * A round in play on the screen the room shares: the question card with the
 * round's sand draining along its top, the four tiles when there are four, and
 * the pawns still owing an answer. The standings are not here — the score
 * track around the screen already carries them.
 */
export const PlayingStage: React.FC<PlayingStageProps> = ({
  clipOffer,
  onAnswer,
  round,
  view
}) => {
  const translate = useTranslate()
  const roundDurationMs = roundDurationMsOf(view.settings.game)
  const mode = view.settings.mode.kind
  const choiceLength = longestChoiceLength(round)
  const isTyping = mode === 'typed' && onAnswer !== null

  return (
    <div
      className='stage playing'
      data-answering={isTyping || undefined}
      data-choices={mode === 'choice' || undefined}
      data-long-choices={choiceLength > LONG_CHOICE_LENGTH || undefined}
      style={{ '--choice-length': choiceLength }}
    >
      {clipOffer}
      <section className='round-card'>
        {roundDurationMs !== null && (
          <RoundProgress
            durationMs={roundDurationMs}
            elapsedMs={view.roundElapsedMs}
          />
        )}
        {round.content.kind === 'quiz' ? (
          <AskedQuestion prompt={quizContent(round)?.prompt ?? null} />
        ) : (
          <p className='now'>
            {translate(
              round.content.kind === 'buzzer'
                ? 'buzzer.running'
                : 'blindtest.listening'
            )}
          </p>
        )}
      </section>
      {mode === 'choice' && <PrintedChoices round={round} />}
      {isTyping && (
        <TypedAnswer
          // A seated console is withheld the answer the same way a player
          // is, so it reads what the round asks for off the settings too.
          asksForAFilm={
            view.settings.game?.kind === 'blindtest' &&
            view.settings.game.source.kind === 'film'
          }
          key={round.id}
          onAnswer={onAnswer}
          round={round}
          verdict={view.yourVerdict}
        />
      )}
      {mode !== 'buzzer' && view.players.length > 0 && (
        <AnsweredPawns players={view.players} round={round} />
      )}
    </div>
  )
}
