import type { ProtocolErrorCode } from '@taverla/protocol/error-code'

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
  `blindtest.buzz.blocked.${blocker}`
