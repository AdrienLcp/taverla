import type { Locale } from '@taverla/protocol/locale'
import {
  type QuestionLanguage,
  questionLanguages
} from '@taverla/protocol/question'

/**
 * What a room draws questions in before anybody has said. The bank is written
 * in French and in English rather than translated from one into the other, so
 * this is a real choice and not a rendering of one — and the host's own
 * interface is the only evidence available at the moment a room opens. It is
 * good evidence: they chose it, and they are the one who will read the
 * questions out.
 *
 * A map rather than an identity. The two unions are independent and only happen
 * to hold the same two members: a locale is a dictionary this app ships, a
 * question language is a bank somebody wrote. The day a third dictionary lands
 * with no bank behind it, a room opened by a host reading that locale must fall
 * back to a language the bank has — the alternative is an empty draw and the
 * "nothing left to play" error on the first round.
 *
 * English is the fallback for the same reason it is `DEFAULT_LOCALE`.
 */
export const questionLanguageFor = (locale: Locale): QuestionLanguage =>
  questionLanguages.find((language) => language === locale) ?? 'en'
