import type React from 'react'

import type { QuestionPrompt } from '@taverla/protocol/question'

import { useTranslate } from '@/presentation/i18n/i18n-provider'
import { questionCategoryKey } from '@/presentation/i18n/translation'

import './asked-question.sass'

type AskedQuestionProps = {
  /** `null` on any screen this round is not being served to. */
  prompt: QuestionPrompt | null
}

/**
 * What the room is trying to answer, on the screen everyone is looking at and
 * on every player's screen at once — the quiz's stimulus the way the clip is
 * the blind test's. It sizes off the viewport rather than off which surface
 * renders it, so the same component reads at four metres and in a hand.
 *
 * And off **how long the question is**, which no viewport can answer: the bank
 * runs from nine characters to a hundred and ninety-two, so a size picked by
 * the screen alone draws the long ones as eleven lines of a phone. The count
 * is the whole of what the stylesheet needs — a paragraph settles on the face's
 * mean, where `answerFitting` has to measure a single word's width because one
 * word is a coin flip, and a question's longest is fourteen characters.
 */
export const AskedQuestion: React.FC<AskedQuestionProps> = ({ prompt }) => {
  const translate = useTranslate()

  if (prompt === null) {
    return null
  }

  return (
    <div
      className='asked-question'
      style={{ '--prompt-length': prompt.prompt.length }}
    >
      <p className='prompt'>{prompt.prompt}</p>
      {/* After the prompt so it is read second; the card prints it above. */}
      <p className='category'>
        {translate(questionCategoryKey(prompt.category))}
      </p>
    </div>
  )
}
