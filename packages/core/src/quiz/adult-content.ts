import type { QuestionLanguage } from '@taverla/protocol/question'

/**
 * Which banks carry questions the rating applies to. OpenQuizzDB files its own
 * under a rubric; Open Trivia DB has no such axis at all, so every English row
 * is unrated and the host's switch would filter nothing.
 *
 * Held here rather than read off the bank because the bank is the server's and
 * this is what the *console* needs in order to render honestly — see
 * `.claude/rules/abstraction-boundaries.md`. It is kept true by
 * `question-bank.test.ts`, which compares it against what is actually banked and
 * goes red the day a rated source lands in a language that had none.
 */
const LANGUAGES_WITH_ADULT_CONTENT: readonly QuestionLanguage[] = ['fr']

export const hasAdultContent = (language: QuestionLanguage): boolean =>
  LANGUAGES_WITH_ADULT_CONTENT.includes(language)
