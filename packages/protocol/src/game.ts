import { z } from 'zod'

import { questionDrawSettingsSchema } from './question'
import { slateItemCountSchema } from './slate'
import { trackDifficultySchema, trackSourceSchema } from './track'

export const gameKinds = [
  'blindtest',
  'buzzer',
  'lefake',
  'quiz',
  'reflex',
  'slate'
] as const

export const gameKindSchema = z.enum(gameKinds)

/**
 * The games a room may actually be opened for. It is not `gameKinds` and must
 * not collapse into it: a game is served in full before it has screens, and a
 * room opened on one of those would render another game's round. Refusing it at
 * the door beats opening a room whose first "start" cannot be looked at.
 *
 * `slate` is the game waiting here now: served in full, with no screens yet.
 * `reflex` spent a stage in exactly that window, and every game before it did
 * too.
 *
 * **The order is the shelf's**, not the alphabet's: it is the order the front
 * door draws its cards in and the order the lobby's picker offers, so the two
 * games a table reaches for first come first. Sorting it is a product change.
 */
export const shelvedGames = [
  'blindtest',
  'quiz',
  'reflex',
  'lefake',
  'buzzer'
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
  questionDrawSettingsSchema.extend({
    kind: z.literal('lefake'),
    /**
     * How long the room has to write a lie, which is what `playing` means in
     * this game — the one phase every other game spends answering. It is longer
     * than a question stays open because inventing something believable is a
     * slower act than recognising the truth.
     *
     * `null` is the host's own word, the same as `roundCount` and the buzzer's
     * `answerWindowMs`: both of this game's phases close the moment everybody
     * has acted, so the clock is what covers the table that is one player short
     * of finishing — not what ends the phase in the ordinary case.
     */
    roundDurationMs: z.number().int().min(15_000).max(180_000).nullable(),
    /** How long the board stays open once everyone has written; `null` for the host's word. */
    voteDurationMs: z.number().int().min(10_000).max(120_000).nullable()
  }),
  questionDrawSettingsSchema.extend({
    kind: z.literal('quiz'),
    /** How long a question stays open before the round times out. */
    roundDurationMs: z.number().int().min(5_000).max(120_000)
  }),
  /**
   * Nothing of its own, and the first arm that is empty rather than minimal.
   * The wait before the screen flips is drawn per round rather than set — a
   * fixed one is a wait a room learns to count — and the floor that keeps the
   * race honest is not a taste call either.
   */
  z.object({ kind: z.literal('reflex') }),
  z.object({
    /**
     * How many numbered lines a sheet opens with. The round's own count starts
     * here and grows with `host.addItem`, so a host who goes one cup at a time
     * opens on one — this setting is where the next sheet starts, not a cap.
     */
    itemCount: slateItemCountSchema,
    kind: z.literal('slate')
  })
])

export type GameKind = z.infer<typeof gameKindSchema>
export type ShelvedGame = z.infer<typeof shelvedGameSchema>
export type GameSettings = z.infer<typeof gameSettingsSchema>
export type BlindtestSettings = Extract<GameSettings, { kind: 'blindtest' }>
export type BuzzerSettings = Extract<GameSettings, { kind: 'buzzer' }>
export type LefakeSettings = Extract<GameSettings, { kind: 'lefake' }>
export type QuizSettings = Extract<GameSettings, { kind: 'quiz' }>
export type ReflexSettings = Extract<GameSettings, { kind: 'reflex' }>
export type SlateSettings = Extract<GameSettings, { kind: 'slate' }>

/**
 * How long a round stays open unanswered, or `null` for a game whose *settings*
 * have no such clock. The bare buzzer is the first `null`: nothing is being
 * played or displayed, so there is nothing for the room to run out of — the
 * round ends when someone is right or when the host says so. A room with no
 * game yet is the same answer for a different reason: there is no round to run
 * out.
 *
 * The reflex race is the third, and the only one that answers `null` while
 * still having a clock: its wait is drawn per round, so the round knows how
 * long it runs and the settings never could. `openPhaseDurationMs` is where the
 * two are reconciled, and it is why this reads *the settings'* clock rather
 * than *the round's*.
 */
export const roundDurationMsOf = (game: GameSettings | null): number | null =>
  game === null ||
  game.kind === 'buzzer' ||
  game.kind === 'reflex' ||
  game.kind === 'slate'
    ? null
    : game.roundDurationMs

/**
 * How long the board stays open, for the one game that has a second open phase.
 * `null` everywhere else, which is what lets the round clock be re-armed from a
 * single accessor rather than the voting phase growing a clock of its own.
 */
export const voteDurationMsOf = (game: GameSettings | null): number | null =>
  game?.kind === 'lefake' ? game.voteDurationMs : null

/**
 * Whether a wrong answer sits the player out for the rest of the round. Only the
 * bare buzzer gets a say: every other game's round is a clip or a question that
 * runs out on its own, so a table that could buzz forever would spend it in
 * seconds.
 */
export const locksOutOnMissIn = (game: GameSettings | null): boolean =>
  game?.kind === 'buzzer' ? game.locksOutOnMiss : true

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

export const DEFAULT_LEFAKE_SETTINGS: LefakeSettings = {
  allowsAdultContent: false,
  categories: [],
  kind: 'lefake',
  language: 'fr',
  roundDurationMs: 60_000,
  voteDurationMs: 30_000,
  wellKnownOnly: false
}

export const DEFAULT_QUIZ_SETTINGS: QuizSettings = {
  allowsAdultContent: false,
  categories: [],
  kind: 'quiz',
  language: 'fr',
  roundDurationMs: 30_000,
  wellKnownOnly: false
}

export const DEFAULT_REFLEX_SETTINGS: ReflexSettings = { kind: 'reflex' }

export const DEFAULT_SLATE_SETTINGS: SlateSettings = {
  itemCount: 10,
  kind: 'slate'
}

/** A record rather than a switch, so a new kind without a default cannot compile. */
export const DEFAULT_GAME_SETTINGS: Record<GameKind, GameSettings> = {
  blindtest: DEFAULT_BLINDTEST_SETTINGS,
  buzzer: DEFAULT_BUZZER_SETTINGS,
  lefake: DEFAULT_LEFAKE_SETTINGS,
  quiz: DEFAULT_QUIZ_SETTINGS,
  reflex: DEFAULT_REFLEX_SETTINGS,
  slate: DEFAULT_SLATE_SETTINGS
}
