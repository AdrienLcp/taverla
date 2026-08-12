import type { Locale } from '@taverla/protocol/locale'
import type { QuestionLanguage } from '@taverla/protocol/question'

/**
 * A language is named in its own language and never translated — someone who
 * landed on a UI they cannot read has only the word itself to navigate by.
 *
 * One map for two settings, because they are the same words: which language the
 * interface is in, and which one a quiz is drawn in. The union of both keys is
 * what makes it a guard rather than a convenience — a locale or a question
 * language added on either side stops compiling here until it has a name.
 */
export const LANGUAGE_NAMES: Record<Locale | QuestionLanguage, string> = {
  en: 'English',
  fr: 'Français'
}
