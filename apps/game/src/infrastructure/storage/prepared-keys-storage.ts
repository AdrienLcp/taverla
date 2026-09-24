import { z } from 'zod'

import { MAX_SLATE_ITEMS, slateKeySchema } from '@taverla/protocol/slate'

const PREPARED_KEYS_KEY = 'taverla:slate-keys'

const preparedKeysSchema = z
  .array(slateKeySchema.nullable())
  .max(MAX_SLATE_ITEMS)

/**
 * The slate's answer key as the host typed it before the evening. In
 * `sessionStorage` rather than beside the host's setup, because answers are not
 * a preference: they survive a reload and a new room opened in the same tab —
 * a free instance that restarts takes the room with it — and go when the tab
 * closes.
 *
 * Every access is guarded: storage throws outright in a Safari private window,
 * and the degradation is a key typed again, which beats a blank page.
 */
export const readPreparedSlateKeys = (): (string | null)[] => {
  const parsed = preparedKeysSchema.safeParse(
    parseJson(read(PREPARED_KEYS_KEY) ?? '')
  )

  return parsed.success ? parsed.data : []
}

export const writePreparedSlateKeys = (
  keys: readonly (string | null)[]
): void => {
  write(PREPARED_KEYS_KEY, JSON.stringify(keys))
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
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}

const write = (key: string, value: string): void => {
  try {
    sessionStorage.setItem(key, value)
  } catch {
    return
  }
}
