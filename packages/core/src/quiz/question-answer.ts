import type { Question } from '@taverla/protocol/question'
import type { SingleVerdict } from '@taverla/protocol/scoring'

import { matchesAnswer } from '../round/answer-matching'

/** Everything grading a question needs, and nothing a player may hold. */
type QuestionAnswer = Pick<Question, 'accepted' | 'answer'>

/**
 * One claim, measured against the whole of what was typed rather than looked
 * for inside it — the one place this game deliberately parts company with the
 * blind test's matcher.
 *
 * Searching within a line is what makes the blind test's single field honest,
 * because that field holds two claims and a room types them together. A
 * question holds one, and searching within it would pay a player who hedged:
 * "trois ou quatre" contains the answer to how many languages Switzerland has.
 *
 * `accepted` is where a bank names the spellings it thought worth naming. Case,
 * accents and punctuation are folded away before anything is compared, and a
 * slipped finger is forgiven in proportion to the length of the answer.
 */
export const gradeQuizGuess = ({
  guess,
  question
}: {
  guess: string
  question: QuestionAnswer
}): SingleVerdict => ({
  isCorrect: [question.answer, ...question.accepted].some((expected) =>
    matchesAnswer({ expected, given: guess })
  ),
  kind: 'single'
})
