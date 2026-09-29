import { Result } from '@adrienlcp/result'
import {
  readRecognizedText,
  readStoredText,
  type StorageReadError,
  type StorageWriteError,
  writeStoredJson,
  writeStoredText
} from '@adrienlcp/safe-storage'
import { z } from 'zod'

import { gameKindSchema, gameSettingsSchema } from '@taverla/protocol/game'
import { type Nickname, nicknameSchema } from '@taverla/protocol/identifiers'
import { isLocale, type Locale } from '@taverla/protocol/locale'
import { modeSettingsSchema, roomSettingsSchema } from '@taverla/protocol/room'

import type { HostPreferences } from '@taverla/core/room/host-preferences'

import { readStoredWithSchema } from './read-stored-with-schema'

const HOST_SETUP_KEY = 'taverla:host-setup'
const LOCALE_KEY = 'taverla:locale'
const NICKNAME_KEY = 'taverla:nickname'
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

/**
 * Succeeds with `null` when no locale was ever chosen, which is not the same as
 * choosing the default: the caller falls back to what the browser and the
 * operating system are already saying rather than overriding them.
 *
 * Every failure — `localStorage` throws outright in a Safari private window —
 * degrades to a preference that does not survive a reload, which beats a blank
 * page.
 */
export const readStoredLocale = (): Result<Locale | null, StorageReadError> =>
  readRecognizedText({ isRecognized: isLocale, key: LOCALE_KEY })

export const writeStoredLocale = (
  locale: Locale
): Result<void, StorageWriteError> =>
  writeStoredText({ key: LOCALE_KEY, text: locale })

/**
 * Not the seat — that is `session-storage.ts`, keyed per room, and it is what
 * brings a player who reloaded back to their score. This is only what the
 * player likes being called, so the join form on the *next* room arrives
 * filled in.
 */
export const readStoredNickname = (): Result<
  Nickname | null,
  StorageReadError
> => {
  const stored = readStoredText(NICKNAME_KEY)

  if (stored.status === 'failure') {
    return stored
  }

  if (stored.data === null) {
    return Result.success(null)
  }

  const parsed = nicknameSchema.safeParse(stored.data)

  return parsed.success
    ? Result.success(parsed.data)
    : Result.failure('unrecognized')
}

export const writeStoredNickname = (
  nickname: Nickname
): Result<void, StorageWriteError> =>
  writeStoredText({ key: NICKNAME_KEY, text: nickname })

const isVolume = (volume: number): boolean =>
  Number.isFinite(volume) && volume >= 0 && volume <= 1

/**
 * The host machine's own loudness, not the room's — it belongs to whichever
 * laptop is plugged into the speakers, so it never travels over the socket.
 * Succeeds with `null` when none was ever chosen.
 */
export const readStoredVolume = (): Result<number | null, StorageReadError> => {
  const stored = readStoredText(VOLUME_KEY)

  if (stored.status === 'failure') {
    return stored
  }

  if (stored.data === null) {
    return Result.success(null)
  }

  const volume = Number.parseFloat(stored.data)

  return isVolume(volume)
    ? Result.success(volume)
    : Result.failure('unrecognized')
}

export const writeStoredVolume = (
  volume: number
): Result<void, StorageWriteError> =>
  writeStoredText({ key: VOLUME_KEY, text: String(volume) })

/**
 * How this host left the last room they ran, so the next one opens on it rather
 * than on the shell's defaults.
 *
 * `null` is a host who has never changed a setting, and it is deliberately not
 * "the defaults": the caller skips the restore entirely instead of opening every
 * room ever with a frame that says nothing. A blob that no longer parses fails
 * as `'unrecognized'`, and the caller treats it the same way — a shape this
 * build cannot read is worth less than the defaults it would replace.
 */
export const readStoredHostPreferences = (): Result<
  HostPreferences | null,
  StorageReadError
> => {
  const stored = readStoredWithSchema({
    key: HOST_SETUP_KEY,
    schema: hostPreferencesSchema
  })

  if (stored.status === 'success' && stored.data !== null) {
    dropUnknownFields(stored.data)
  }

  return stored
}

/**
 * The schema strips a field it no longer knows, and the blob is written back
 * without it so the field does not sit on the machine until the next setting
 * changes. The slate's answer key once lived here, and answers are not
 * something this store may keep past the tab.
 */
const dropUnknownFields = (preferences: HostPreferences): void => {
  const cleaned = JSON.stringify(preferences)
  const stored = readStoredText(HOST_SETUP_KEY)

  if (stored.status === 'success' && stored.data !== cleaned) {
    writeStoredText({ key: HOST_SETUP_KEY, text: cleaned })
  }
}

export const writeStoredHostPreferences = (
  preferences: HostPreferences
): Result<void, StorageWriteError> =>
  writeStoredJson({ key: HOST_SETUP_KEY, value: preferences })
