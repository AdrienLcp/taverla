import { readCachedEntries, writeCachedEntries } from './question-source'

/**
 * The other names French Wikidata holds for an entity, which is what stands
 * between a room that knows the answer and a room that is told it was wrong.
 *
 * An answer here is **typed**, and the label a corpus files an entity under is
 * the full one: *Lakers de Los Angeles*, *Fédération de Russie*, *Guillaume le
 * Conquérant*. A table shouts *Lakers*, types it, and the grader compares it
 * against the whole of the label and refuses it — the forgiveness in
 * `matchesAnswer` is a slipped finger's worth and a dropped surname is not a
 * typo. **170 of the 1 194 banked Mintaka rows answer with a name of that
 * shape.**
 *
 * `skos:altLabel` is the honest source for it: the other names are curated by
 * the people who curate the label, in the same language, and a rebuild
 * reproduces them rather than re-inventing them. What the bank does with them
 * is `acceptedOf`'s business — this module only says what Wikidata knows.
 */
const SPARQL_URL = 'https://query.wikidata.org/sparql'

/** Wikimedia asks that an automated client say who it is and where to complain. */
const USER_AGENT =
  'TaverlaQuestionBank/1.0 (https://github.com/AdrienLcp/taverla)'

/** Entities per query, the same figure the kind and birth-date lookups settled on. */
const ENTITIES_PER_QUERY = 300

const REQUEST_INTERVAL_MS = 120
const RETRY_BACKOFF_MS = 5_000
const RETRIES = 4

/** How often what has been resolved is written back, in batches. */
const SAVE_EVERY = 10

/** Where the other names are remembered, an empty list meaning Wikidata holds none. */
const ALIASES_CACHE = 'wikidata-aliases.json'

type SparqlBindings = {
  results: {
    bindings: {
      aliases?: { value: string }
      item: { value: string }
    }[]
  }
}

const wait = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds))

const withRetries = async <TBody>(
  request: () => Promise<Response>
): Promise<TBody> => {
  for (let attempt = 1; ; attempt++) {
    await wait(REQUEST_INTERVAL_MS)

    try {
      const response = await request()

      if (response.ok) {
        return (await response.json()) as TBody
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

/**
 * A newline separates the names, because every other candidate appears inside
 * one: *Detroit Gems* holds a space, *É.-U. A.* holds dots and dashes, and a
 * pipe would be a bet rather than a guarantee. A label cannot hold a newline.
 *
 * Sorted for the same reason the kinds are: the endpoint concatenates in
 * whatever order it likes, and a bank that comes back different from a cold
 * rebuild is a bank nobody can check.
 */
const aliasesOfBatch = async (
  entityIds: readonly string[]
): Promise<Map<string, string[]>> => {
  const values = entityIds.map((entityId) => `wd:${entityId}`).join(' ')
  const query = [
    'SELECT ?item',
    '  (GROUP_CONCAT(DISTINCT ?alias; separator="\\n") AS ?aliases)',
    'WHERE {',
    `  VALUES ?item { ${values} }`,
    '  OPTIONAL { ?item skos:altLabel ?alias FILTER(lang(?alias) = "fr") }',
    '}',
    'GROUP BY ?item'
  ].join('\n')

  const body = await withRetries<SparqlBindings>(async () =>
    fetch(SPARQL_URL, {
      body: new URLSearchParams({ query }),
      headers: {
        accept: 'application/sparql-results+json',
        'user-agent': USER_AGENT
      },
      method: 'POST'
    })
  )

  const aliases = new Map<string, string[]>(
    entityIds.map((entityId) => [entityId, []])
  )

  for (const binding of body.results.bindings) {
    const entityId = binding.item.value.split('/').at(-1) ?? binding.item.value

    aliases.set(
      entityId,
      [
        ...new Set(
          (binding.aliases?.value ?? '')
            .split('\n')
            .map((alias) => alias.trim())
            .filter((alias) => alias.length > 0)
        )
      ].sort()
    )
  }

  return aliases
}

/**
 * Every French name each entity answers to besides its label, resumable across
 * runs the way the title, view, kind and birth-date lookups are.
 */
export const frenchAliasesOf = async ({
  entityIds
}: {
  entityIds: readonly string[]
}): Promise<Map<string, string[]>> => {
  const cached = await readCachedEntries<string[]>(ALIASES_CACHE)
  const missing = [
    ...new Set(entityIds.filter((entityId) => !(entityId in cached)))
  ]

  console.info(
    `  aliases: ${entityIds.length - missing.length} known, ${missing.length} to resolve`
  )

  let batch = 0

  for (let start = 0; start < missing.length; start += ENTITIES_PER_QUERY) {
    const resolved = await aliasesOfBatch(
      missing.slice(start, start + ENTITIES_PER_QUERY)
    )

    for (const [entityId, alias] of resolved) {
      cached[entityId] = alias
    }

    batch++

    if (batch % SAVE_EVERY === 0) {
      await writeCachedEntries({ entries: cached, name: ALIASES_CACHE })
      console.info(
        `    aliases ${Math.min(start + ENTITIES_PER_QUERY, missing.length)}/${missing.length}`
      )
    }
  }

  await writeCachedEntries({ entries: cached, name: ALIASES_CACHE })

  return new Map(Object.entries(cached))
}
