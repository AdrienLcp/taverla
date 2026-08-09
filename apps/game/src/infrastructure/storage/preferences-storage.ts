import { isLocale, type Locale } from '@blindtest/core/i18n/locale'

import { isThemePreference, type ThemePreference } from '@/helpers/theme'

const LOCALE_KEY = 'blindtest:locale'
const THEME_KEY = 'blindtest:theme'

/**
 * `null` means "never chosen", which is not the same as choosing the default:
 * the caller falls back to what the browser and the operating system are
 * already saying rather than overriding them.
 *
 * Every access is guarded because `localStorage` throws outright in a Safari
 * private window. The degradation is a preference that does not survive a
 * reload, which beats a blank page.
 */
export const readStoredLocale = (): Locale | null => {
  const stored = read(LOCALE_KEY)

  return stored !== null && isLocale(stored) ? stored : null
}

export const writeStoredLocale = (locale: Locale): void => {
  write(LOCALE_KEY, locale)
}

export const readStoredThemePreference = (): ThemePreference | null => {
  const stored = read(THEME_KEY)

  return stored !== null && isThemePreference(stored) ? stored : null
}

export const writeStoredThemePreference = (
  preference: ThemePreference
): void => {
  write(THEME_KEY, preference)
}

const read = (key: string): string | null => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

const write = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value)
  } catch {
    return
  }
}
