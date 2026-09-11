import { z } from 'zod'

/**
 * The subjects a host ticks. The fold from a source's own rubrics onto these is
 * coarse on purpose: a handful of chips fit a phone, and a room choosing between
 * twenty-eight is a room reading a menu instead of playing.
 *
 * The list is also the draw's odds dial, because a category is drawn before a
 * question is — so splitting one in two doubles what it is drawn for. `cinema`
 * left `arts` for exactly that reason: it was the only chip whose name did not
 * say what ticking it would give, holding films, television, animation and
 * video games beside music, books and painting, and half the bank with them.
 * `videogames` left on the same argument and took the single biggest block in
 * the bank with it.
 */
export const questionCategories = [
  'history',
  'geography',
  'science',
  'arts',
  'cinema',
  'videogames',
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

/**
 * What any game drawing from the bank has to choose. It is shared because two
 * games draw from it and ask it the same three things — not because a game's
 * settings are expected to have a common shape. The quiz and Le Fake each keep
 * their own durations beside these, and a third game that wants the bank on
 * different terms takes what it needs rather than widening this.
 */
export const questionDrawSettingsSchema = z.object({
  /**
   * Whether the bank's adult themes are drawn from. Its own field rather than a
   * ninth category, because the eight are *subjects* and this is a rating: a
   * question about a porn actress's first album is a celebrities question that
   * happens to be adult, and putting the two axes in one row is what makes such
   * a control read as a mistake.
   *
   * Off by default, and the host's alone to turn on — the room code is read
   * aloud and anyone present can scan the QR, so they are the only one who knows
   * who is in the room.
   */
  allowsAdultContent: z.boolean(),
  /** Empty means every category, the same way an empty genre list means every genre. */
  categories: z.array(questionCategorySchema),
  language: questionLanguageSchema,
  /**
   * Whether the bank is held to the questions a room can be expected to have
   * heard of. Off by default, so a room that says nothing plays the whole bank.
   *
   * A switch rather than a level picker because `drawQuestion` takes a category
   * *before* it takes a question, so a level is only as good as the category it
   * thins most — and thirds of the French bank leave geography ten questions.
   * One threshold behaves where three bands do not; the measurements are in
   * `docs/plans/21-well-known-questions.md`.
   *
   * It reads the same in both halves of the bank even though the two sources
   * decide `isWellKnown` their own way, which is the point of the row carrying
   * a verdict rather than a score.
   */
  wellKnownOnly: z.boolean()
})

export type QuestionDrawSettings = z.infer<typeof questionDrawSettingsSchema>

export type QuestionCategory = z.infer<typeof questionCategorySchema>
export type Question = z.infer<typeof questionSchema>
export type QuestionPrompt = z.infer<typeof questionPromptSchema>
export type RevealedQuestion = z.infer<typeof revealedQuestionSchema>
export type HostQuestion = z.infer<typeof hostQuestionSchema>
export type QuestionLanguage = z.infer<typeof questionLanguageSchema>
