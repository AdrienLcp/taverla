import { readFileSync } from 'node:fs'

import { type FailureResult, Result } from '@adrienlcp/result'
import { z } from 'zod'

const jsonText = z.string().transform((text, context): unknown => {
  try {
    return JSON.parse(text)
  } catch {
    context.addIssue({ code: 'custom', message: 'not JSON' })

    return z.NEVER
  }
})

/**
 * JSON text of that shape, as one schema: `.parse` where a failure must stop the
 * run — a helper generic over the shape — and `parseJson` everywhere else.
 */
export const jsonOf = <TSchema extends z.ZodType>(schema: TSchema) =>
  jsonText.pipe(schema)

/** Whatever a library handed back, checked against the shape the script reads. */
export const checkShape = <TSchema extends z.ZodType>(
  value: unknown,
  schema: TSchema
): Result<z.infer<TSchema>, string> => {
  const parsed = schema.safeParse(value)

  return parsed.success
    ? Result.success(parsed.data)
    : Result.failure(z.prettifyError(parsed.error))
}

/** Text from a download, a cache or a file, read as JSON of that shape. */
export const parseJson = <TSchema extends z.ZodType>(
  text: string,
  schema: TSchema
): Result<z.infer<TSchema>, string> => checkShape(text, jsonOf(schema))

export const readJsonFile = <TSchema extends z.ZodType>(
  path: string,
  schema: TSchema
): Result<z.infer<TSchema>, string> =>
  parseJson(readFileSync(path, 'utf8'), schema)

/**
 * A script has nobody to fall back for: input that no longer matches what it
 * reads stops the run, named, rather than banking a half-read source.
 */
export const orStop = <TData>(
  result: FailureResult<string> | { data: TData; status: 'success' },
  source: string
): TData => {
  if (result.status === 'failure') {
    throw new Error(`${source}: ${result.error}`)
  }

  return result.data
}
