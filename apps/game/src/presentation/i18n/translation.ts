import type { DotPath, PlainKey } from '@adrienlcp/i18n/dictionary'
import type { Translator } from '@adrienlcp/i18n/translator'

import type { ProtocolErrorCode } from '@taverla/protocol/error-code'
import type { GameKind, ShelvedGame } from '@taverla/protocol/game'
import type { QuestionCategory } from '@taverla/protocol/question'
import type { AnswerMode } from '@taverla/protocol/room'

import type { ClipRefusal } from '@taverla/core/blindtest/clip-audio'
import type { BuzzBlocker } from '@taverla/core/round/buzz-eligibility'

import type { ApiError } from '@/infrastructure/api/taverla-api'

import type { EN_DICTIONARY } from './dictionary-en'

export type TranslationKey = DotPath<typeof EN_DICTIONARY>

/**
 * A key whose message carries no placeholder, so it renders from nothing but
 * itself. It is what a lookup table or a piece of state may hold: a key needing
 * values cannot be translated by whoever ends up reading it back.
 */
export type PlainTranslationKey = PlainKey<typeof EN_DICTIONARY>

export type Translate = Translator<typeof EN_DICTIONARY>

/**
 * Narrows a builder to the handful of keys it can return while checking that
 * the dictionary has every one of them — widening the enum underneath fails to
 * compile here until both locales carry the new string.
 */
type BuiltKey<Key extends PlainTranslationKey> = Key

/**
 * The server writes `message` in English for a developer reading a log. What a
 * player sees comes from the code, which is a closed enum.
 */
export const protocolErrorKey = (
  code: ProtocolErrorCode
): BuiltKey<`error.${ProtocolErrorCode}`> => `error.${code}`

export const apiErrorKey = (
  error: ApiError
): BuiltKey<`error.api.${ApiError}`> => `error.api.${error}`

export const buzzBlockerKey = (
  blocker: BuzzBlocker
): BuiltKey<`buzz.blocked.${BuzzBlocker}`> => `buzz.blocked.${blocker}`

export const clipRefusalKey = (
  refusal: ClipRefusal
): BuiltKey<`blindtest.audio.refused.${ClipRefusal}`> =>
  `blindtest.audio.refused.${refusal}`

export const answerModeLabelKey = (
  mode: AnswerMode
): BuiltKey<`host.answerMode.${AnswerMode}`> => `host.answerMode.${mode}`

/**
 * How a game pays, in one sentence — its own, because the amounts differ and so
 * does what is being paid for: the blind test's buzzer sentence is about a title
 * and an artist judged separately, and neither other game has a half.
 *
 * A switch rather than a ternary, so a game added to the protocol stops
 * compiling here instead of quietly borrowing the blind test's prices.
 */
export const scoringKey = ({
  answerMode,
  asksForAFilm,
  game
}: {
  answerMode: AnswerMode
  /** The blind test's two halves are a film and its composer on one source out of five. */
  asksForAFilm: boolean
  game: GameKind
}): BuiltKey<
  | 'buzzer.scoring'
  | 'lefake.scoring'
  | 'reflex.scoring'
  | 'slate.scoring'
  | `blindtest.scoring.${AnswerMode}`
  | `blindtest.scoringFilm.${Exclude<AnswerMode, 'choice'>}`
  | `quiz.scoring.${AnswerMode}`
> => {
  switch (game) {
    case 'blindtest':
      // Choice mode names neither half — four candidates and one is right —
      // so it has one sentence whatever the round is asking for.
      return asksForAFilm && answerMode !== 'choice'
        ? `blindtest.scoringFilm.${answerMode}`
        : `blindtest.scoring.${answerMode}`
    case 'buzzer':
      return 'buzzer.scoring'
    case 'lefake':
      return 'lefake.scoring'
    case 'quiz':
      return `quiz.scoring.${answerMode}`
    case 'reflex':
      return 'reflex.scoring'
    case 'slate':
      return 'slate.scoring'
  }
}

export const questionCategoryKey = (
  category: QuestionCategory
): BuiltKey<`quiz.category.${QuestionCategory}`> => `quiz.category.${category}`

/**
 * What a game is called, owed by every game the *server* serves rather than
 * only the ones with a front door: a room's tab names the game it is playing,
 * and a game reachable by a settings frame alone is still a game a room can be
 * in. Adding one to `gameKinds` stops compiling until both locales name it.
 */
export const gameNameKey = (game: GameKind): BuiltKey<`${GameKind}.name`> =>
  `${game}.name`

/**
 * The two the shelf and a game's own front door read, and those only the
 * shelved games owe — nothing pitches a game a room cannot be opened for.
 */
export const gameTaglineKey = (
  game: ShelvedGame
): BuiltKey<`${ShelvedGame}.tagline`> => `${game}.tagline`

export const gameDescriptionKey = (
  game: ShelvedGame
): BuiltKey<`${ShelvedGame}.home.description`> => `${game}.home.description`
