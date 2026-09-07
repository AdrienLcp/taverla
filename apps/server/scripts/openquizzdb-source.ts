import type { QuestionCategory } from '@taverla/protocol/question'

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
  MUSIQUE: 'arts',
  NATURE: 'science',
  ORTHOQUIZZ: 'everyday',
  QUOTIDIEN: 'everyday',
  SCIENCES: 'science',
  SPORTS: 'sport',
  TELEVISION: 'arts',
  TOURISME: 'geography',
  WEB: 'science'
}

/**
 * Rubrics whose questions cannot be asked the way this game asks them. Absent
 * from the mapping above would have been enough to skip them, but a rubric that
 * simply went missing reads as an oversight — these are refusals, with reasons.
 */
const SKIPPED_RUBRICS: Record<string, string> = {
  MOTSCROISES: 'a crossword clue names the length and the first letter',
  QUADRIQUIZZ: 'asks for four answers and the pack carries one'
}

/**
 * Banked, but drawn only for a room whose host asked for it. Nothing here is
 * explicit — it is biography and innuendo, and what makes it adult is the
 * themes, which the reveal shows. `celebrities` is where those questions
 * actually belong as *subjects*, which is the whole reason the rating is a
 * field of its own rather than a seventh category.
 */
const ADULT_RUBRIC = 'ADULTES'

type UpstreamQuestion = {
  anecdote?: string
  id: number
  propositions: string[]
  question: string
  réponse: string
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
    return JSON.parse(body) as UpstreamPack
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

const toBankedQuestion = ({
  category,
  isAdult,
  packId,
  question,
  theme
}: {
  category: QuestionCategory
  isAdult: boolean
  packId: number
  question: UpstreamQuestion
  theme: string
}): BankedQuestion | null => {
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
    category,
    decoys,
    id: `oqdb-${packId}-${question.id}`,
    isAdult,
    language: 'fr',
    note: noteIn(question),
    prompt: question.question,
    theme
  }
}

export const ingestOpenQuizzDb = async (): Promise<IngestedQuestions> => {
  const listing = await cached('listing.html', async () => {
    const response = await fetch(LISTING_URL)

    return response.text()
  })

  const byRubric = packIdsByRubric(listing)
  const questions: BankedQuestion[] = []
  const rejections: string[] = []

  for (const [rubric, packIds] of [...byRubric].sort()) {
    const skipped = SKIPPED_RUBRICS[rubric]

    if (skipped !== undefined) {
      console.info(`  skip ${rubric} (${packIds.length} packs) — ${skipped}`)
      continue
    }

    const isAdult = rubric === ADULT_RUBRIC
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
        const banked = toBankedQuestion({
          category,
          isAdult,
          packId,
          question,
          theme: pack.thème ?? rubric
        })

        if (banked === null) {
          rejections.push(
            `${packId}/${question.id}: ${question.propositions.length} propositions`
          )
          continue
        }

        questions.push(banked)
      }
    }

    console.info(
      `  ${rubric} → ${category}${isAdult ? ' (adult)' : ''}: ${packIds.length} packs`
    )
  }

  return { attribution: ATTRIBUTION, questions, rejections }
}
