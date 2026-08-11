import { z } from 'zod'

import { questionCategorySchema, questionLanguageSchema } from './question'
import { trackDifficultySchema, trackSourceSchema } from './track'

export const gameKinds = ['blindtest', 'quiz'] as const

export const gameKindSchema = z.enum(gameKinds)

/**
 * What a room is playing, and the settings only that game has. The room keeps
 * what every game needs — how a round is answered, how many rounds, the
 * countdown — and hands the rest here.
 *
 * This union exists because a second game exists. It is deliberately not a
 * registry, an engine interface or a payload of unknowns: two implementations
 * are enough to see the shape and not enough to abstract it, and
 * `docs/game-catalogue.md` holds the argument in full.
 */
export const gameSettingsSchema = z.discriminatedUnion('kind', [
  z.object({
    /** A Deezer preview is 30 seconds, so this ceiling is a hard limit, not a taste call. */
    clipDurationMs: z.number().int().min(5_000).max(30_000),
    difficulty: trackDifficultySchema,
    kind: z.literal('blindtest'),
    source: trackSourceSchema
  }),
  z.object({
    /** How long a question stays open before the round times out. */
    answerDurationMs: z.number().int().min(5_000).max(120_000),
    /** Empty means every category, the same way an empty genre list means every genre. */
    categories: z.array(questionCategorySchema),
    kind: z.literal('quiz'),
    language: questionLanguageSchema
  })
])

export type GameKind = z.infer<typeof gameKindSchema>
export type GameSettings = z.infer<typeof gameSettingsSchema>

export const DEFAULT_BLINDTEST_SETTINGS: GameSettings = {
  clipDurationMs: 30_000,
  difficulty: 'wellKnown',
  kind: 'blindtest',
  source: { genreIds: [], kind: 'chart' }
}

export const DEFAULT_QUIZ_SETTINGS: GameSettings = {
  answerDurationMs: 30_000,
  categories: [],
  kind: 'quiz',
  language: 'fr'
}
