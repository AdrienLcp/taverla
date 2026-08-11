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
 * on every phone at once — the quiz's stimulus the way the clip is the blind
 * test's. It sizes off the viewport rather than off which surface renders it,
 * so the same component reads at four metres and in a hand.
 */
export const AskedQuestion: React.FC<AskedQuestionProps> = ({ prompt }) => {
  const translate = useTranslate()

  if (prompt === null) {
    return null
  }

  return (
    <div className='asked-question'>
      <p className='prompt'>{prompt.prompt}</p>
      {/* Below what it frames: it names the question rather than opening it. */}
      <p className='category'>
        {translate(questionCategoryKey(prompt.category))}
      </p>
    </div>
  )
}
