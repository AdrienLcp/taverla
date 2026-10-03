import { readCachedEntries, writeCachedEntries } from './question-source'
import { SPARQL_URL, USER_AGENT, withRetries } from './wikimedia-client'

/**
 * What kind of thing an entity is, which is the only thing that makes a decoy
 * plausible when the source ships none at all.
 *
 * PolyFact hands over four candidates and this repository only has to spread
 * them out. Mintaka hands over an answer and nothing else, so the three wrong
 * ones have to be found — and `questionSchema` already says where they may not
 * come from: *"1789" is not a plausible wrong answer to which river runs
 * through Paris*. Drawing from the bank at large is exactly that. Drawing from
 * the entities Wikidata files under the same kind is the opposite: three other
 * rivers stand under a river, three other swimmers under a swimmer.
 *
 * An entity is handed back under **every** kind it holds, over three properties
 * rather than one, because neither end of that range works alone. Every athlete
 * on Earth is an `instance of` **human**, so a bucket keyed on that would put
 * Napoleon under Michael Jordan — and a bucket keyed on `sport` alone leaves
 * the corpus's one pole vaulter with nobody to stand beside. The buckets
 * overlap, and they come back in the order a reader should prefer them:
 * discipline, then trade, then what the thing is.
 *
 * **`sport` is asked of a person and nobody else**, though Wikidata puts it on
 * plenty more. The Lakers play basketball and so does Magic Johnson, and so —
 * because that is where the game was invented — does *Massachusetts*, which is
 * how a US state came to be offered as a wrong answer to which team plays at
 * the Staples Center. What a team is, is a team; the discipline it plays is not
 * its kind.
 */

/** Entities per query, the same figure the birth-date lookup settled on. */
const ENTITIES_PER_QUERY = 300

/** How often what has been resolved is written back, in batches. */
const SAVE_EVERY = 10

/** Where the kinds are remembered, an empty list meaning Wikidata files the entity under nothing. */
const KINDS_CACHE = 'wikidata-kinds.json'

/**
 * **Human** is not a kind, and it is the one that has to be said out loud
 * because Wikidata puts it on everybody. It is what a person falls back on when
 * nothing finer describes them, and a bucket holding every person in the corpus
 * is where *Joe Biden* was offered beside a pope and an astronaut, and *LeBron
 * James* beside Ronald Reagan. A person with no occupation and no sport has
 * nobody to stand beside here, and is refused rather than dressed from all
 * humanity.
 */
const NOT_A_KIND = new Set(['class:Q5'])

/** Wikidata's *human*, which is read here for what an entity is and never as a kind of its own. */
const HUMAN = 'class:Q5'

type SparqlBindings = {
  results: {
    bindings: {
      classes?: { value: string }
      item: { value: string }
      occupations?: { value: string }
      sports?: { value: string }
    }[]
  }
}

/**
 * Every value of each property rather than one, and sorted rather than taken in
 * the order the endpoint feels like. Both halves are load-bearing.
 *
 * **Every value**, because one is not enough to find anybody to stand beside.
 * Wikidata files Toronto under *big city*, *city* and *metropolis*, and another
 * city may share only the second — picking one of the three at random left four
 * hundred and fifty answers alone in a bucket of one. An entity belongs in all
 * of its kinds, and the pools overlap.
 *
 * **Sorted**, because a rebuild has to reproduce the bank rather than re-roll
 * it. The endpoint is free to concatenate in any order it likes, and a decoy
 * chosen off the head of that list would differ between two cold runs.
 */
const prefixed = ({
  concatenated,
  prefix
}: {
  concatenated: string | undefined
  prefix: string
}): string[] =>
  (concatenated ?? '')
    .split(' ')
    .flatMap((url) => {
      const entityId = url.split('/').at(-1)

      return entityId === undefined || entityId === '' ? [] : [entityId]
    })
    .toSorted()
    .map((entityId) => `${prefix}:${entityId}`)

const kindsOfBatch = async (
  entityIds: readonly string[]
): Promise<Map<string, string[]>> => {
  const values = entityIds.map((entityId) => `wd:${entityId}`).join(' ')
  const query = [
    'SELECT ?item',
    '  (GROUP_CONCAT(DISTINCT ?sport; separator=" ") AS ?sports)',
    '  (GROUP_CONCAT(DISTINCT ?occupation; separator=" ") AS ?occupations)',
    '  (GROUP_CONCAT(DISTINCT ?class; separator=" ") AS ?classes)',
    'WHERE {',
    `  VALUES ?item { ${values} }`,
    '  OPTIONAL { ?item wdt:P641 ?sport }',
    '  OPTIONAL { ?item wdt:P106 ?occupation }',
    '  OPTIONAL { ?item wdt:P31 ?class }',
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

  const kinds = new Map<string, string[]>(
    entityIds.map((entityId) => [entityId, []])
  )

  for (const binding of body.results.bindings) {
    const entityId = binding.item.value.split('/').at(-1) ?? binding.item.value

    const classes = prefixed({
      concatenated: binding.classes?.value,
      prefix: 'class'
    })
    const isPerson = classes.includes(HUMAN)

    kinds.set(
      entityId,
      [
        ...(isPerson
          ? prefixed({ concatenated: binding.sports?.value, prefix: 'sport' })
          : []),
        ...prefixed({
          concatenated: binding.occupations?.value,
          prefix: 'occupation'
        }),
        ...classes
      ].filter((kind) => !NOT_A_KIND.has(kind))
    )
  }

  return kinds
}

/**
 * Every kind each entity belongs to, resumable across runs the way the title,
 * view and birth-date lookups are.
 */
export const kindsOf = async ({
  entityIds
}: {
  entityIds: readonly string[]
}): Promise<Map<string, string[]>> => {
  const cached = await readCachedEntries<string[]>(KINDS_CACHE)
  const missing = [
    ...new Set(entityIds.filter((entityId) => !(entityId in cached)))
  ]

  console.info(
    `  kinds: ${entityIds.length - missing.length} known, ${missing.length} to resolve`
  )

  let batch = 0

  for (let start = 0; start < missing.length; start += ENTITIES_PER_QUERY) {
    const resolved = await kindsOfBatch(
      missing.slice(start, start + ENTITIES_PER_QUERY)
    )

    for (const [entityId, kind] of resolved) {
      cached[entityId] = kind
    }

    batch++

    if (batch % SAVE_EVERY === 0) {
      await writeCachedEntries({ entries: cached, name: KINDS_CACHE })
      console.info(
        `    kinds ${Math.min(start + ENTITIES_PER_QUERY, missing.length)}/${missing.length}`
      )
    }
  }

  await writeCachedEntries({ entries: cached, name: KINDS_CACHE })

  return new Map(Object.entries(cached))
}
