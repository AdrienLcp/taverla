import {
  chunked,
  readCachedEntries,
  writeCachedEntries
} from './question-source'

/**
 * How well known a Wikidata entity is to a French-speaking room, measured as the
 * traffic its French Wikipedia article took over the last sixty days.
 *
 * The obvious measure — how many Wikipedias hold an article about it — was tried
 * and thrown away. Sitelink counts on places are dominated by bot-created stubs:
 * the Cebuano, Waray and Swedish bots wrote an article for every municipality on
 * Earth, so a Spanish village of sixty people clears any bar that *Jumanji*
 * clears. Traffic is not bot-inflated, and it is what "the room has heard of it"
 * actually means.
 */
const SPARQL_URL = 'https://query.wikidata.org/sparql'
const FRENCH_WIKIPEDIA_API = 'https://fr.wikipedia.org/w/api.php'

/** Wikimedia asks that an automated client say who it is and where to complain. */
const USER_AGENT =
  'TaverlaQuestionBank/1.0 (https://github.com/AdrienLcp/taverla)'

/** Their documented ceiling on `prop=pageviews`, and the widest window it serves. */
const PAGEVIEW_DAYS = 60

/**
 * The traffic at which a subject counts as one the room has heard of, picked by
 * measuring what each cut leaves rather than by taste. The draw takes a category
 * first and a question inside it, so a threshold is only as good as the category
 * it thins most: at two thousand views the French bank keeps 1 649 of 3 918 rows
 * and its smallest category still holds 53. Ten thousand would leave history
 * under thirty, which is a category a twenty-round evening exhausts.
 */
const WELL_KNOWN_VIEWS = 2_000

/**
 * Whether a French room can be expected to have heard of a subject that drew
 * this many readers. One threshold shared by both French sources, because a
 * question is no easier for having come from one of them.
 */
export const isWellKnownInFrench = (views: number): boolean =>
  views >= WELL_KNOWN_VIEWS

/** Titles per action-API request, which is the anonymous limit. */
const TITLES_PER_REQUEST = 50

/**
 * Entities per SPARQL query. The endpoint has no rate limit worth the name and
 * answers six hundred `VALUES` in about a second; a much larger query starts
 * meeting their sixty-second timeout instead.
 */
const ENTITIES_PER_QUERY = 600

const REQUEST_INTERVAL_MS = 120
const RETRY_BACKOFF_MS = 5_000
const RETRIES = 4

/** How often what has been resolved is written back, in batches. */
const SAVE_EVERY = 20

/** Where a French article's title is remembered, `null` meaning there is none. */
const TITLES_CACHE = 'frwiki-titles.json'
const VIEWS_CACHE = 'frwiki-views.json'

type SparqlBindings = {
  results: { bindings: { item: { value: string }; title: { value: string } }[] }
}

type Continuation = Record<string, string>

type PageviewsPage = {
  continue?: Continuation
  query?: {
    normalized?: { from: string; to: string }[]
    pages?: { pageviews?: Record<string, number | null>; title: string }[]
  }
}

const wait = async (milliseconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds))

/**
 * Both endpoints answer a burst with a refusal rather than a queue, and a batch
 * dropped over one is a hole that reads exactly like an entity nobody has heard
 * of. Retried rather than dropped, and thrown from on the last attempt: a run
 * that silently banked half its notability would be worse than one that stopped.
 */
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
 * The French article title of every entity that has one. Asked for through
 * `schema:isPartOf` rather than by guessing at the label, because the sitelink is
 * the only thing that knows an entity's French title is not its French name.
 */
const titlesOf = async (
  entityIds: readonly string[]
): Promise<Map<string, string>> => {
  const values = entityIds.map((entityId) => `wd:${entityId}`).join(' ')
  const query = [
    'SELECT ?item ?title WHERE {',
    `  VALUES ?item { ${values} }`,
    '  ?article schema:about ?item ;',
    '    schema:isPartOf <https://fr.wikipedia.org/> ;',
    '    schema:name ?title .',
    '}'
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

  return new Map(
    body.results.bindings.map(({ item, title }) => [
      item.value.split('/').at(-1) ?? item.value,
      title.value
    ])
  )
}

const totalOf = (
  pageviews: Record<string, number | null> | undefined
): number =>
  Object.values(pageviews ?? {}).reduce<number>(
    (total, day) => total + (day ?? 0),
    0
  )

/**
 * `prop=pageviews` paginates, and its first page names every title asked for
 * while paying out for a handful of them. A one-shot request over four thousand
 * titles left three quarters reading zero, which is indistinguishable from an
 * article nobody opens — so the continuation is followed to exhaustion, and only
 * what is still missing after that is a real zero. This cost a full refetch once.
 */
const viewsOf = async (
  titles: readonly string[]
): Promise<Map<string, number>> => {
  const totals = new Map(titles.map((title) => [title, 0]))

  let continuation: Continuation = {}

  for (;;) {
    const parameters = new URLSearchParams({
      action: 'query',
      format: 'json',
      formatversion: '2',
      prop: 'pageviews',
      pvipdays: String(PAGEVIEW_DAYS),
      titles: titles.join('|'),
      ...continuation
    })

    const page = await withRetries<PageviewsPage>(async () =>
      fetch(`${FRENCH_WIKIPEDIA_API}?${parameters}`, {
        headers: { 'user-agent': USER_AGENT }
      })
    )

    const asAsked = new Map(
      (page.query?.normalized ?? []).map(({ from, to }) => [to, from])
    )

    for (const { pageviews, title } of page.query?.pages ?? []) {
      const asked = asAsked.get(title) ?? title

      if (totals.has(asked)) {
        totals.set(asked, (totals.get(asked) ?? 0) + totalOf(pageviews))
      }
    }

    if (page.continue === undefined) {
      return totals
    }

    continuation = page.continue
  }
}

/**
 * How many French readers each of these articles drew over the window, for a
 * source that already knows the title it is asking about. OpenQuizzDB names one
 * per question and has no Wikidata identifier to offer, so the hop this skips is
 * a hop it could not have made.
 *
 * Zero stands for three things — no such article, an article nobody opens, and a
 * title upstream got wrong, *Noeud double* for what is filed under *Nœud*. A
 * rule reading zero as obscurity would call the fourth most-read film director
 * obscure, so what reads it must treat zero as *not measured* rather than as a
 * low score.
 */
export const frenchViewsOfTitles = async ({
  label,
  titles
}: {
  label: string
  titles: readonly string[]
}): Promise<Map<string, number>> => {
  const views = await readCachedEntries<number>(VIEWS_CACHE)

  const asked = [...new Set(titles)]
  const wanted = asked.filter((title) => !(title in views))
  const batches = chunked({ items: wanted, size: TITLES_PER_REQUEST })

  console.info(`  ${label}: ${wanted.length} articles left to measure`)

  for (const [index, batch] of batches.entries()) {
    for (const [title, total] of await viewsOf(batch)) {
      views[title] = total
    }

    if (index % SAVE_EVERY === SAVE_EVERY - 1 || index === batches.length - 1) {
      await writeCachedEntries({ entries: views, name: VIEWS_CACHE })
      console.info(`    views ${index + 1}/${batches.length} batches`)
    }
  }

  return new Map(asked.map((title) => [title, views[title] ?? 0]))
}

/**
 * The same figure for an entity named by its Wikidata identifier, which is what
 * PolyFact rows carry. One hop more than `frenchViewsOfTitles`: the sitelink is
 * the only thing that knows an entity's French title is not its French name.
 *
 * Both hops accumulate, so asking again over a wider set costs only what was not
 * already known, and a run that dies at minute fifty resumes. That is what makes
 * the rule affordable to apply in two passes: the options of a row whose subject
 * nobody has heard of are never looked up at all, and they are six sevenths of
 * the work.
 */
export const frenchViewsOf = async ({
  entityIds,
  label
}: {
  entityIds: readonly string[]
  label: string
}): Promise<Map<string, number>> => {
  const titles = await readCachedEntries<string | null>(TITLES_CACHE)

  const asked = [...new Set(entityIds)]
  const unresolved = asked.filter((entityId) => !(entityId in titles))
  const queries = chunked({ items: unresolved, size: ENTITIES_PER_QUERY })

  console.info(
    `  ${label}: ${asked.length} entities, ${unresolved.length} without a known article`
  )

  for (const [index, query] of queries.entries()) {
    const found = await titlesOf(query)

    for (const entityId of query) {
      titles[entityId] = found.get(entityId) ?? null
    }

    if (index % SAVE_EVERY === SAVE_EVERY - 1 || index === queries.length - 1) {
      await writeCachedEntries({ entries: titles, name: TITLES_CACHE })
      console.info(`    titles ${index + 1}/${queries.length} queries`)
    }
  }

  const titleOf = (entityId: string): string | null => titles[entityId] ?? null

  const views = await frenchViewsOfTitles({
    label,
    titles: asked.flatMap((entityId) => {
      const title = titleOf(entityId)

      return title === null ? [] : [title]
    })
  })

  return new Map(
    asked.map((entityId) => {
      const title = titleOf(entityId)

      return [entityId, title === null ? 0 : (views.get(title) ?? 0)]
    })
  )
}
