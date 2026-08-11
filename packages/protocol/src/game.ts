import { z } from 'zod'

import { questionCategorySchema, questionLanguageSchema } from './question'
import { trackDifficultySchema, trackSourceSchema } from './track'

export const gameKinds = ['blindtest', 'buzzer', 'quiz'] as const

export const gameKindSchema = z.enum(gameKinds)

/**
 * The games a room may actually be opened for. It is not `gameKinds` and must
 * not collapse into it: a game is served in full before it has screens, and a
 * room opened on one of those would render another game's round. Refusing it at
 * the door beats opening a room whose first "start" cannot be looked at.
 *
 * The two sets coincide today, which is what shipping every game looks like —
 * not a sign the distinction was unnecessary.
 */
export const shelvedGames = [
  'blindtest',
  'buzzer',
  'quiz'
] as const satisfies readonly GameKind[]

export const shelvedGameSchema = z.enum(shelvedGames)

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
    difficulty: trackDifficultySchema,
    kind: z.literal('blindtest'),
    /** A Deezer preview is 30 seconds, so this ceiling is a hard limit, not a taste call. */
    roundDurationMs: z.number().int().min(5_000).max(30_000),
    source: trackSourceSchema
  }),
  z.object({
    kind: z.literal('buzzer'),
    /**
     * Whether a wrong answer sits the player out for the rest of the round. The
     * blind test has no say in this — its round is a finite clip, and a table
     * that could buzz forever would burn it in seconds — but a host running a
     * charade does: one go each keeps a loud room honest, where an open field is
     * what a "name five" wants. `host.clearLockouts` reopens it either way.
     */
    locksOutOnMiss: z.boolean()
  }),
  z.object({
    /**
     * Whether the bank's adult themes are drawn from. Its own field rather than
     * a seventh category, because the six are *subjects* and this is a rating:
     * a question about a porn actress's first album is a celebrities question
     * that happens to be adult, and putting the two axes in one row is what
     * makes such a control read as a mistake.
     *
     * Off by default, and the host's alone to turn on — the room code is read
     * aloud and anyone present can scan the QR, so they are the only one who
     * knows who is in the room.
     */
    allowsAdultContent: z.boolean(),
    /** Empty means every category, the same way an empty genre list means every genre. */
    categories: z.array(questionCategorySchema),
    kind: z.literal('quiz'),
    language: questionLanguageSchema,
    /** How long a question stays open before the round times out. */
    roundDurationMs: z.number().int().min(5_000).max(120_000)
  })
])

export type GameKind = z.infer<typeof gameKindSchema>
export type ShelvedGame = z.infer<typeof shelvedGameSchema>
export type GameSettings = z.infer<typeof gameSettingsSchema>
export type BlindtestSettings = Extract<GameSettings, { kind: 'blindtest' }>
export type BuzzerSettings = Extract<GameSettings, { kind: 'buzzer' }>
export type QuizSettings = Extract<GameSettings, { kind: 'quiz' }>

/**
 * How long a round stays open unanswered, or `null` for a game that has no such
 * clock. The bare buzzer is the `null`: nothing is being played or displayed, so
 * there is nothing for the room to run out of — the round ends when someone is
 * right or when the host says so.
 */
export const roundDurationMsOf = (game: GameSettings): number | null =>
  game.kind === 'buzzer' ? null : game.roundDurationMs

/**
 * Whether a wrong answer sits the player out for the rest of the round. Only the
 * bare buzzer gets a say: every other game's round is a clip or a question that
 * runs out on its own, so a table that could buzz forever would spend it in
 * seconds.
 */
export const locksOutOnMissIn = (game: GameSettings): boolean =>
  game.kind === 'buzzer' ? game.locksOutOnMiss : true

export const DEFAULT_BLINDTEST_SETTINGS: BlindtestSettings = {
  difficulty: 'wellKnown',
  kind: 'blindtest',
  roundDurationMs: 30_000,
  source: { genreIds: [], kind: 'chart' }
}

export const DEFAULT_BUZZER_SETTINGS: BuzzerSettings = {
  kind: 'buzzer',
  locksOutOnMiss: true
}

export const DEFAULT_QUIZ_SETTINGS: QuizSettings = {
  allowsAdultContent: false,
  categories: [],
  kind: 'quiz',
  language: 'fr',
  roundDurationMs: 30_000
}

/** A record rather than a switch, so a new kind without a default cannot compile. */
export const DEFAULT_GAME_SETTINGS: Record<GameKind, GameSettings> = {
  blindtest: DEFAULT_BLINDTEST_SETTINGS,
  buzzer: DEFAULT_BUZZER_SETTINGS,
  quiz: DEFAULT_QUIZ_SETTINGS
}
