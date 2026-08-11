import type { ProtocolErrorCode } from '@taverla/protocol/error-code'
import {
  type GameKind,
  type ShelvedGame,
  shelvedGames
} from '@taverla/protocol/game'
import type { AnswerMode } from '@taverla/protocol/room'

import type { BuzzBlocker } from '@taverla/core/round/buzz-eligibility'

import type { ApiError } from '@/infrastructure/api/taverla-api'

import type { EN_DICTIONARY } from './dictionary-en'

export type TranslationKey = keyof typeof EN_DICTIONARY

export type Dictionary = Record<TranslationKey, string>

export type TranslationValues = Record<string, string | number>

export type Translate = (
  key: TranslationKey,
  values?: TranslationValues
) => string

export const createTranslate =
  (dictionary: Dictionary): Translate =>
  (key, values) =>
    values === undefined
      ? dictionary[key]
      : dictionary[key].replace(
          /\{(\w+)\}/g,
          (placeholder, name: string) => `${values[name] ?? placeholder}`
        )

/**
 * The server writes `message` in English for a developer reading a log. What a
 * player sees comes from the code, which is a closed enum — so widening it in
 * `error-code.ts` fails to compile here until the string exists in every locale.
 */
export const protocolErrorKey = (code: ProtocolErrorCode): TranslationKey =>
  `error.${code}`

export const apiErrorKey = (error: ApiError): TranslationKey =>
  `error.api.${error}`

export const buzzBlockerKey = (blocker: BuzzBlocker): TranslationKey =>
  `buzz.blocked.${blocker}`

export const answerModeLabelKey = (mode: AnswerMode): TranslationKey =>
  `host.answerMode.${mode}`

/**
 * How a game pays, in one sentence. The bare buzzer's is its own: the blind
 * test's buzzer sentence is about a title and an artist judged separately, and
 * this game has neither half.
 */
export const scoringKey = ({
  answerMode,
  game
}: {
  answerMode: AnswerMode
  game: GameKind
}): TranslationKey =>
  game === 'buzzer' ? 'buzzer.scoring' : `blindtest.scoring.${answerMode}`

/**
 * The three strings the shelf and a game's own front door read. Typed over the
 * games a room can actually be opened for, so adding one to `shelvedGames`
 * stops compiling until both locales can name it, pitch it and describe it.
 */
export const gameNameKey = (game: ShelvedGame): TranslationKey => `${game}.name`

export const gameTaglineKey = (game: ShelvedGame): TranslationKey =>
  `${game}.tagline`

export const gameDescriptionKey = (game: ShelvedGame): TranslationKey =>
  `${game}.home.description`

export const isShelvedGame = (value: string): value is ShelvedGame =>
  shelvedGames.some((game) => game === value)
