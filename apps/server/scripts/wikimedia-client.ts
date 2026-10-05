import { z } from 'zod'

import { jsonOf } from './json-file'
import { wait } from './wait'

export const SPARQL_URL = 'https://query.wikidata.org/sparql'

/** Wikimedia asks that an automated client say who it is and where to complain. */
export const USER_AGENT =
  'TaverlaQuestionBank/1.0 (https://github.com/AdrienLcp/taverla)'

export const bindingValue = z.object({ value: z.string() })

/** A SPARQL answer, one object per row, each variable a `{ value }`. */
export const sparqlBindingsSchema = <TBinding extends z.ZodRawShape>(
  binding: TBinding
) =>
  z.object({
    results: z.object({ bindings: z.array(z.object(binding)) })
  })

const REQUEST_INTERVAL_MS = 120
const RETRY_BACKOFF_MS = 5_000
const RETRIES = 4

/**
 * Wikimedia's endpoints answer a burst with a refusal rather than a queue, and a
 * batch dropped over one is a hole that reads exactly like an entity nobody has
 * heard of. Retried rather than dropped, and thrown from on the last attempt: a
 * run that silently banked half its data would be worse than one that stopped.
 */
export const withRetries = async <TSchema extends z.ZodType>(
  schema: TSchema,
  request: () => Promise<Response>
): Promise<z.infer<TSchema>> => {
  for (let attempt = 1; ; attempt++) {
    await wait(REQUEST_INTERVAL_MS)

    try {
      const response = await request()

      if (response.ok) {
        return jsonOf(schema).parse(await response.text())
      }

      if (attempt > RETRIES) {
        throw new Error(`answered ${response.status}`)
      }
    } catch (failure) {
      if (attempt > RETRIES) {
        throw failure
      }
    }

    await wait(RETRY_BACKOFF_MS * attempt)
  }
}
