import { z } from 'zod'

import { readCachedEntries, writeCachedEntries } from './question-source'
import {
  bindingValue,
  SPARQL_URL,
  sparqlBindingsSchema,
  USER_AGENT,
  withRetries
} from './wikimedia-client'

/**
 * The year a person was born, which is the one thing that tells a decoy the room
 * can eliminate for free from one it has to know something to eliminate.
 *
 * PolyFact draws its wrong answers from entities that answer the same relation
 * somewhere in Wikidata, and that check passes on everybody: *Aristote* really
 * is the author of something, so he was offered as a possible author of a manga
 * published in 2015. Measured over the banked rows, **one decoy slot in six sat
 * more than a hundred and fifty years from its own answer** — *Terry Pratchett*
 * under a fable by La Fontaine, *Randall Munroe* under a novella by Mérimée.
 * A room eliminates those knowing nothing at all, so a question offering three
 * of them is a question with one candidate.
 *
 * It asks for the birth date alone. An occupation was fetched and measured
 * beside it and is not kept: a quarter of the pairs share none, but the
 * vocabulary is what makes that number — *romancier* against *écrivain* is not
 * a defect, and a rule firing on it would move decoys that were already fine.
 */

/**
 * Entities per query. Smaller than the six hundred the title lookup asks for,
 * because a birth date is optional and the endpoint answers a row per binding
 * rather than a row per entity.
 */
const ENTITIES_PER_QUERY = 300

/** How often what has been resolved is written back, in batches. */
const SAVE_EVERY = 10

/** Where a year is remembered, `null` meaning Wikidata holds none. */
const YEARS_CACHE = 'wikidata-years.json'

const yearsBindingsSchema = sparqlBindingsSchema({
  birth: bindingValue.optional(),
  item: bindingValue
})

/**
 * `-0384-01-01T00:00:00Z` as well as `1948-04-28T00:00:00Z`, so the sign is part
 * of the year and a plain `parseInt` on the first four characters would read
 * Aristotle as year 38.
 */
const yearOfStamp = (stamp: string): number | null => {
  const [, year] = /^(-?\d{1,5})-/u.exec(stamp) ?? []

  return year === undefined ? null : Number(year)
}

const birthYearsOfBatch = async (
  entityIds: readonly string[]
): Promise<Map<string, number | null>> => {
  const values = entityIds.map((entityId) => `wd:${entityId}`).join(' ')
  const query = [
    'SELECT ?item ?birth WHERE {',
    `  VALUES ?item { ${values} }`,
    '  OPTIONAL { ?item wdt:P569 ?birth }',
    '}'
  ].join('\n')

  const body = await withRetries(yearsBindingsSchema, async () =>
    fetch(SPARQL_URL, {
      body: new URLSearchParams({ query }),
      headers: {
        accept: 'application/sparql-results+json',
        'user-agent': USER_AGENT
      },
      method: 'POST'
    })
  )

  const years = new Map<string, number | null>(
    entityIds.map((entityId) => [entityId, null])
  )

  for (const { birth, item } of body.results.bindings) {
    const entityId = item.value.split('/').at(-1) ?? item.value

    if (birth !== undefined && years.get(entityId) === null) {
      years.set(entityId, yearOfStamp(birth.value))
    }
  }

  return years
}

/**
 * The birth year of every entity that has one, resumable across runs the way the
 * title and view lookups are — the same entity is asked about by three relations
 * and by every rebuild after a mapping change.
 */
export const birthYearsOf = async ({
  entityIds
}: {
  entityIds: readonly string[]
}): Promise<Map<string, number>> => {
  const cached = await readCachedEntries(YEARS_CACHE, z.number().nullable())
  const missing = [
    ...new Set(entityIds.filter((entityId) => !(entityId in cached)))
  ]

  console.info(
    `  years: ${entityIds.length - missing.length} known, ${missing.length} to resolve`
  )

  let batch = 0

  for (let start = 0; start < missing.length; start += ENTITIES_PER_QUERY) {
    const resolved = await birthYearsOfBatch(
      missing.slice(start, start + ENTITIES_PER_QUERY)
    )

    for (const [entityId, year] of resolved) {
      cached[entityId] = year
    }

    batch++

    if (batch % SAVE_EVERY === 0) {
      await writeCachedEntries({ entries: cached, name: YEARS_CACHE })
    }
  }

  await writeCachedEntries({ entries: cached, name: YEARS_CACHE })

  return new Map(
    Object.entries(cached).flatMap(([entityId, year]) =>
      year === null ? [] : [[entityId, year]]
    )
  )
}
