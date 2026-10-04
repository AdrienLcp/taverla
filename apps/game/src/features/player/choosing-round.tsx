import type React from 'react'

import type { PlayerId } from '@taverla/protocol/identifiers'
import type { RoundView } from '@taverla/protocol/room'

import {
  ChoiceAnswer,
  longestChoiceLength,
  type PlayerAnswer
} from '@/features/player/answer-forms'
import { quizContent } from '@/helpers/round-content'
import { AskedQuestion } from '@/presentation/components/asked-question'

import './choosing-round.sass'

/**
 * Past this a candidate is a sentence rather than a name, and four of them
 * read better as four full-width rows than as a grid of narrow columns, at any
 * ratio: the words per tile stay the same, the lines per tile halve.
 */
const LONG_CHOICE_LENGTH = 60

type ChoosingRoundProps = {
  /** Sends the pick, and says whether the socket took it. */
  onAnswer: (answer: PlayerAnswer) => boolean
  round: RoundView
  /** The seat answering: a player's, or the console's once its host sat down. */
  youId: PlayerId | null
}

/**
 * A question card and four tiles, held to the box a framed page gives them —
 * on a player's screen and on a seated host's console alike, because the rule
 * that none of it scrolls is the same on both.
 */
export const ChoosingRound: React.FC<ChoosingRoundProps> = ({
  onAnswer,
  round,
  youId
}) => {
  const choiceLength = longestChoiceLength(round)

  return (
    <section
      className='choosing-round'
      data-long-choices={choiceLength > LONG_CHOICE_LENGTH || undefined}
      style={{ '--choice-length': choiceLength }}
    >
      <AskedQuestion prompt={quizContent(round)?.prompt ?? null} />
      <ChoiceAnswer
        key={round.id}
        onAnswer={onAnswer}
        round={round}
        youId={youId}
      />
    </section>
  )
}
