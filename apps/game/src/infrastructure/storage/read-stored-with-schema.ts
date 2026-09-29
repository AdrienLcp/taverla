import { Result } from '@adrienlcp/result'
import { readStoredText, type StorageReadError } from '@adrienlcp/safe-storage'
import type { z } from 'zod'

const parsedJson = (text: string): Result<unknown, 'unrecognized'> => {
  try {
    const parsed: unknown = JSON.parse(text)

    return Result.success(parsed)
  } catch {
    return Result.failure('unrecognized')
  }
}

/**
 * The JSON stored under `key`, run through `schema` rather than only checked
 * against it: the stores here lean on what a schema does to a value — a field
 * defaulted for a blob an older build wrote, a record filtered entry by entry —
 * which a type guard, and so `readStoredJson`, would throw away.
 */
export const readStoredWithSchema = <Value>({
  key,
  schema
}: {
  key: string
  schema: z.ZodType<Value>
}): Result<Value | null, StorageReadError> => {
  const stored = readStoredText(key)

  if (stored.status === 'failure') {
    return stored
  }

  if (stored.data === null) {
    return Result.success(null)
  }

  const json = parsedJson(stored.data)

  if (json.status === 'failure') {
    return json
  }

  const parsed = schema.safeParse(json.data)

  return parsed.success
    ? Result.success(parsed.data)
    : Result.failure('unrecognized')
}
