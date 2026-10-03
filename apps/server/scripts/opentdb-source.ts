import { createHash } from 'node:crypto'

import type { QuestionCategory } from '@taverla/protocol/question'

import { entitiesOfLabels, namedEntitiesOfLabels } from './enwiki-entities'
import {
  type Attribution,
  acceptedOf,
  type BankedQuestion,
  cached,
  decoysOf,
  type IngestedQuestions
} from './question-source'
import { wait } from './wait'
import { aliasesOf } from './wikidata-aliases'

const API_URL = 'https://opentdb.com/api.php'
const CATEGORY_URL = 'https://opentdb.com/api_category.php'
const TOKEN_URL = 'https://opentdb.com/api_token.php'

const ATTRIBUTION: Attribution = {
  author: 'PIXELTAIL GAMES LLC',
  language: 'en',
  licence: 'CC BY-SA 4.0',
  source: 'Open Trivia DB',
  url: 'https://opentdb.com'
}

/**
 * Their twenty-four rubrics folded onto the eight a host picks from, keyed by name
 * rather than by the numeric id the API filters on: a record of bare integers
 * says nothing to a reader, and the names are what upstream actually publishes.
 *
 * Nine of the twenty-four are Entertainment, which is why this half of the bank
 * leans on entertainment whatever the fold — a property of the source. The fold
 * is what decides where that weight lands: four of the nine are `cinema`, one is
 * `videogames` and at 1 006 rows it outnumbers every other rubric of this half
 * on its own, and the four left in `arts` are the music, books, comics and
 * theatre the word was always meant to carry.
 */
const CATEGORY_OF_RUBRIC: Record<string, QuestionCategory> = {
  Animals: 'science',
  Art: 'arts',
  Celebrities: 'arts',
  'Entertainment: Board Games': 'everyday',
  'Entertainment: Books': 'arts',
  'Entertainment: Cartoon & Animations': 'cinema',
  'Entertainment: Comics': 'arts',
  'Entertainment: Film': 'cinema',
  'Entertainment: Japanese Anime & Manga': 'cinema',
  'Entertainment: Music': 'arts',
  'Entertainment: Musicals & Theatres': 'arts',
  'Entertainment: Television': 'cinema',
  'Entertainment: Video Games': 'videogames',
  'General Knowledge': 'everyday',
  Geography: 'geography',
  History: 'history',
  Mythology: 'history',
  Politics: 'history',
  'Science & Nature': 'science',
  'Science: Computers': 'science',
  'Science: Gadgets': 'science',
  'Science: Mathematics': 'science',
  Sports: 'sport',
  Vehicles: 'science'
}

/**
 * Upstream rates every question itself, and the rating is the only thing on
 * either half of the bank that its own author wrote down. `hard` is what a room
 * asking for well-known subjects does not want; the three bands themselves are
 * not banked, because nothing would read them — they stay in `.cache/`, one
 * rebuild away, for the day a hard mode has somewhere to work.
 */
type UpstreamDifficulty = 'easy' | 'hard' | 'medium'

type UpstreamQuestion = {
  correct_answer: string
  difficulty: UpstreamDifficulty
  incorrect_answers: string[]
  question: string
}

type UpstreamPage = {
  response_code: number
  results?: UpstreamQuestion[]
}

const SUCCESS = 0
const NO_RESULTS = 1
const TOKEN_EMPTY = 4
const RATE_LIMITED = 5

/** Their documented ceiling: asking for more returns fifty anyway. */
const LARGEST_PAGE = 50

/**
 * A token guarantees no repeat until the query is exhausted — but a page asking
 * for more rows than remain is refused whole rather than served short, so the
 * tail of a category is only reachable by asking for less. One token per rubric
 * rather than one per run, so a run that dies resumes on the rubrics it never
 * reached instead of starting the whole drain again.
 */
const PAGE_SIZES = [LARGEST_PAGE, 10, 1] as const

/** Their documented rate limit is one request every five seconds per address. */
const REQUEST_INTERVAL_MS = 5_000

const getJson = async <TBody>(url: string): Promise<TBody> => {
  await wait(REQUEST_INTERVAL_MS)

  const response = await fetch(url)

  return (await response.json()) as TBody
}

/**
 * Everything upstream serves is HTML-entity encoded by default — `&amp;`,
 * `&quot;` and `&#039;` reach a third of the prompts — and a raw entity on a
 * screen the whole room is reading looks like a rendering fault. `url3986` is
 * the encoding that round-trips through a decoder every runtime already has.
 */
const decode = (text: string): string => decodeURIComponent(text).trim()

const pageUrl = ({
  amount,
  categoryId,
  token
}: {
  amount: number
  categoryId: number
  token: string
}): string =>
  `${API_URL}?amount=${amount}&category=${categoryId}&type=multiple&encode=url3986&token=${token}`

const requestToken = async (): Promise<string | null> => {
  const body = await getJson<{ response_code: number; token?: string }>(
    `${TOKEN_URL}?command=request`
  )

  return body.response_code === SUCCESS ? (body.token ?? null) : null
}

/**
 * Every question the rubric holds, drained through page sizes that step down as
 * the tail runs short. A rate-limited page is retried rather than dropped: the
 * whole rubric would otherwise go missing because one request arrived early.
 */
const drainRubric = async ({
  categoryId,
  token
}: {
  categoryId: number
  token: string
}): Promise<UpstreamQuestion[]> => {
  const drained: UpstreamQuestion[] = []

  for (const amount of PAGE_SIZES) {
    for (;;) {
      const page = await getJson<UpstreamPage>(
        pageUrl({ amount, categoryId, token })
      )

      if (page.response_code === RATE_LIMITED) {
        continue
      }

      if (
        page.response_code === NO_RESULTS ||
        page.response_code === TOKEN_EMPTY
      ) {
        break
      }

      if (page.response_code !== SUCCESS || page.results === undefined) {
        break
      }

      drained.push(...page.results)
    }
  }

  return drained
}

/**
 * Upstream publishes no identifier of its own, so the prompt is the identity.
 * That is what makes a rebuild stable — a room's `playedIds` survives it — and
 * it collapses the handful of questions that sit in two rubrics.
 */
const idOf = (prompt: string): string =>
  `otdb-${createHash('sha1').update(prompt).digest('hex').slice(0, 12)}`

const toBankedQuestion = ({
  category,
  question,
  theme
}: {
  category: QuestionCategory
  question: UpstreamQuestion
  theme: string
}): BankedQuestion | null => {
  const answer = decode(question.correct_answer)
  const decoys = decoysOf({
    answer,
    candidates: question.incorrect_answers.map(decode)
  })
  const prompt = decode(question.question)

  if (decoys === null || answer.length === 0 || prompt.length === 0) {
    return null
  }

  return {
    accepted: [],
    answer,
    category,
    choiceOnly: false,
    decoys,
    id: idOf(prompt),
    isAdult: false,
    isWellKnown: question.difficulty !== 'hard',
    language: 'en',
    note: null,
    prompt,
    theme
  }
}

/**
 * The other spellings each answer may be typed as, for the rows that can be
 * paid for one at all. Upstream publishes no identifier, so the entity is
 * reached through the English Wikipedia article of the answer's own spelling —
 * and the decoys of a row whose answer never resolved are not looked up, which
 * is three quarters of the spellings on the table.
 */
const withAcceptedSpellings = async (
  questions: readonly BankedQuestion[]
): Promise<BankedQuestion[]> => {
  const answerIds = await namedEntitiesOfLabels({
    label: 'answers',
    labels: questions.map(({ answer }) => answer)
  })
  const payable = questions.filter(({ answer }) => answerIds.has(answer))
  const decoyIds = await entitiesOfLabels({
    label: 'decoys',
    labels: payable.flatMap(({ decoys }) => decoys)
  })

  const aliases = await aliasesOf({
    entityIds: [...answerIds.values(), ...decoyIds.values()],
    language: 'en'
  })

  const banked = questions.map((question) => ({
    ...question,
    accepted: acceptedOf({
      answer: question.answer,
      decoys: question.decoys,
      spellings: aliases.get(answerIds.get(question.answer) ?? '') ?? [],
      wrongSpellings: question.decoys.flatMap(
        (decoy) => aliases.get(decoyIds.get(decoy) ?? '') ?? []
      )
    })
  }))

  const named = banked.filter(({ accepted }) => accepted.length > 0)

  console.info(
    `  ${named.length} of ${banked.length} rows answer to a second spelling, and now take it (${named.reduce((total, { accepted }) => total + accepted.length, 0)} spellings)`
  )

  return banked
}

export const ingestOpenTdb = async (): Promise<IngestedQuestions> => {
  const listing = await cached('opentdb-categories.json', async () => {
    const response = await fetch(CATEGORY_URL)

    return response.text()
  })

  const rubrics = (
    JSON.parse(listing) as { trivia_categories: { id: number; name: string }[] }
  ).trivia_categories

  const questions: BankedQuestion[] = []
  const rejections: string[] = []
  const banked = new Set<string>()

  for (const rubric of rubrics) {
    const category = CATEGORY_OF_RUBRIC[rubric.name]

    if (category === undefined) {
      console.info(`  skip ${rubric.name} — unmapped`)
      continue
    }

    const drained = await cached(`opentdb-${rubric.id}.json`, async () => {
      const token = await requestToken()

      if (token === null) {
        throw new Error(`No session token for ${rubric.name}`)
      }

      return JSON.stringify(await drainRubric({ categoryId: rubric.id, token }))
    })

    let kept = 0

    for (const question of JSON.parse(drained) as UpstreamQuestion[]) {
      const candidate = toBankedQuestion({
        category,
        question,
        theme: rubric.name
      })

      if (candidate === null) {
        rejections.push(`${rubric.name}: ${question.question}`)
        continue
      }

      if (banked.has(candidate.id)) {
        continue
      }

      banked.add(candidate.id)
      questions.push(candidate)
      kept++
    }

    console.info(`  ${rubric.name} → ${category}: ${kept} questions`)
  }

  return {
    attribution: ATTRIBUTION,
    questions: await withAcceptedSpellings(questions),
    rejections
  }
}
