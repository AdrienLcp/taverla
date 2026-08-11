import { z } from 'zod'

export const questionCategories = [
  'history',
  'geography',
  'science',
  'arts',
  'sport',
  'everyday'
] as const

export const questionCategorySchema = z.enum(questionCategories)

/**
 * What the room is trying to answer. Only ever on the wire inside a host-only
 * message, or inside the round's reveal — the same rule the track identity
 * lives under, and enforced the same way.
 *
 * The decoys are authored per question rather than drawn from the pool. A blind
 * test can borrow three other tracks and they are all plausible; "1789" is not
 * a plausible wrong answer to which river runs through Paris, and a quiz whose
 * odd one out gives the answer away is not a quiz.
 */
export const questionSchema = z.object({
  /** Other spellings a typed answer may take. The matcher folds case and accents already. */
  accepted: z.array(z.string()),
  answer: z.string().min(1),
  category: questionCategorySchema,
  decoys: z.tuple([z.string(), z.string(), z.string()]),
  id: z.string().min(1),
  /**
   * What the room is told once the answer is public — where the beach in the
   * film actually is, why the record stood for forty years. It travels with the
   * answer and never before it, which is why it lives here rather than on the
   * prompt.
   */
  note: z.string().nullable()
})

/** The half a player may see: the question without any of its answers. */
export const questionPromptSchema = z.object({
  category: questionCategorySchema,
  id: z.string().min(1),
  prompt: z.string().min(1)
})

/**
 * What becomes public at the reveal, and not a moment before — the mirror of
 * the blind test's `revealedTrack`. The note travels with the answer rather
 * than beside it, because it gives the answer away.
 */
export const revealedQuestionSchema = z.object({
  answer: z.string().min(1),
  note: z.string().nullable()
})

export const hostQuestionSchema = questionPromptSchema.extend(
  questionSchema.shape
)

/**
 * The language the questions are drawn in — a property of the room, never of
 * the reader. The interface locale is stored per device, so two players in one
 * room can hold different ones, and dealing each of them a question from their
 * own would not be one game.
 */
export const questionLanguages = ['en', 'fr'] as const

export const questionLanguageSchema = z.enum(questionLanguages)

export type QuestionCategory = z.infer<typeof questionCategorySchema>
export type Question = z.infer<typeof questionSchema>
export type QuestionPrompt = z.infer<typeof questionPromptSchema>
export type RevealedQuestion = z.infer<typeof revealedQuestionSchema>
export type HostQuestion = z.infer<typeof hostQuestionSchema>
export type QuestionLanguage = z.infer<typeof questionLanguageSchema>
