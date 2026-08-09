export const LOCALES = ['en', 'fr'] as const

export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'en'

export const isLocale = (value: string): value is Locale =>
  LOCALES.some((locale) => locale === value)

/**
 * Browsers hand out BCP-47 tags carrying a region the dictionaries do not
 * have — `fr-CA`, `fr-BE` and `fr` all read the same French. Order matters more
 * than presence: a phone listing `de-DE, fr-FR, en` wants French, not the first
 * dictionary that happens to exist.
 */
export const pickLocale = (preferred: readonly string[]): Locale => {
  for (const tag of preferred) {
    const language = tag.toLowerCase().split('-')[0] ?? ''

    if (isLocale(language)) {
      return language
    }
  }

  return DEFAULT_LOCALE
}
