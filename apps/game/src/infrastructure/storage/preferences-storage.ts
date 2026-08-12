import { type Nickname, nicknameSchema } from '@taverla/protocol/identifiers'
import type { Locale } from '@taverla/protocol/locale'

import { isLocale } from '@taverla/core/i18n/locale'

import { isThemePreference, type ThemePreference } from '@/helpers/theme'

const LOCALE_KEY = 'taverla:locale'
const NICKNAME_KEY = 'taverla:nickname'
const THEME_KEY = 'taverla:theme'
const VOLUME_KEY = 'taverla:volume'

export const DEFAULT_VOLUME = 0.8

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

/**
 * Not the seat — that is `session-storage.ts`, keyed per room, and it is what
 * brings a reloaded phone back to its score. This is only what the player likes
 * being called, so the join form on the *next* room arrives filled in.
 */
export const readStoredNickname = (): Nickname | null => {
  const parsed = nicknameSchema.safeParse(read(NICKNAME_KEY))

  return parsed.success ? parsed.data : null
}

export const writeStoredNickname = (nickname: Nickname): void => {
  write(NICKNAME_KEY, nickname)
}

/**
 * The host machine's own loudness, not the room's — it belongs to whichever
 * laptop is plugged into the speakers, so it never travels over the socket.
 */
export const readStoredVolume = (): number => {
  const stored = Number.parseFloat(read(VOLUME_KEY) ?? '')

  return Number.isFinite(stored) && stored >= 0 && stored <= 1
    ? stored
    : DEFAULT_VOLUME
}

export const writeStoredVolume = (volume: number): void => {
  write(VOLUME_KEY, String(volume))
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
