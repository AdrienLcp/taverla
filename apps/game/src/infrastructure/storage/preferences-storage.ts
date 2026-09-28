import { z } from 'zod'

import { gameKindSchema, gameSettingsSchema } from '@taverla/protocol/game'
import { type Nickname, nicknameSchema } from '@taverla/protocol/identifiers'
import { isLocale, type Locale } from '@taverla/protocol/locale'
import { modeSettingsSchema, roomSettingsSchema } from '@taverla/protocol/room'

import type { HostPreferences } from '@taverla/core/room/host-preferences'

import { isThemePreference, type ThemePreference } from '@/helpers/theme'

const HOST_SETUP_KEY = 'taverla:host-setup'
const LOCALE_KEY = 'taverla:locale'
const NICKNAME_KEY = 'taverla:nickname'
const THEME_KEY = 'taverla:theme'
const VOLUME_KEY = 'taverla:volume'

/**
 * Composed out of the protocol's own schemas rather than restated, so a setting
 * that changes shape on the wire stops parsing here instead of being restored
 * into a room that no longer accepts it. `omit` is what keeps the two halves
 * from drifting: whatever the room grows that no game answers is remembered
 * without an edit.
 */
const gameSetupSchema = z.object({
  autoAdvanceMs: roomSettingsSchema.shape.autoAdvanceMs,
  game: gameSettingsSchema,
  mode: modeSettingsSchema,
  roundCount: roomSettingsSchema.shape.roundCount
})

/**
 * Entry by entry, so one game this build no longer serves — or one whose
 * settings changed shape — costs that game's memory and not the host's whole
 * setup.
 */
const usableGameSetups = (
  stored: Record<string, unknown>
): HostPreferences['games'] =>
  Object.fromEntries(
    Object.entries(stored).flatMap(([key, value]) => {
      const game = gameKindSchema.safeParse(key)
      const setup = gameSetupSchema.safeParse(value)

      return game.success && setup.success ? [[game.data, setup.data]] : []
    })
  )

const hostPreferencesSchema = z.object({
  games: z.record(z.string(), z.unknown()).transform(usableGameSetups),
  room: roomSettingsSchema.omit({
    autoAdvanceMs: true,
    game: true,
    mode: true,
    roundCount: true
  })
})

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
 * brings a player who reloaded back to their score. This is only what the
 * player likes being called, so the join form on the *next* room arrives
 * filled in.
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

/**
 * How this host left the last room they ran, so the next one opens on it rather
 * than on the shell's defaults.
 *
 * `null` is a host who has never changed a setting, and it is deliberately not
 * "the defaults": the caller skips the restore entirely instead of opening every
 * room ever with a frame that says nothing. A blob that no longer parses is the
 * same answer — a shape this build cannot read is worth less than the defaults
 * it would replace.
 */
export const readStoredHostPreferences = (): HostPreferences | null => {
  const stored = read(HOST_SETUP_KEY)

  if (stored === null) {
    return null
  }

  const parsed = hostPreferencesSchema.safeParse(parseJson(stored))

  if (!parsed.success) {
    return null
  }

  dropUnknownFields({ parsed: parsed.data, stored })

  return parsed.data
}

/**
 * The schema strips a field it no longer knows, and the blob is written back
 * without it so the field does not sit on the machine until the next setting
 * changes. The slate's answer key once lived here, and answers are not
 * something this store may keep past the tab.
 */
const dropUnknownFields = ({
  parsed,
  stored
}: {
  parsed: HostPreferences
  stored: string
}): void => {
  const cleaned = JSON.stringify(parsed)

  if (cleaned !== stored) {
    write(HOST_SETUP_KEY, cleaned)
  }
}

export const writeStoredHostPreferences = (
  preferences: HostPreferences
): void => {
  write(HOST_SETUP_KEY, JSON.stringify(preferences))
}

const parseJson = (raw: string): unknown => {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
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
