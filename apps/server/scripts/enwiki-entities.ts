import { z } from 'zod'

import {
  chunked,
  readCachedEntries,
  writeCachedEntries
} from './question-source'
import {
  bindingValue,
  SPARQL_URL,
  sparqlBindingsSchema,
  USER_AGENT,
  withRetries
} from './wikimedia-client'

/**
 * The Wikidata entity an English answer names, reached through the English
 * Wikipedia article of that exact spelling — which is the only hop available on
 * a source that publishes no identifier of its own.
 *
 * Two gates rather than one, because the answer and its decoys are read for
 * opposite reasons. `namedEntitiesOfLabels` is the strict one and decides what
 * the bank will **pay** for: a redirect that lands somewhere else is refused,
 * and so is a common noun, whose `skos:altLabel` holds its neighbours rather
 * than its other names — *blue* offers *turquoise*, and banking that pays a
 * room for the answer the question called wrong. `entitiesOfLabels` is loose
 * and only collects the names a **wrong** answer goes by, where a wrong
 * resolution widens what the bank refuses and can never widen what it pays.
 *
 * Measured over Open Trivia DB's 3 844 askable answers: 738 have no article at
 * all, 693 are a redirect onto another concept — *July 4, 1776* onto *United
 * States Declaration of Independence* — and of the 2 413 whose title is the
 * answer itself, 1 338 survive the common-noun gate.
 */
const EN_WIKIPEDIA_API = 'https://en.wikipedia.org/w/api.php'
const WIKIDATA_API = 'https://www.wikidata.org/w/api.php'

/** Titles per action-API request, which is the anonymous limit on both wikis. */
const TITLES_PER_REQUEST = 50
const ENTITIES_PER_QUERY = 300

/** How often what has been resolved is written back, in batches. */
const SAVE_EVERY = 10

const RESOLUTION_CACHE = 'enwiki-entities.json'
const SHAPE_CACHE = 'enwiki-entity-shapes.json'

/** Wikipedia's own ceiling on a title, in bytes; nothing this long is an answer. */
const LONGEST_TITLE = 200

/**
 * A Wikidata item that stands for a *page* rather than for a thing. Their labels
 * are capitalised and they carry no `P279`, so they clear every other gate here:
 * *Lift*, *Libra*, *Turkic* and *Clyde* are all disambiguation pages, and the
 * aliases of one are the several unrelated things it lists.
 */
const WIKIMEDIA_KIND =
  /^Wikimedia (disambiguation page|list article|category|template|set index article|internal item)/

const resolutionSchema = z.object({
  entityId: z.string().nullable(),
  title: z.string().nullable()
})

type Resolution = z.infer<typeof resolutionSchema>

const shapeSchema = z.object({
  kinds: z.array(z.string()),
  label: z.string().nullable(),
  /** How many `P279` statements it holds: one or more and it is a class, not a thing. */
  supers: z.number()
})

const continuationSchema = z.record(z.string(), z.string())

type Continuation = z.infer<typeof continuationSchema>

const renameSchema = z.object({ from: z.string(), to: z.string() })

const titlePageSchema = z.object({
  continue: continuationSchema.optional(),
  query: z
    .object({
      normalized: z.array(renameSchema).optional(),
      pages: z
        .array(
          z.object({
            missing: z.boolean().optional(),
            pageprops: z
              .object({ wikibase_item: z.string().optional() })
              .optional(),
            title: z.string()
          })
        )
        .optional(),
      redirects: z.array(renameSchema).optional()
    })
    .optional()
})

const kindsBindingsSchema = sparqlBindingsSchema({
  item: bindingValue,
  kinds: bindingValue.optional(),
  supers: bindingValue.optional()
})

const labelsSchema = z.object({
  entities: z
    .record(
      z.string(),
      z.object({
        labels: z
          .object({ en: z.object({ value: z.string() }).optional() })
          .optional()
      })
    )
    .optional()
})

/**
 * Whether the action API can be asked about this spelling at all. A pipe would
 * be read as the next title, and the rest are characters a page title cannot
 * hold — so asking is a request that comes back about something else.
 */
const askable = (label: string): boolean =>
  label.length > 0 &&
  label.length <= LONGEST_TITLE &&
  !/[|#<>[\]{}\n\r]/.test(label)

/**
 * The article each spelling reaches and the entity behind it, following
 * normalisation and redirects so the *landing* title is what gets compared.
 * That comparison is the whole gate: a redirect is how *Tardar Sauce* becomes
 * *Grumpy Cat* with nothing warning that the concept moved.
 */
const resolveTitles = async (
  titles: readonly string[]
): Promise<Map<string, Resolution>> => {
  const resolved = new Map<string, Resolution>(
    titles.map((title) => [title, { entityId: null, title: null }])
  )

  const landingOf = new Map<string, string>(
    titles.map((title) => [title, title])
  )
  const pages = new Map<string, { entityId: string | null; missing: boolean }>()

  let continuation: Continuation = {}

  for (;;) {
    const parameters = new URLSearchParams({
      action: 'query',
      format: 'json',
      formatversion: '2',
      ppprop: 'wikibase_item',
      prop: 'pageprops',
      redirects: '1',
      titles: titles.join('|'),
      ...continuation
    })

    const page = await withRetries(titlePageSchema, async () =>
      fetch(`${EN_WIKIPEDIA_API}?${parameters}`, {
        headers: { 'user-agent': USER_AGENT }
      })
    )

    for (const { from, to } of [
      ...(page.query?.normalized ?? []),
      ...(page.query?.redirects ?? [])
    ]) {
      for (const [asked, landing] of landingOf) {
        if (landing === from) {
          landingOf.set(asked, to)
        }
      }
    }

    for (const { missing, pageprops, title } of page.query?.pages ?? []) {
      pages.set(title, {
        entityId: pageprops?.wikibase_item ?? null,
        missing: missing === true
      })
    }

    if (page.continue === undefined) {
      break
    }

    continuation = page.continue
  }

  for (const [asked, landing] of landingOf) {
    const found = pages.get(landing)

    if (found === undefined || found.missing) {
      continue
    }

    resolved.set(asked, { entityId: found.entityId, title: landing })
  }

  return resolved
}

/**
 * The English label of each entity, read from the Wikidata action API rather
 * than from the query service. The two disagree: `rdfs:label` is silent on
 * Q9358 — Friedrich Nietzsche — and `wdt:P31` on Q54173, General Electric, for
 * 66 of 2 407 entities asked. A label missing here would read as a common noun,
 * which is the one thing this must not get wrong, so the gap goes where it
 * costs nothing: a missing `P31` is read as *unknown* rather than as evidence.
 */
const labelsOfBatch = async (
  entityIds: readonly string[]
): Promise<Map<string, string>> => {
  const parameters = new URLSearchParams({
    action: 'wbgetentities',
    format: 'json',
    formatversion: '2',
    ids: entityIds.join('|'),
    languages: 'en',
    props: 'labels'
  })

  const body = await withRetries(labelsSchema, async () =>
    fetch(`${WIKIDATA_API}?${parameters}`, {
      headers: { 'user-agent': USER_AGENT }
    })
  )

  return new Map(
    Object.entries(body.entities ?? {}).flatMap(([entityId, entity]) => {
      const label = entity.labels?.en?.value

      return label === undefined ? [] : [[entityId, label] as const]
    })
  )
}

const kindsOfBatch = async (
  entityIds: readonly string[]
): Promise<Map<string, { kinds: string[]; supers: number }>> => {
  const values = entityIds.map((entityId) => `wd:${entityId}`).join(' ')
  const query = [
    'SELECT ?item',
    '  (GROUP_CONCAT(DISTINCT ?kindLabel; separator="\\n") AS ?kinds)',
    '  (COUNT(DISTINCT ?super) AS ?supers)',
    'WHERE {',
    `  VALUES ?item { ${values} }`,
    '  OPTIONAL {',
    '    ?item wdt:P31 ?kind .',
    '    ?kind rdfs:label ?kindLabel FILTER(lang(?kindLabel) = "en")',
    '  }',
    '  OPTIONAL { ?item wdt:P279 ?super }',
    '}',
    'GROUP BY ?item'
  ].join('\n')

  const body = await withRetries(kindsBindingsSchema, async () =>
    fetch(SPARQL_URL, {
      body: new URLSearchParams({ query }),
      headers: {
        accept: 'application/sparql-results+json',
        'user-agent': USER_AGENT
      },
      method: 'POST'
    })
  )

  return new Map(
    body.results.bindings.map((binding) => [
      binding.item.value.split('/').at(-1) ?? binding.item.value,
      {
        kinds: (binding.kinds?.value ?? '')
          .split('\n')
          .map((kind) => kind.trim())
          .filter((kind) => kind.length > 0)
          .toSorted(),
        supers: Number(binding.supers?.value ?? '0')
      }
    ])
  )
}

const resolutionsOf = async ({
  label,
  labels
}: {
  label: string
  labels: readonly string[]
}): Promise<Record<string, Resolution>> => {
  const resolutions = await readCachedEntries(
    RESOLUTION_CACHE,
    resolutionSchema
  )

  const asked = [...new Set(labels.filter(askable))]
  const wanted = asked.filter((title) => !(title in resolutions))
  const batches = chunked({ items: wanted, size: TITLES_PER_REQUEST })

  console.info(
    `  ${label}: ${asked.length} spellings, ${wanted.length} without a known article`
  )

  for (const [index, batch] of batches.entries()) {
    for (const [title, resolution] of await resolveTitles(batch)) {
      resolutions[title] = resolution
    }

    if (index % SAVE_EVERY === SAVE_EVERY - 1 || index === batches.length - 1) {
      await writeCachedEntries({ entries: resolutions, name: RESOLUTION_CACHE })
      console.info(`    articles ${index + 1}/${batches.length} batches`)
    }
  }

  return resolutions
}

/**
 * Whether the landing title is the spelling that was asked about, which is what
 * says the redirect did not change the subject. Compared without case because
 * the wiki capitalises the first letter of every title it serves.
 */
const isItsOwnArticle = ({
  label,
  resolution
}: {
  label: string
  resolution: Resolution | undefined
}): boolean =>
  resolution !== undefined &&
  resolution.entityId !== null &&
  resolution.title !== null &&
  resolution.title.toLocaleLowerCase('en') === label.toLocaleLowerCase('en')

/**
 * Wikidata's labelling convention is the cheapest thing that tells a name from a
 * word: a proper noun is capitalised, a common noun is not. *Japan*, *Madrid*
 * and *Charlie Chaplin* against *spoon*, *yellow*, *philosophy* and *chocolate*.
 */
const isName = (label: string | null): boolean => {
  const [first] = [...(label ?? '')]

  return (
    first !== undefined &&
    /\p{L}/u.test(first) &&
    first === first.toLocaleUpperCase('en')
  )
}

const entityIdsOf = ({
  labels,
  resolutions
}: {
  labels: readonly string[]
  resolutions: Record<string, Resolution>
}): Map<string, string> =>
  new Map(
    [...new Set(labels)].flatMap((label) => {
      const resolution = resolutions[label]
      const entityId = resolution?.entityId

      return isItsOwnArticle({ label, resolution }) &&
        entityId !== undefined &&
        entityId !== null
        ? [[label, entityId] as const]
        : []
    })
  )

/**
 * The entity each spelling reaches, for a spelling read to collect the names a
 * **wrong** answer goes by. Nothing is asked of the entity beyond the article
 * being the spelling's own, because every name this yields is one the bank
 * refuses to pay for.
 */
export const entitiesOfLabels = async ({
  label,
  labels
}: {
  /** What to call this batch in the rebuild's output. */
  label: string
  labels: readonly string[]
}): Promise<Map<string, string>> =>
  entityIdsOf({
    labels,
    resolutions: await resolutionsOf({ label, labels })
  })

/**
 * The entity each spelling reaches, for a spelling the bank may be **paid**
 * for: its article is its own, it is a name rather than a word, it is a thing
 * rather than a class, and it is not one of Wikipedia's own pages about
 * spellings.
 */
export const namedEntitiesOfLabels = async ({
  label,
  labels
}: {
  label: string
  labels: readonly string[]
}): Promise<Map<string, string>> => {
  const resolutions = await resolutionsOf({ label, labels })
  const candidates = entityIdsOf({ labels, resolutions })

  const shapes = await readCachedEntries(SHAPE_CACHE, shapeSchema)
  const wanted = [...new Set(candidates.values())].filter(
    (entityId) => !(entityId in shapes)
  )
  const batches = chunked({ items: wanted, size: ENTITIES_PER_QUERY })

  console.info(`    ${wanted.length} entities of unknown shape`)

  for (const [index, batch] of batches.entries()) {
    const names = new Map<string, string>()

    for (const ids of chunked({ items: batch, size: TITLES_PER_REQUEST })) {
      for (const [entityId, name] of await labelsOfBatch(ids)) {
        names.set(entityId, name)
      }
    }

    const kinds = await kindsOfBatch(batch)

    for (const entityId of batch) {
      shapes[entityId] = {
        kinds: kinds.get(entityId)?.kinds ?? [],
        label: names.get(entityId) ?? null,
        supers: kinds.get(entityId)?.supers ?? 0
      }
    }

    if (index % SAVE_EVERY === SAVE_EVERY - 1 || index === batches.length - 1) {
      await writeCachedEntries({ entries: shapes, name: SHAPE_CACHE })
      console.info(`    shapes ${index + 1}/${batches.length} batches`)
    }
  }

  const named = new Map<string, string>()

  for (const [spelling, entityId] of candidates) {
    const shape = shapes[entityId]

    if (
      shape !== undefined &&
      isName(shape.label) &&
      shape.supers === 0 &&
      !shape.kinds.some((kind) => WIKIMEDIA_KIND.test(kind))
    ) {
      named.set(spelling, entityId)
    }
  }

  console.info(
    `    ${named.size} of ${candidates.size} name something rather than describe it`
  )

  return named
}
