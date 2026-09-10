import type { QuestionCategory } from '@taverla/protocol/question'

import { frenchViewsOfTitles, isWellKnownInFrench } from './frwiki-notability'
import {
  type Attribution,
  type BankedQuestion,
  cached,
  decoysOf,
  type IngestedQuestions
} from './question-source'

const LISTING_URL = 'https://www.openquizzdb.org/listing'
const DOWNLOAD_URL = 'https://www.openquizzdb.org/download.php'

/** Everything upstream publishes is written in French rather than translated into it. */
const ATTRIBUTION: Attribution = {
  author: 'Philippe Bresoux',
  language: 'fr',
  licence: 'CC BY-SA 4.0',
  source: 'OpenQuizzDB',
  url: 'https://www.openquizzdb.org'
}

/**
 * Their rubrics folded onto the six a host can actually pick from. The fold is
 * coarse on purpose: six chips fit a phone, and a room choosing between
 * twenty-eight is a room reading a menu instead of playing.
 */
const CATEGORY_OF_RUBRIC: Record<string, QuestionCategory> = {
  ALPHAQUIZZ: 'everyday',
  ANIMAUX: 'science',
  ARCHEOLOGIE: 'history',
  ARTS: 'arts',
  BD: 'arts',
  CELEBRITES: 'arts',
  CINEMA: 'arts',
  CULTURE: 'everyday',
  DEFI: 'everyday',
  GASTRONOMIE: 'everyday',
  GEOGRAPHIE: 'geography',
  HISTOIRE: 'history',
  INFORMATIQUE: 'science',
  LITTERATURE: 'arts',
  LOISIRS: 'everyday',
  MONDE: 'geography',
  MOTSCROISES: 'everyday',
  MUSIQUE: 'arts',
  NATURE: 'science',
  ORTHOQUIZZ: 'everyday',
  QUADRIQUIZZ: 'everyday',
  QUOTIDIEN: 'everyday',
  SCIENCES: 'science',
  SPORTS: 'sport',
  TELEVISION: 'arts',
  TOURISME: 'geography',
  WEB: 'science'
}

/**
 * Banked, but drawn only for a room whose host asked for it. Nothing here is
 * explicit — it is biography and innuendo, and what makes it adult is the
 * themes, which the reveal shows. `celebrities` is where those questions
 * actually belong as *subjects*, which is the whole reason the rating is a
 * field of its own rather than a seventh category.
 */
const ADULT_RUBRIC = 'ADULTES'

/**
 * The rubric that is one riddle rather than a set of questions. A row chains
 * four clues under a letter — *Avec un G, il faut un alcool, un lieu de départ,
 * un engin et une couleur* — and carries a single answer for the four, which is
 * the first clue's on all 120 of them. The other three clues are answered by
 * the propositions standing beside it, so cutting the enumeration after the
 * first clue leaves a whole question with its three decoys already written.
 *
 * It is also the one place a *rule* finds `choiceOnly`, where the rest of the
 * bank needed a row-by-row reading: *Avec un S, il faut un pays* is Suisse, and
 * it is Sénégal, Suède and Slovaquie too. Only the four candidates make it one
 * answer, and a room typing into a field cannot win it.
 */
const RIDDLE_RUBRIC = 'QUADRIQUIZZ'

/**
 * The prompt a chained riddle becomes, or `null` where it does not enumerate —
 * which is a row this rewrite cannot cut and would otherwise bank as four
 * questions over one answer.
 */
const firstRiddleIn = (prompt: string): string | null => {
  const [, firstRiddle] = /^(.*?\bil faut\b[^,]+),/u.exec(prompt) ?? []

  return firstRiddle === undefined ? null : `${firstRiddle}.`
}

type UpstreamQuestion = {
  anecdote?: string
  id: number
  propositions: string[]
  question: string
  réponse: string
  wikipédia?: string
}

type UpstreamPack = {
  licence?: string
  quizz: UpstreamQuestion[]
  rédacteur?: string
  thème?: string
}

const packIdsByRubric = (listing: string): Map<string, number[]> => {
  const byRubric = new Map<string, number[]>()
  const tokens = listing.matchAll(/id="([A-ZÀ-Ý]+)"|goq\((\d+)\)/gu)

  let rubric: string | null = null

  for (const [, named, id] of tokens) {
    if (named !== undefined) {
      rubric = named
      continue
    }

    if (rubric === null || id === undefined) {
      continue
    }

    byRubric.set(rubric, [...(byRubric.get(rubric) ?? []), Number(id)])
  }

  return byRubric
}

const packUrl = async (packId: number): Promise<string | null> => {
  const page = await cached(`page-${packId}.html`, async () => {
    const response = await fetch(DOWNLOAD_URL, {
      body: new URLSearchParams({ id: String(packId) }),
      method: 'POST'
    })

    return response.text()
  })

  return (
    page.match(/https:\/\/download\.openquizzdb\.org\/[^"]+\.json/u)?.[0] ??
    null
  )
}

/** The lowest printable code point: everything under it is a control character. */
const SPACE = 0x20

const isControl = (character: string): boolean =>
  (character.codePointAt(0) ?? SPACE) < SPACE

/**
 * Upstream lets a raw newline through into a string it is writing — one
 * anecdote in pack 20 ends on one — and the whole pack is refused over a
 * character nobody can see, costing every question in it. Folding the control
 * characters a JSON string may not hold into spaces is a repair the next such
 * pack gets for free, where mending the cached file would last until the cache
 * is cleared.
 */
const withoutRawControls = (body: string): string => {
  let isEscaped = false
  let isInString = false
  let repaired = ''

  for (const character of body) {
    repaired += isInString && isControl(character) ? ' ' : character

    if (isEscaped) {
      isEscaped = false
    } else if (character === '\\') {
      isEscaped = true
    } else if (character === '"') {
      isInString = !isInString
    }
  }

  return repaired
}

const fetchPack = async (packId: number): Promise<UpstreamPack | null> => {
  const url = await packUrl(packId)

  if (url === null) {
    return null
  }

  const body = await cached(`pack-${packId}.json`, async () => {
    const response = await fetch(url)

    return response.text()
  })

  try {
    return JSON.parse(withoutRawControls(body)) as UpstreamPack
  } catch {
    return null
  }
}

/**
 * Upstream keeps the `anecdote` field even when it has nothing to say, and what
 * it leaves behind is `-`, `P` or the empty string — a fifth of the bank. A
 * stray dash under the answer on a screen the whole room is reading looks like
 * a rendering fault, so an anecdote with no sentence in it is no anecdote.
 *
 * Four characters is a wide margin rather than a guess: every placeholder is one
 * character or none, and the shortest real note runs to twenty.
 */
const SHORTEST_NOTE = 4

/**
 * Upstream stores the anecdote in a 255-character column and lets it run into
 * the wall, so ten of them end mid-word — *une protection robuste fixée à la
 * cein*. The note is read out to the whole room once the answer is public, and a
 * sentence that stops in the middle of a word reads as a bug in the screen
 * rather than a truncated database field.
 *
 * Cutting back to the last full stop is the repair, and it is a rule rather than
 * ten rows in `question-repairs.json` because the cap is upstream's and will
 * take the next long anecdote too. A fragment with no sentence in it at all is
 * no anecdote, the same way a lone dash is not one.
 */
const wholeSentencesOf = (anecdote: string): string => {
  if (/[.!?»]$/u.test(anecdote)) {
    return anecdote
  }

  return anecdote.slice(0, anecdote.lastIndexOf('.') + 1)
}

const noteIn = (question: UpstreamQuestion): string | null => {
  const anecdote = wholeSentencesOf(question.anecdote?.trim() ?? '')

  return anecdote.length < SHORTEST_NOTE ? null : anecdote
}

/**
 * A row with everything but the one field that costs a network round trip. The
 * whole listing is walked before a single article is looked up, so the four
 * thousand titles go out in eighty batched requests rather than one per pack.
 */
type Unrated = Omit<BankedQuestion, 'isWellKnown'> & { article: string | null }

const ARTICLE_URL = 'https://fr.wikipedia.org/wiki/'

/**
 * The French Wikipedia article this question is about, which upstream names on
 * every row it has one for and fills with `-` on the rest. It is what stands in
 * for a Wikidata identifier here: the pack knows its subject by title and by
 * nothing else, so the traffic lookup starts a hop further along than PolyFact's.
 *
 * The title is trusted no further than the encyclopedia will honour it — three
 * hundred of them name an article that does not exist, and what comes back for
 * those is a zero that `isWellKnownInFrench` refuses. That is the safe way
 * round: a question whose subject could not be measured is left out of a room
 * asking for well-known ones rather than let into it.
 */
const articleOf = (question: UpstreamQuestion): string | null => {
  const url = question.wikipédia ?? ''

  if (!url.startsWith(ARTICLE_URL)) {
    return null
  }

  const title = decodeURIComponent(url.slice(ARTICLE_URL.length)).replaceAll(
    '_',
    ' '
  )

  return title.length === 0 ? null : title
}

const toBankedQuestion = ({
  category,
  choiceOnly,
  isAdult,
  packId,
  prompt,
  question,
  theme
}: {
  category: QuestionCategory
  choiceOnly: boolean
  isAdult: boolean
  packId: number
  prompt: string
  question: UpstreamQuestion
  theme: string
}): Unrated | null => {
  const decoys = decoysOf({
    answer: question.réponse,
    candidates: question.propositions
  })

  if (decoys === null) {
    return null
  }

  return {
    accepted: [],
    answer: question.réponse,
    article: articleOf(question),
    category,
    choiceOnly,
    decoys,
    id: `oqdb-${packId}-${question.id}`,
    isAdult,
    language: 'fr',
    note: noteIn(question),
    prompt,
    theme
  }
}

export const ingestOpenQuizzDb = async (): Promise<IngestedQuestions> => {
  const listing = await cached('listing.html', async () => {
    const response = await fetch(LISTING_URL)

    return response.text()
  })

  const byRubric = packIdsByRubric(listing)
  const unrated: Unrated[] = []
  const rejections: string[] = []

  for (const [rubric, packIds] of [...byRubric].sort()) {
    const isAdult = rubric === ADULT_RUBRIC
    const isRiddle = rubric === RIDDLE_RUBRIC
    const category = isAdult ? 'arts' : CATEGORY_OF_RUBRIC[rubric]

    if (category === undefined) {
      console.info(`  skip ${rubric} (${packIds.length} packs) — unmapped`)
      continue
    }

    for (const packId of packIds) {
      const pack = await fetchPack(packId)

      if (pack === null) {
        rejections.push(`${packId}: no pack`)
        continue
      }

      for (const question of pack.quizz ?? []) {
        const prompt = isRiddle
          ? firstRiddleIn(question.question)
          : question.question

        if (prompt === null) {
          rejections.push(`${packId}/${question.id}: four clues and no comma`)
          continue
        }

        const banked = toBankedQuestion({
          category,
          choiceOnly: isRiddle,
          isAdult,
          packId,
          prompt,
          question,
          theme: pack.thème ?? rubric
        })

        if (banked === null) {
          rejections.push(
            `${packId}/${question.id}: ${question.propositions.length} propositions`
          )
          continue
        }

        unrated.push(banked)
      }
    }

    console.info(
      `  ${rubric} → ${category}${isAdult ? ' (adult)' : ''}: ${packIds.length} packs`
    )
  }

  const views = await frenchViewsOfTitles({
    label: 'articles',
    titles: unrated.flatMap(({ article }) =>
      article === null ? [] : [article]
    )
  })

  const questions = unrated.map(({ article, ...banked }) => ({
    ...banked,
    isWellKnown:
      article !== null && isWellKnownInFrench(views.get(article) ?? 0)
  }))

  console.info(
    `  ${questions.filter(({ isWellKnown }) => isWellKnown).length} of ${questions.length} are about a subject the room has heard of`
  )

  return { attribution: ATTRIBUTION, questions, rejections }
}
